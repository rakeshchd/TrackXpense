import { CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DashboardHeader = ({ 
  dateRange, 
  setShowDatePicker, 
  showDatePicker, 
  setSelectionState, 
  setTempStartDate, 
  selectionState, 
  tempStartDate,
  formatCurrency,
  summary,
  lentTotal,
  borrowedTotal
}) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-end items-center space-y-4 md:space-y-0 md:space-x-6 mb-6">
      <div className="w-full md:w-auto md:mr-auto">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Financial overview <span className="font-medium">• {dateRange.label}</span>
        </p>
      </div>
      
      {/* Date Filtering Controls */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button 
            onClick={() => {
              setShowDatePicker(!showDatePicker);
              if (!showDatePicker) {
                setSelectionState('none');
                setTempStartDate(null);
              }
            }}
            className="btn btn-outline flex items-center"
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            <span>{dateRange.label}</span>
          </button>
        </div>
        
        <button 
          onClick={() => {
            const dashboardText = `My Financial Summary (${dateRange.label}):
- Income: ${formatCurrency(summary.totals.income)}
- Expenses: ${formatCurrency(summary.totals.expenses)}
- Balance: ${formatCurrency(summary.totals.balance)}
- Money Lent: ${formatCurrency(lentTotal)}
- Money Borrowed: ${formatCurrency(borrowedTotal)}`;
            
            navigator.clipboard.writeText(dashboardText);
            toast.success('Dashboard summary copied to clipboard!');
          }}
          className="btn btn-outline flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader; 