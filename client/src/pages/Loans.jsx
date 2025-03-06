import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getLoans, addLoan, settleLoan } from '../utils/api';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    person: '',
    amount: '',
    is_lent: true,
    reminder_date: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [confirmingSettlement, setConfirmingSettlement] = useState(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await getLoans();
      setLoans(response.data.loans || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await addLoan(formData);
      
      toast.success('Loan added successfully');
      setFormData({
        person: '',
        amount: '',
        is_lent: true,
        reminder_date: ''
      });
      setShowForm(false);
      fetchLoans();
    } catch (error) {
      console.error('Error adding loan:', error);
      toast.error(error.response?.data?.message || 'Failed to add loan');
    }
  };

  const openSettlementConfirmation = (loanId) => {
    setConfirmingSettlement(loanId);
  };

  const closeSettlementConfirmation = () => {
    setConfirmingSettlement(null);
  };

  const handleSettle = async () => {
    try {
      await settleLoan(confirmingSettlement);
      
      toast.success('Loan marked as settled');
      closeSettlementConfirmation();
      fetchLoans();
    } catch (error) {
      console.error('Error settling loan:', error);
      toast.error(error.response?.data?.message || 'Failed to settle loan');
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium">Loading loans...</div>
      </div>
    );
  }

  // Separate active and settled loans
  const activeLoans = loans.filter(loan => !loan.is_settled);
  const settledLoans = loans.filter(loan => loan.is_settled);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Loans</h1>
          <p className="text-gray-600 dark:text-gray-400">Track money you've lent or borrowed</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'Add Loan'}
        </button>
      </div>

      {/* Add Loan Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Add New Loan</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="person" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Person
                </label>
                <input
                  type="text"
                  id="person"
                  name="person"
                  value={formData.person}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Friend's name"
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
                <label htmlFor="reminder_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reminder Date (Optional)
                </label>
                <input
                  type="date"
                  id="reminder_date"
                  name="reminder_date"
                  value={formData.reminder_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You'll receive a notification on this date
                </p>
              </div>
              
              <div className="flex items-center">
                <div className="flex items-center h-full">
                  <input
                    id="is_lent"
                    name="is_lent"
                    type="checkbox"
                    checked={formData.is_lent}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_lent" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    I lent this money (uncheck if you borrowed)
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Add Loan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settlement Confirmation Modal */}
      {confirmingSettlement && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-75"></div>
            </div>
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Mark Loan as Settled
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to mark this loan as settled? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSettle}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Yes, Mark as Settled
                </button>
                <button
                  type="button"
                  onClick={closeSettlementConfirmation}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Loans */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4">Active Loans</h2>
        
        {activeLoans.length > 0 ? (
          <div className="space-y-4">
            {activeLoans.map((loan) => (
              <div key={loan.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div>
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${loan.is_lent ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <p className="font-medium">{loan.person}</p>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Loan Date: {formatDate(loan.date)}</p>
                    {loan.reminder_date && (
                      <p className="mt-1">
                        <span className="text-primary-600">⏰ Reminder:</span> {formatDate(loan.reminder_date)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${loan.is_lent ? 'text-green-600' : 'text-red-600'}`}>
                    {loan.is_lent ? 'Lent: ' : 'Borrowed: '} {formatCurrency(loan.amount)}
                  </p>
                  <button
                    onClick={() => openSettlementConfirmation(loan.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                  >
                    Mark as settled
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <p>No active loans. Add a loan to start tracking!</p>
          </div>
        )}
      </div>

      {/* Settled Loans */}
      {settledLoans.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Settled Loans</h2>
          <div className="space-y-4">
            {settledLoans.map((loan) => (
              <div key={loan.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md opacity-70">
                <div>
                  <div className="flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-400"></span>
                    <p className="font-medium">{loan.person}</p>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Loan Date: {formatDate(loan.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-600 dark:text-gray-400">
                    {loan.is_lent ? 'Lent: ' : 'Borrowed: '} {formatCurrency(loan.amount)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Settled</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loan Tips */}
      <div className="card bg-primary-50 dark:bg-gray-700 border border-primary-100 dark:border-gray-600">
        <h2 className="text-lg font-medium mb-2">Loan Tips</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Clear Terms:</span> Always be clear about repayment terms when lending money to friends.
          </li>
          <li>
            <span className="font-medium">Documentation:</span> For larger amounts, consider creating a simple written agreement.
          </li>
          <li>
            <span className="font-medium">Set Dates:</span> Agree on a specific repayment date to avoid awkward conversations later.
          </li>
          <li>
            <span className="font-medium">Track Everything:</span> Keep good records of your loans to maintain healthy financial relationships.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Loans; 