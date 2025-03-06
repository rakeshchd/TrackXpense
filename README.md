# TrackXpense for Students

A simple and user-friendly finance management website for students to track their spending, income, lending, and subscriptions. The platform is visually appealing, works on all devices (desktop, tablet, mobile), and is easy to use with minimal learning curve.

## Features

### 1. Expense & Income Tracking

- Manually enter expenses/income
- Simple category selection (Food, Rent, Shopping, etc.)
- Basic spending analytics (weekly/monthly summaries)

### 2. AI-Powered Budgeting & Insights

- AI suggests simple money-saving tips based on spending
- Alerts when spending exceeds a set budget
- Monthly financial summary

### 3. Social & Smart Finance Tools

- Bill-splitting tracker (track money lent to friends)
- Subscription tracker (Netflix, Spotify, etc.)
- Auto-reminders for pending payments

### 4. Multi-Device Compatibility

- Responsive web app (works on phones, tablets, and desktops)
- Lightweight design for smooth performance
- Dark mode & color themes for personalization

## Tech Stack

### Frontend:

- React.js (for fast and responsive UI)
- Tailwind CSS (for a clean, mobile-friendly design)

### Backend:

- Node.js + Express (for a lightweight API)
- SQLite (for easy, secure data storage)
- JWT for authentication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository

```
git clone https://github.com/yourusername/trackxpense.git
cd trackxpense
```

2. Install backend dependencies

```
cd server
npm install
```

3. Install frontend dependencies

```
cd ../client
npm install
```

### Running the Application

1. Start the backend server

```
cd server
npm run dev
```

2. Start the frontend development server

```
cd client
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
trackxpense/
├── client/                 # Frontend React application
│   ├── public/             # Public assets
│   └── src/                # React source files
│       ├── assets/         # Images, icons, etc.
│       ├── components/     # Reusable UI components
│       ├── layouts/        # Page layouts
│       ├── pages/          # Page components
│       ├── utils/          # Utility functions
│       └── hooks/          # Custom React hooks
├── server/                 # Backend Express application
│   ├── index.js            # Main server file
│   └── finance.db          # SQLite database
└── README.md               # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This project was created as a simplified finance management solution for students
- Inspired by the need for a lightweight, easy-to-use financial tracking tool
