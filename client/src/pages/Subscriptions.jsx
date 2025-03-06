import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSubscriptions, addSubscription } from '../utils/api';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    billing_cycle: 'monthly',
    next_payment: '',
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await getSubscriptions();
      setSubscriptions(response.data.subscriptions || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

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
      await addSubscription(formData);
      
      toast.success('Subscription added successfully');
      setFormData({
        name: '',
        amount: '',
        billing_cycle: 'monthly',
        next_payment: '',
      });
      setShowForm(false);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error adding subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to add subscription');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate days until next payment
  const getDaysUntil = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextPayment = new Date(dateString);
    const diffTime = nextPayment - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status color based on days until next payment
  const getStatusColor = (days) => {
    if (days < 0) return 'text-red-600';
    if (days <= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium">Loading subscriptions...</div>
      </div>
    );
  }

  // Calculate total monthly cost
  const calculateMonthlyTotal = () => {
    return subscriptions.reduce((total, sub) => {
      let amount = parseFloat(sub.amount);
      
      // Convert to monthly equivalent
      if (sub.billing_cycle === 'yearly') {
        amount = amount / 12;
      } else if (sub.billing_cycle === 'weekly') {
        amount = amount * 4.33; // Average weeks in a month
      } else if (sub.billing_cycle === 'quarterly') {
        amount = amount / 3;
      } else if (sub.billing_cycle === 'biannually') {
        amount = amount / 6;
      }
      
      return total + amount;
    }, 0);
  };

  // Sort subscriptions by next payment date
  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    return new Date(a.next_payment) - new Date(b.next_payment);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your recurring payments</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'Add Subscription'}
        </button>
      </div>

      {/* Subscription Summary */}
      <div className="card bg-primary-50 dark:bg-gray-700">
        <div className="flex flex-col md:flex-row justify-between">
          <div>
            <h2 className="text-lg font-medium mb-1">Monthly Total</h2>
            <p className="text-2xl font-bold">{formatCurrency(calculateMonthlyTotal())}</p>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-1 mt-4 md:mt-0">Active Subscriptions</h2>
            <p className="text-2xl font-bold">{subscriptions.length}</p>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-1 mt-4 md:mt-0">Next Payment</h2>
            <p className="text-2xl font-bold">
              {sortedSubscriptions.length > 0 
                ? formatDate(sortedSubscriptions[0].next_payment)
                : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Add Subscription Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Add New Subscription</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Netflix, Spotify, etc."
                />
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
                <label htmlFor="billing_cycle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Billing Cycle
                </label>
                <select
                  id="billing_cycle"
                  name="billing_cycle"
                  value={formData.billing_cycle}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="biannually">Biannually</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="next_payment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Next Payment Date
                </label>
                <input
                  type="date"
                  id="next_payment"
                  name="next_payment"
                  value={formData.next_payment}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Add Subscription
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subscriptions List */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4">Your Subscriptions</h2>
        
        {sortedSubscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Billing Cycle
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Next Payment
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedSubscriptions.map((subscription) => {
                  const daysUntil = getDaysUntil(subscription.next_payment);
                  const statusColor = getStatusColor(daysUntil);
                  
                  return (
                    <tr key={subscription.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {subscription.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(subscription.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {subscription.billing_cycle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(subscription.next_payment)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${statusColor}`}>
                        {daysUntil < 0 
                          ? 'Overdue' 
                          : daysUntil === 0 
                            ? 'Due today' 
                            : `${daysUntil} days left`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <p>No subscriptions found. Add your first subscription to start tracking!</p>
          </div>
        )}
      </div>

      {/* Subscription Tips */}
      <div className="card bg-primary-50 dark:bg-gray-700 border border-primary-100 dark:border-gray-600">
        <h2 className="text-lg font-medium mb-2">Subscription Management Tips</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Regular Audit:</span> Review your subscriptions quarterly to cancel unused services.
          </li>
          <li>
            <span className="font-medium">Annual Plans:</span> Consider switching to annual billing for services you use regularly to save money.
          </li>
          <li>
            <span className="font-medium">Shared Accounts:</span> For family-friendly services, consider family plans to reduce per-person costs.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Subscriptions; 