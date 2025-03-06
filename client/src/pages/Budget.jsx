import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getBudgets, addBudget, getTransactions, getSubscriptions } from '../utils/api';

const Budget = () => {
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly',
  });
  const [showForm, setShowForm] = useState(false);

  // Categories for budgeting
  const categories = ['Food', 'Housing', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Education', 'Shopping', 'Other'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch budgets, transactions, and subscriptions in parallel
        const [budgetsResponse, transactionsResponse, subscriptionsResponse] = await Promise.all([
          getBudgets(),
          getTransactions(),
          getSubscriptions()
        ]);
        
        setBudgets(budgetsResponse.data.budgets || []);
        setTransactions(transactionsResponse.data.transactions || []);
        setSubscriptions(subscriptionsResponse.data.subscriptions || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await addBudget(formData);
      
      toast.success('Budget added successfully');
      setFormData({
        category: '',
        amount: '',
        period: 'monthly',
      });
      setShowForm(false);
      
      // Refresh budgets
      const response = await getBudgets();
      setBudgets(response.data.budgets || []);
    } catch (error) {
      console.error('Error adding budget:', error);
      toast.error(error.response?.data?.message || 'Failed to add budget');
    }
  };

  // Calculate spending for each budget
  const calculateBudgetSpending = (budget) => {
    // Get all expenses in this category
    const categoryExpenses = transactions
      .filter(t => t.type === 'expense' && t.category === budget.category)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Get all subscriptions in this category
    let subscriptionCosts = 0;
    if (budget.category === 'Entertainment' || budget.category === 'Other') {
      // Find subscriptions that match this category
      const categorySubscriptions = subscriptions.filter(
        s => s.category === budget.category
      );
      
      subscriptionCosts = categorySubscriptions.reduce(
        (sum, s) => sum + parseFloat(s.amount), 0
      );
    }
    
    const totalSpending = categoryExpenses + subscriptionCosts;
    const percentage = budget.amount > 0 ? (totalSpending / budget.amount) * 100 : 0;
    
    return {
      spent: totalSpending,
      percentage: Math.min(percentage, 100) // Cap at 100% for UI purposes
    };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium">Loading budgets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-gray-600 dark:text-gray-400">Set spending limits for different categories</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'Add Budget'}
        </button>
      </div>

      {/* Add Budget Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Add New Budget</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Period
                </label>
                <select
                  id="period"
                  name="period"
                  value={formData.period}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Add Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budgets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length > 0 ? (
          budgets.map((budget) => {
            const { spent, percentage } = calculateBudgetSpending(budget);
            
            // Get category-specific subscriptions
            const categorySubscriptions = subscriptions.filter(
              s => s.category === budget.category
            );
            
            // Get category-specific transactions
            const categoryTransactions = transactions
              .filter(t => t.type === 'expense' && t.category === budget.category)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 3);
            
            return (
              <div key={budget.id} className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{budget.category}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{budget.period}</span>
                </div>
                <div className="text-2xl font-bold mb-2">{formatCurrency(budget.amount)}</div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                  <div 
                    className={`h-2.5 rounded-full ${
                      percentage >= 90 ? 'bg-red-600' : 
                      percentage >= 75 ? 'bg-yellow-500' : 
                      'bg-primary-600'
                    }`} 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{formatCurrency(spent)}</span>
                  <span className={`${
                    percentage >= 90 ? 'text-red-600 dark:text-red-400' : 
                    percentage >= 75 ? 'text-yellow-500 dark:text-yellow-400' : 
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {percentage.toFixed(0)}% used
                  </span>
                  <span>{formatCurrency(budget.amount)}</span>
                </div>
                
                {/* Show related subscriptions */}
                {categorySubscriptions.length > 0 && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <h4 className="text-sm font-medium mb-2">Related Subscriptions</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {categorySubscriptions.map(sub => (
                        <div key={sub.id} className="flex justify-between text-sm">
                          <span>{sub.name}</span>
                          <span>{formatCurrency(sub.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right">
                      <Link to="/app/subscriptions" className="text-xs text-primary-600 hover:text-primary-700">
                        Manage subscriptions →
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* Show related transactions */}
                {categoryTransactions.length > 0 && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <h4 className="text-sm font-medium mb-2">Recent Expenses</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {categoryTransactions.map(transaction => (
                        <div key={transaction.id} className="flex justify-between text-sm">
                          <span>{transaction.description || transaction.category}</span>
                          <span className="text-red-600 dark:text-red-400">{formatCurrency(transaction.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right">
                      <Link to="/app/transactions" className="text-xs text-primary-600 hover:text-primary-700">
                        View all transactions →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
            <p>No budgets found. Add your first budget to start tracking your spending!</p>
          </div>
        )}
      </div>

      {/* Budget Tips */}
      <div className="card bg-primary-50 dark:bg-gray-700 border border-primary-100 dark:border-gray-600">
        <h2 className="text-lg font-medium mb-2">Budgeting Tips</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">50/30/20 Rule:</span> Allocate 50% of your income to needs, 30% to wants, and 20% to savings.
          </li>
          <li>
            <span className="font-medium">Zero-Based Budgeting:</span> Assign every dollar of income to a specific category until you reach zero.
          </li>
          <li>
            <span className="font-medium">Envelope System:</span> Divide cash into envelopes for different spending categories to avoid overspending.
          </li>
          <li>
            <span className="font-medium">Connect Your Finances:</span> Your budget is automatically updated with your expense transactions and subscription costs.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Budget;