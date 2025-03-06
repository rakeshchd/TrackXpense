import React from 'react';
import ExpenseAnalytics from '../components/ExpenseAnalytics';

const ExpenseAnalyticsPage = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Expense Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track and analyze your spending patterns over time
        </p>
      </div>
      
      <ExpenseAnalytics />
      
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
        <h2 className="text-lg font-medium mb-2">About This Feature</h2>
        <p className="text-sm mb-2">
          The Expense Analytics tool helps you understand your spending patterns over time. You can:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
          <li>View expenses by week, month, or year</li>
          <li>Compare your spending with previous periods</li>
          <li>Identify spending trends and patterns</li>
          <li>Group data by day, week, or month for different views</li>
          <li>Get insights about your spending habits</li>
        </ul>
        <p className="text-sm mt-2">
          Use these insights to make more informed financial decisions and improve your budget planning.
        </p>
      </div>
    </div>
  );
};

export default ExpenseAnalyticsPage; 