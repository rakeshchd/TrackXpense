const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const path = require("path");

// Database connection
const db = new sqlite3.Database("./finance.db", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
    process.exit(1);
  } else {
    console.log("Connected to the SQLite database");
    seedDatabase();
  }
});

// Test user credentials - SAVE THESE!
const TEST_USER = {
  username: "testuser",
  email: "test@example.com",
  password: "Password123!", // Will be hashed before storing
};

// Categories for transactions
const EXPENSE_CATEGORIES = [
  "Food",
  "Rent",
  "Utilities",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "Travel",
  "Groceries",
  "Dining Out",
  "Subscriptions",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Bonus",
  "Gift",
  "Investment",
  "Refund",
  "Other Income",
];

// Generate a random date within the last 6 months
function randomDate() {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  return new Date(
    sixMonthsAgo.getTime() +
      Math.random() * (today.getTime() - sixMonthsAgo.getTime())
  )
    .toISOString()
    .split("T")[0];
}

// Generate a random amount within a range
function randomAmount(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Pick a random item from an array
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate description based on category
function getDescription(category) {
  const descriptions = {
    Food: ["Grocery shopping", "Weekly groceries", "Snacks", "Food delivery"],
    Rent: ["Monthly rent", "Apartment rent", "Housing payment"],
    Utilities: ["Electricity bill", "Water bill", "Internet bill", "Gas bill"],
    Transportation: [
      "Gas",
      "Uber ride",
      "Bus ticket",
      "Train fare",
      "Car maintenance",
    ],
    Entertainment: [
      "Movie tickets",
      "Concert",
      "Video games",
      "Streaming service",
    ],
    Shopping: ["Clothes", "Electronics", "Home decor", "Books"],
    Healthcare: [
      "Doctor visit",
      "Medication",
      "Health insurance",
      "Dental care",
    ],
    Education: ["Tuition", "Books", "Online course", "School supplies"],
    Travel: [
      "Flight tickets",
      "Hotel stay",
      "Vacation expenses",
      "Travel insurance",
    ],
    Groceries: ["Supermarket", "Grocery delivery", "Weekly food shopping"],
    "Dining Out": [
      "Restaurant",
      "Coffee shop",
      "Fast food",
      "Lunch with colleagues",
    ],
    Subscriptions: [
      "Netflix",
      "Spotify",
      "Gym membership",
      "Software subscription",
    ],
    Salary: ["Monthly salary", "Bi-weekly paycheck"],
    Freelance: ["Client payment", "Freelance project", "Contract work"],
    Bonus: ["Performance bonus", "Holiday bonus", "Quarterly bonus"],
    Gift: ["Birthday gift", "Holiday gift", "Cash gift"],
    Investment: ["Stock dividend", "Interest income", "Investment return"],
    Refund: ["Product refund", "Service refund", "Tax refund"],
    "Other Income": [
      "Side hustle",
      "Garage sale",
      "Cash back",
      "Survey reward",
    ],
  };

  if (descriptions[category]) {
    return randomItem(descriptions[category]);
  }
  return `Payment for ${category}`;
}

// Generate dates with better distribution for analytics
function generateStratifiedDates(count) {
  const dates = [];
  const today = new Date();

  // Helper function to format date consistently as YYYY-MM-DD
  function formatDate(date) {
    // Pad with leading zeros if needed
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Helper function to create a date with proper validation
  function createValidDate(daysAgo) {
    const date = new Date();
    date.setDate(today.getDate() - daysAgo);
    // Set hours, minutes, and seconds to 0 for consistent comparison
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // 1. Recent days (last 7 days) - 20% of transactions
  const recentDaysCount = Math.floor(count * 0.2);
  for (let i = 0; i < recentDaysCount; i++) {
    const daysAgo = Math.floor(Math.random() * 7); // 0-6 days ago
    const date = createValidDate(daysAgo);
    dates.push(formatDate(date));
  }

  // 2. Recent weeks (last 4 weeks) - 30% of transactions
  const recentWeeksCount = Math.floor(count * 0.3);
  for (let i = 0; i < recentWeeksCount; i++) {
    const daysAgo = 7 + Math.floor(Math.random() * 21); // 7-28 days ago
    const date = createValidDate(daysAgo);
    dates.push(formatDate(date));
  }

  // 3. Recent months (last 6 months) - 40% of transactions
  const recentMonthsCount = Math.floor(count * 0.4);
  for (let i = 0; i < recentMonthsCount; i++) {
    const daysAgo = 30 + Math.floor(Math.random() * 150); // 1-5 months ago
    const date = createValidDate(daysAgo);
    dates.push(formatDate(date));
  }

  // 4. Past year data - 10% of transactions
  const pastYearCount =
    count - recentDaysCount - recentWeeksCount - recentMonthsCount;
  for (let i = 0; i < pastYearCount; i++) {
    const daysAgo = 180 + Math.floor(Math.random() * 185); // 6-12 months ago
    const date = createValidDate(daysAgo);
    dates.push(formatDate(date));
  }

  // Ensure dates are properly formatted and sorted - useful for analytics
  const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));

  // Add consistent dates for testing comparison analytics
  // Add some transactions on the 1st and 15th of each month for the past 6 months
  const consistentDates = [];
  for (let i = 1; i <= 6; i++) {
    const firstOfMonth = new Date();
    firstOfMonth.setMonth(firstOfMonth.getMonth() - i);
    firstOfMonth.setDate(1);

    const fifteenthOfMonth = new Date();
    fifteenthOfMonth.setMonth(fifteenthOfMonth.getMonth() - i);
    fifteenthOfMonth.setDate(15);

    consistentDates.push(formatDate(firstOfMonth));
    consistentDates.push(formatDate(fifteenthOfMonth));
  }

  // Replace some random dates with consistent ones for better analytics patterns
  const dateCount = sortedDates.length;
  for (
    let i = 0;
    i < Math.min(consistentDates.length, Math.floor(dateCount * 0.1));
    i++
  ) {
    const randomIndex = Math.floor(Math.random() * dateCount);
    sortedDates[randomIndex] = consistentDates[i];
  }

  return sortedDates;
}

// Generate random transactions
function generateTransactions(userId, count) {
  const transactions = [];

  // Generate stratified dates for better analytics
  const dates = generateStratifiedDates(count);

  // Ensure we have the right categories for expense classification
  const essentialCategories = [
    "Food",
    "Groceries",
    "Rent",
    "Utilities",
    "Healthcare",
  ];
  const nonEssentialCategories = [
    "Entertainment",
    "Shopping",
    "Travel",
    "Dining",
    "Hobbies",
  ];
  const savingsCategories = ["Investments", "Savings", "Emergency Fund"];

  // All expense categories
  const allExpenseCategories = [
    ...essentialCategories,
    ...nonEssentialCategories,
    ...savingsCategories,
    ...EXPENSE_CATEGORIES.filter(
      (cat) =>
        !essentialCategories.includes(cat) &&
        !nonEssentialCategories.includes(cat) &&
        !savingsCategories.includes(cat)
    ),
  ];

  // Generate expenses (70% of transactions)
  const expenseCount = Math.floor(count * 0.7);
  for (let i = 0; i < expenseCount; i++) {
    // Select categories with specific distribution for better analytics
    let category;
    const categoryRoll = Math.random();

    if (categoryRoll < 0.5) {
      // 50% essential expenses
      category = randomItem(essentialCategories);
    } else if (categoryRoll < 0.8) {
      // 30% non-essential
      category = randomItem(nonEssentialCategories);
    } else if (categoryRoll < 0.9) {
      // 10% savings
      category = randomItem(savingsCategories);
    } else {
      // 10% other categories
      category = randomItem(EXPENSE_CATEGORIES);
    }

    // Create expense with valid date and amount
    transactions.push({
      user_id: userId,
      amount: parseFloat(randomAmount(5, 200).toFixed(2)), // Ensure amount is a valid number with 2 decimal places
      type: "expense",
      category,
      description: getDescription(category),
      date: dates[i],
    });
  }

  // Generate income (30% of transactions)
  const incomeCount = count - expenseCount;
  for (let i = 0; i < incomeCount; i++) {
    const category = randomItem(INCOME_CATEGORIES);
    transactions.push({
      user_id: userId,
      amount: parseFloat(randomAmount(500, 3000).toFixed(2)), // Ensure amount is a valid number with 2 decimal places
      type: "income",
      category,
      description: getDescription(category),
      date: dates[expenseCount + i],
    });
  }

  // Sort transactions by date (newest first) for consistent display
  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Generate budget items
function generateBudgets(userId) {
  const budgets = [];

  // Create budget for each expense category
  for (const category of EXPENSE_CATEGORIES) {
    budgets.push({
      user_id: userId,
      category,
      amount: randomAmount(100, 1000),
      period: "monthly",
    });
  }

  return budgets;
}

// Generate loans
function generateLoans(userId, count) {
  const loans = [];
  const names = [
    "John",
    "Sarah",
    "Mike",
    "Emily",
    "David",
    "Lisa",
    "Alex",
    "Emma",
  ];

  for (let i = 0; i < count; i++) {
    const isLent = Math.random() > 0.5;
    const isSettled = Math.random() > 0.7;

    // Add reminder date for some loans (about 60% of them)
    const hasReminderDate = Math.random() > 0.4;

    // Generate a reminder date between today and 30 days in the future
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
    const reminderDate = hasReminderDate
      ? futureDate.toISOString().split("T")[0]
      : null;

    loans.push({
      user_id: userId,
      person: randomItem(names),
      amount: randomAmount(20, 300),
      is_lent: isLent ? 1 : 0,
      is_settled: isSettled ? 1 : 0,
      date: randomDate(),
      reminder_date: reminderDate,
    });
  }

  return loans;
}

// Generate subscriptions
function generateSubscriptions(userId) {
  const subscriptions = [
    {
      user_id: userId,
      name: "Netflix",
      amount: 15.99,
      billing_cycle: "monthly",
      next_payment: randomDate(),
    },
    {
      user_id: userId,
      name: "Spotify",
      amount: 9.99,
      billing_cycle: "monthly",
      next_payment: randomDate(),
    },
    {
      user_id: userId,
      name: "Gym Membership",
      amount: 49.99,
      billing_cycle: "monthly",
      next_payment: randomDate(),
    },
    {
      user_id: userId,
      name: "Cloud Storage",
      amount: 5.99,
      billing_cycle: "monthly",
      next_payment: randomDate(),
    },
    {
      user_id: userId,
      name: "Domain Name",
      amount: 14.99,
      billing_cycle: "yearly",
      next_payment: randomDate(),
    },
  ];

  return subscriptions;
}

// Generate unique avatar URLs based on user information
function generateAvatarUrl(username, email) {
  // Using DiceBear API to generate unique avatars
  // Options: bottts, avataaars, human, identicon, initials, jdenticon, gridy
  const style = "avataaars";
  const seed = email.toLowerCase();

  // Generate different colors based on the username length to ensure uniqueness
  const backgroundColors = [
    "65c9ff",
    "ffc65c",
    "c65cff",
    "5cff9d",
    "ff5c5c",
    "5c75ff",
    "ff5cc6",
    "c6ff5c",
    "5cffc6",
    "ffa500",
  ];
  const colorIndex = username.length % backgroundColors.length;
  const bgColor = backgroundColors[colorIndex];

  // Options for the avatar
  const options = [
    "top[]=shortHair,longHair,eyepatch,hat",
    "accessories[]=kurt,prescription01,prescription02,round",
    "hairColor[]=auburn,black,blonde,brown,platinum,red",
    "clothesColor[]=black,blue,gray,heather,pastel,pink,red,white",
    `backgroundColor[]=${bgColor}`,
    "b=40", // Avatar padding
  ].join("&");

  return `https://avatars.dicebear.com/api/${style}/${seed}.svg?${options}`;
}

// Check if column exists in table
async function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      // Check if any row has the column name we're looking for
      const exists =
        rows &&
        Array.isArray(rows) &&
        rows.some((row) => row.name === columnName);
      resolve(exists);
    });
  });
}

// Add missing column if it doesn't exist
async function addColumnIfMissing(tableName, columnName, columnType) {
  try {
    const exists = await columnExists(tableName, columnName);

    if (!exists) {
      console.log(`Adding missing column ${columnName} to ${tableName}`);
      await new Promise((resolve, reject) => {
        db.run(
          `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error checking/adding column: ${error.message}`);
    return false;
  }
}

// Main seeding function
async function seedDatabase() {
  console.log("Starting database seeding...");

  // Ensure all required columns exist
  await addColumnIfMissing("users", "profile_photo", "TEXT");

  // Clear existing data
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM transactions", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run("DELETE FROM budgets", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run("DELETE FROM loans", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run("DELETE FROM subscriptions", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(TEST_USER.password, salt);

  // Generate avatar URL for the user
  const avatarUrl = generateAvatarUrl(TEST_USER.username, TEST_USER.email);

  // Updated user check with better error handling
  let user;
  try {
    user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE email = ?",
        [TEST_USER.email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  } catch (error) {
    console.error("Error checking for existing user:", error);
    throw error;
  }

  let userId;

  if (user) {
    // Update existing user
    userId = user.id;
    console.log(`Updating existing user with ID ${userId}`);

    try {
      await new Promise((resolve, reject) => {
        // Check if profile_photo column exists
        db.run(
          "UPDATE users SET username = ?, password = ?, profile_photo = ? WHERE id = ?",
          [TEST_USER.username, hashedPassword, avatarUrl, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } catch (error) {
      console.error("Error updating user:", error);
      // Try without profile_photo if we get an error
      if (error.message.includes("no such column: profile_photo")) {
        console.log("Falling back to update without profile_photo");
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE users SET username = ?, password = ? WHERE id = ?",
            [TEST_USER.username, hashedPassword, userId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } else {
        throw error;
      }
    }
  } else {
    // Create new user
    console.log("Creating new test user");

    try {
      const result = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO users (username, email, password, profile_photo) VALUES (?, ?, ?, ?)",
          [TEST_USER.username, TEST_USER.email, hashedPassword, avatarUrl],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      userId = result;
    } catch (error) {
      console.error("Error creating user:", error);
      // Try without profile_photo if we get an error
      if (error.message.includes("no such column: profile_photo")) {
        console.log("Falling back to insert without profile_photo");
        const result = await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [TEST_USER.username, TEST_USER.email, hashedPassword],
            function (err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        userId = result;
      } else {
        throw error;
      }
    }
  }

  // Generate and insert transactions
  const transactions = generateTransactions(userId, 100);
  for (const transaction of transactions) {
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO transactions (user_id, amount, type, category, description, date) VALUES (?, ?, ?, ?, ?, ?)",
        [
          transaction.user_id,
          transaction.amount,
          transaction.type,
          transaction.category,
          transaction.description,
          transaction.date,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Generate and insert budgets
  const budgets = generateBudgets(userId);
  for (const budget of budgets) {
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO budgets (user_id, category, amount, period) VALUES (?, ?, ?, ?)",
        [budget.user_id, budget.category, budget.amount, budget.period],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Generate and insert loans
  const loans = generateLoans(userId, 10);
  for (const loan of loans) {
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO loans (user_id, person, amount, is_lent, is_settled, date, reminder_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          loan.user_id,
          loan.person,
          loan.amount,
          loan.is_lent,
          loan.is_settled,
          loan.date,
          loan.reminder_date,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Generate and insert subscriptions
  const subscriptions = generateSubscriptions(userId);
  for (const subscription of subscriptions) {
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO subscriptions (user_id, name, amount, billing_cycle, next_payment) VALUES (?, ?, ?, ?, ?)",
        [
          subscription.user_id,
          subscription.name,
          subscription.amount,
          subscription.billing_cycle,
          subscription.next_payment,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  console.log("Database seeding completed!");
  console.log("------------------------------------");
  console.log("Test User Credentials:");
  console.log(`Email: ${TEST_USER.email}`);
  console.log(`Password: ${TEST_USER.password}`);
  console.log("------------------------------------");

  // Close the database connection
  db.close();
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  db.close();
  process.exit(1);
});
