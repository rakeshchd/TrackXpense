const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const DB_PATH = process.env.DB_PATH || "./finance.db";

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Database initialization
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database");
    createTables();
  }
});

// Create database tables
function createTables() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    profile_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Transactions table
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Budgets table
  db.run(`CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Loans table
  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    person TEXT NOT NULL,
    amount REAL NOT NULL,
    is_lent BOOLEAN NOT NULL,
    is_settled BOOLEAN DEFAULT 0,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reminder_date DATE,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Subscriptions table
  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    billing_cycle TEXT NOT NULL,
    next_payment DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Notifications table
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER,
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Check if reminder_date column exists in loans table, add it if it doesn't
  db.all("PRAGMA table_info(loans)", (err, rows) => {
    if (err) {
      console.error("Error checking loans table schema:", err);
      return;
    }

    // Check if reminder_date column exists
    let hasReminderDate = false;
    if (Array.isArray(rows)) {
      hasReminderDate = rows.some((row) => row.name === "reminder_date");
    } else {
      console.error("PRAGMA query did not return an array:", rows);
    }

    if (!hasReminderDate) {
      console.log("Adding reminder_date column to loans table...");
      db.run("ALTER TABLE loans ADD COLUMN reminder_date DATE", (err) => {
        if (err) {
          console.error("Error adding reminder_date column:", err);
        } else {
          console.log("reminder_date column added successfully");
        }
      });
    }
  });
}

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Auth Routes
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    db.run(sql, [username, email, hashedPassword], function (err) {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      // Create JWT token
      const token = jwt.sign({ id: this.lastID }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: { id: this.lastID, username, email },
      });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const sql = `SELECT * FROM users WHERE email = ?`;
  db.get(sql, [email], async (err, user) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  });
});

// Transaction Routes
app.post("/api/transactions", authenticateToken, (req, res) => {
  const { amount, type, category, description } = req.body;
  const userId = req.user.id;

  if (!amount || !type || !category) {
    return res
      .status(400)
      .json({ message: "Amount, type, and category are required" });
  }

  const sql = `INSERT INTO transactions (user_id, amount, type, category, description) 
               VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [userId, amount, type, category, description], function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    res.status(201).json({
      message: "Transaction added successfully",
      transaction: {
        id: this.lastID,
        user_id: userId,
        amount,
        type,
        category,
        description,
        date: new Date().toISOString(),
      },
    });
  });
});

app.get("/api/transactions", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  let sql = `SELECT * FROM transactions WHERE user_id = ?`;
  let params = [userId];

  // Add date filtering if provided
  if (startDate && endDate) {
    try {
      // Validate date formats
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          message: "Invalid date format. Please use YYYY-MM-DD format.",
          startDate,
          endDate,
        });
      }

      // Format dates consistently as YYYY-MM-DD
      const formattedStartDate = startDate.split("T")[0];
      const formattedEndDate = endDate.split("T")[0];

      // Log for debugging
      console.log(
        `Filtering transactions between ${formattedStartDate} and ${formattedEndDate}`
      );

      sql += ` AND date >= ? AND date <= ?`;
      params.push(formattedStartDate, formattedEndDate);
    } catch (error) {
      console.error("Error parsing dates:", error);
      return res.status(400).json({
        message: "Error parsing date parameters",
        error: error.message,
      });
    }
  }

  // Add ordering
  sql += ` ORDER BY date DESC`;

  db.all(sql, params, (err, transactions) => {
    if (err) {
      console.error("Database error fetching transactions:", err);
      return res.status(400).json({ message: err.message });
    }

    // Log for debugging
    console.log(`Returning ${transactions.length} transactions`);

    // Ensure all transactions have properly formatted dates
    const processedTransactions = transactions.map((transaction) => {
      // Make sure date is in proper format (YYYY-MM-DD)
      if (transaction.date && typeof transaction.date === "string") {
        // Remove any time component if present
        transaction.date = transaction.date.split("T")[0];
      }
      return transaction;
    });

    res.json({ transactions: processedTransactions });
  });
});

// Budget Routes
app.post("/api/budgets", authenticateToken, (req, res) => {
  const { category, amount, period } = req.body;
  const userId = req.user.id;

  if (!category || !amount || !period) {
    return res
      .status(400)
      .json({ message: "Category, amount, and period are required" });
  }

  const sql = `INSERT INTO budgets (user_id, category, amount, period) VALUES (?, ?, ?, ?)`;

  db.run(sql, [userId, category, amount, period], function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    res.status(201).json({
      message: "Budget added successfully",
      budget: {
        id: this.lastID,
        user_id: userId,
        category,
        amount,
        period,
      },
    });
  });
});

app.get("/api/budgets", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const sql = `SELECT * FROM budgets WHERE user_id = ?`;
  db.all(sql, [userId], (err, budgets) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    res.json({ budgets });
  });
});

// Loan Routes
app.post("/api/loans", authenticateToken, (req, res) => {
  const { person, amount, is_lent, reminder_date } = req.body;
  const userId = req.user.id;

  if (!person || !amount) {
    return res.status(400).json({ message: "Person and amount are required" });
  }

  // Insert the loan with reminder date if provided
  const sql = reminder_date
    ? `INSERT INTO loans (user_id, person, amount, is_lent, reminder_date) VALUES (?, ?, ?, ?, ?)`
    : `INSERT INTO loans (user_id, person, amount, is_lent) VALUES (?, ?, ?, ?)`;

  const params = reminder_date
    ? [userId, person, amount, is_lent ? 1 : 0, reminder_date]
    : [userId, person, amount, is_lent ? 1 : 0];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    // If reminder date is provided, create a notification for that date
    if (reminder_date) {
      const notificationType = is_lent ? "lent_money" : "borrowed_money";
      const title = is_lent ? "Money to Collect" : "Loan Repayment Due";
      const message = is_lent
        ? `Remember to collect ${amount} from ${person} on ${reminder_date}.`
        : `Remember to repay ${amount} to ${person} on ${reminder_date}.`;

      db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, notificationType, title, message, this.lastID]
      );
    }

    res.json({
      id: this.lastID,
      person,
      amount,
      is_lent,
      reminder_date,
      is_settled: 0,
      date: new Date().toISOString(),
    });
  });
});

app.get("/api/loans", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const sql = `SELECT * FROM loans WHERE user_id = ? ORDER BY date DESC`;
  db.all(sql, [userId], (err, loans) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    res.json({ loans });
  });
});

app.put("/api/loans/:id/settle", authenticateToken, (req, res) => {
  const loanId = req.params.id;
  const userId = req.user.id;

  const sql = `UPDATE loans SET is_settled = 1 WHERE id = ? AND user_id = ?`;
  db.run(sql, [loanId, userId], function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Loan not found or not yours" });
    }

    res.json({ message: "Loan marked as settled" });
  });
});

// Subscription Routes
app.post("/api/subscriptions", authenticateToken, (req, res) => {
  const { name, amount, billing_cycle, next_payment } = req.body;
  const userId = req.user.id;

  if (!name || !amount || !billing_cycle || !next_payment) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = `INSERT INTO subscriptions (user_id, name, amount, billing_cycle, next_payment) 
               VALUES (?, ?, ?, ?, ?)`;

  db.run(
    sql,
    [userId, name, amount, billing_cycle, next_payment],
    function (err) {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      res.status(201).json({
        message: "Subscription added successfully",
        subscription: {
          id: this.lastID,
          user_id: userId,
          name,
          amount,
          billing_cycle,
          next_payment,
        },
      });
    }
  );
});

app.get("/api/subscriptions", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const sql = `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY next_payment ASC`;
  db.all(sql, [userId], (err, subscriptions) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    res.json({ subscriptions });
  });
});

// Analytics Routes
app.get("/api/analytics/summary", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  // Build the date filter condition if dates are provided
  let dateFilter = "";
  let dateParams = [];

  if (startDate && endDate) {
    dateFilter = "AND date >= ? AND date <= ?";
    dateParams = [startDate, endDate];
  }

  // Get income and expense totals
  const sqlTotal = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
    FROM transactions 
    WHERE user_id = ? ${dateFilter}
  `;

  // Get category breakdown for expenses
  const sqlCategories = `
    SELECT category, SUM(amount) as total
    FROM transactions
    WHERE user_id = ? AND type = 'expense' ${dateFilter}
    GROUP BY category
    ORDER BY total DESC
  `;

  // Get recent transactions
  const sqlRecent = `
    SELECT * FROM transactions
    WHERE user_id = ? ${dateFilter}
    ORDER BY date DESC
    LIMIT 5
  `;

  db.get(sqlTotal, [userId, ...dateParams], (err, totals) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    db.all(sqlCategories, [userId, ...dateParams], (err, categories) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      db.all(sqlRecent, [userId, ...dateParams], (err, recent) => {
        if (err) {
          return res.status(400).json({ message: err.message });
        }

        res.json({
          totals: {
            income: totals.total_income || 0,
            expenses: totals.total_expenses || 0,
            balance: (totals.total_income || 0) - (totals.total_expenses || 0),
          },
          categories,
          recent,
        });
      });
    });
  });
});

// Profile photo routes
app.get("/api/user/profile", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    "SELECT username, email, profile_photo FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error retrieving user profile" });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json(user);
    }
  );
});

app.put("/api/user/profile-photo", verifyToken, (req, res) => {
  const userId = req.user.id;
  const { photoData } = req.body;

  // Validate photo data
  if (!photoData) {
    return res.status(400).json({ message: "No photo data provided" });
  }

  // Check if the photo data is too large
  // SQLite has limits on the size of data it can store
  if (photoData.length > 2 * 1024 * 1024) {
    // Roughly 2MB limit for base64 data
    return res.status(413).json({
      message:
        "Profile photo is too large. Please use a smaller image or compress the current one.",
    });
  }

  // Validate that it's a proper base64 image
  if (!photoData.startsWith("data:image/")) {
    return res.status(400).json({ message: "Invalid image format" });
  }

  // Log the update attempt
  console.log(`Updating profile photo for user ${userId}`);

  db.run(
    "UPDATE users SET profile_photo = ? WHERE id = ?",
    [photoData, userId],
    function (err) {
      if (err) {
        console.error("Database error updating profile photo:", err);
        return res.status(500).json({
          message: "Error updating profile photo",
          error: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log success
      console.log(`Profile photo updated successfully for user ${userId}`);
      res.status(200).json({
        message: "Profile photo updated successfully",
        success: true,
      });
    }
  );
});

app.delete("/api/user/profile-photo", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.run(
    "UPDATE users SET profile_photo = NULL WHERE id = ?",
    [userId],
    function (err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error removing profile photo" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "Profile photo removed successfully" });
    }
  );
});

// Notifications Routes
app.get("/api/notifications", authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
    (err, notifications) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error fetching notifications" });
      }
      res.json({ notifications });
    }
  );
});

app.put("/api/notifications/:id/read", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  db.run(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [notificationId, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error updating notification" });
      }
      res.json({ success: true });
    }
  );
});

app.put("/api/notifications/read-all", authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
    [userId],
    function (err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error updating notifications" });
      }
      res.json({ success: true });
    }
  );
});

// Function to check for upcoming subscription renewals and create notifications
const checkSubscriptionRenewals = () => {
  const today = new Date();
  const fiveDaysLater = new Date();
  fiveDaysLater.setDate(today.getDate() + 5);

  const todayStr = today.toISOString().split("T")[0];
  const fiveDaysLaterStr = fiveDaysLater.toISOString().split("T")[0];

  // Find subscriptions due in the next 5 days
  db.all(
    `SELECT s.*, u.id as user_id 
     FROM subscriptions s
     JOIN users u ON s.user_id = u.id
     WHERE s.next_payment BETWEEN ? AND ?`,
    [todayStr, fiveDaysLaterStr],
    (err, subscriptions) => {
      if (err) {
        console.error("Error checking subscriptions:", err);
        return;
      }

      // Create notifications for each subscription
      subscriptions.forEach((subscription) => {
        const daysUntilRenewal = Math.ceil(
          (new Date(subscription.next_payment) - today) / (1000 * 60 * 60 * 24)
        );

        // Check if a notification already exists for this subscription today
        db.get(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND related_id = ? AND type = 'subscription' 
           AND DATE(created_at) = DATE('now')`,
          [subscription.user_id, subscription.id],
          (err, existingNotification) => {
            if (err || existingNotification) {
              return; // Skip if error or notification already exists
            }

            // Create a new notification
            const message =
              daysUntilRenewal === 0
                ? `Your subscription to ${subscription.name} renews today for ${subscription.amount}.`
                : `Your subscription to ${
                    subscription.name
                  } will renew in ${daysUntilRenewal} day${
                    daysUntilRenewal > 1 ? "s" : ""
                  } for ${subscription.amount}.`;

            db.run(
              `INSERT INTO notifications (user_id, type, title, message, related_id) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                subscription.user_id,
                "subscription",
                "Upcoming Subscription Renewal",
                message,
                subscription.id,
              ]
            );
          }
        );
      });
    }
  );
};

// Function to check for loan repayment notifications
const checkLoanNotifications = () => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // First check if the reminder_date column exists
  db.get(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='loans'",
    (err, tableInfo) => {
      if (err) {
        console.error("Error checking loans table schema:", err);
        return;
      }

      const hasReminderDate =
        tableInfo && tableInfo.sql && tableInfo.sql.includes("reminder_date");

      if (hasReminderDate) {
        // Get loans with reminder_date set to today
        db.all(
          `SELECT * FROM loans 
         WHERE is_settled = 0 
         AND reminder_date = ?`,
          [todayStr],
          (err, loans) => {
            if (err) {
              console.error("Error checking loans:", err);
              return;
            }

            // Process each loan with today's reminder date
            if (loans && Array.isArray(loans)) {
              loans.forEach((loan) => {
                // Check if a notification already exists for this loan today
                db.get(
                  `SELECT id FROM notifications 
                 WHERE related_id = ? AND type = ? 
                 AND DATE(created_at) = DATE('now')`,
                  [loan.id, loan.is_lent ? "lent_money" : "borrowed_money"],
                  (err, existingNotification) => {
                    if (err || existingNotification) {
                      return; // Skip if error or notification already exists
                    }

                    // Create a new notification
                    const title = loan.is_lent
                      ? "Money to Collect Today"
                      : "Loan Repayment Due Today";

                    const message = loan.is_lent
                      ? `Today is the day to collect ${loan.amount} from ${loan.person}.`
                      : `Today is the day to repay ${loan.amount} to ${loan.person}.`;

                    db.run(
                      `INSERT INTO notifications (user_id, type, title, message, related_id) 
                     VALUES (?, ?, ?, ?, ?)`,
                      [
                        loan.user_id,
                        loan.is_lent ? "lent_money" : "borrowed_money",
                        title,
                        message,
                        loan.id,
                      ]
                    );
                  }
                );
              });
            }
          }
        );
      }

      // Also check for loans older than 30 days without a reminder date
      // This is for backward compatibility with existing loans
      db.all(
        `SELECT * FROM loans 
       WHERE is_settled = 0`,
        [],
        (err, oldLoans) => {
          if (err) {
            console.error("Error checking old loans:", err);
            return;
          }

          if (oldLoans && Array.isArray(oldLoans)) {
            oldLoans.forEach((loan) => {
              // Skip loans with reminder_date if the column exists
              if (hasReminderDate && loan.reminder_date) {
                return;
              }

              const loanDate = new Date(loan.date);
              const daysSinceLoan = Math.floor(
                (today - loanDate) / (1000 * 60 * 60 * 24)
              );

              if (daysSinceLoan >= 30) {
                // Check if a notification already exists for this loan
                db.get(
                  `SELECT id FROM notifications 
                 WHERE related_id = ? AND type = ? AND is_read = 0`,
                  [loan.id, loan.is_lent ? "lent_money" : "borrowed_money"],
                  (err, existingNotification) => {
                    if (err || existingNotification) {
                      return; // Skip if error or notification already exists
                    }

                    // Create a new notification
                    const title = loan.is_lent
                      ? "Money to Collect"
                      : "Loan Repayment Due";

                    const message = loan.is_lent
                      ? `It's been ${daysSinceLoan} days. Remember to collect ${loan.amount} from ${loan.person}.`
                      : `It's been ${daysSinceLoan} days. Remember to repay ${loan.amount} to ${loan.person}.`;

                    db.run(
                      `INSERT INTO notifications (user_id, type, title, message, related_id) 
                     VALUES (?, ?, ?, ?, ?)`,
                      [
                        loan.user_id,
                        loan.is_lent ? "lent_money" : "borrowed_money",
                        title,
                        message,
                        loan.id,
                      ]
                    );
                  }
                );
              }
            });
          }
        }
      );
    }
  );
};

// Run notification checks daily
setInterval(() => {
  checkSubscriptionRenewals();
  checkLoanNotifications();
}, 24 * 60 * 60 * 1000); // 24 hours

// Also run immediately on server start
checkSubscriptionRenewals();
checkLoanNotifications();

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
