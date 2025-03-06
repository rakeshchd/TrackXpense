import { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  CalendarIcon, 
  ArrowsRightLeftIcon, 
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getTransactions } from '../utils/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

const ExpenseAnalytics = () => {
  // Data states
  const [currentPeriodData, setCurrentPeriodData] = useState([]);
  const [previousPeriodData, setPreviousPeriodData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // UI states
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [periodType, setPeriodType] = useState('month'); // 'week', 'month', 'year'
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [aggregationType, setAggregationType] = useState('day'); // 'day', 'week', 'month'
  
  // Date range states
  const [currentDateRange, setCurrentDateRange] = useState(() => {
    // Default to current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0],
      label: 'This Month'
    };
  });
  
  // Ref for clicking outside
  const datePickerRef = useRef(null);
  
  // Close custom date picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowPeriodPicker(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Data fetching
  useEffect(() => {
    fetchExpenseData();
  }, [currentDateRange, comparisonEnabled, aggregationType]);
  
  const fetchExpenseData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current period data
      const currentParams = {
        startDate: currentDateRange.start,
        endDate: currentDateRange.end
      };
      
      console.log('Fetching current period data:', currentParams);
      
      let currentTransactions = [];
      try {
        const currentResponse = await getTransactions(currentParams);
        
        if (currentResponse && currentResponse.data && Array.isArray(currentResponse.data.transactions)) {
          currentTransactions = currentResponse.data.transactions;
          console.log(`Fetched ${currentTransactions.length} transactions for current period`);
        } else {
          console.warn('Invalid response format for current period:', currentResponse);
          toast.error('Received invalid data format from server');
        }
      } catch (error) {
        console.error('Error fetching current period transactions:', error);
        toast.error('Failed to fetch current period transactions');
        setError('Failed to load current period data');
      }
      
      // Process current period data
      const currentData = processTransactionData(
        currentTransactions, 
        currentDateRange.start, 
        currentDateRange.end, 
        aggregationType
      );
      
      setCurrentPeriodData(currentData);
      
      // If comparison is enabled, get previous period data
      if (comparisonEnabled) {
        const previousDates = calculatePreviousPeriod(
          currentDateRange.start, 
          currentDateRange.end
        );
        
        const previousParams = {
          startDate: previousDates.start,
          endDate: previousDates.end
        };
        
        console.log('Fetching previous period data:', previousParams);
        
        let previousTransactions = [];
        try {
          const previousResponse = await getTransactions(previousParams);
          
          if (previousResponse && previousResponse.data && Array.isArray(previousResponse.data.transactions)) {
            previousTransactions = previousResponse.data.transactions;
            console.log(`Fetched ${previousTransactions.length} transactions for previous period`);
          } else {
            console.warn('Invalid response format for previous period:', previousResponse);
          }
        } catch (error) {
          console.error('Error fetching previous period transactions:', error);
          toast.error('Failed to fetch comparison data');
        }
        
        // Process previous period data
        const previousData = processTransactionData(
          previousTransactions, 
          previousDates.start, 
          previousDates.end, 
          aggregationType
        );
        
        setPreviousPeriodData(previousData);
      } else {
        setPreviousPeriodData([]);
      }
    } catch (error) {
      console.error('Error in fetchExpenseData:', error);
      setError('Failed to load expense data');
      toast.error('Failed to load expense data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to process transaction data for the chart
  const processTransactionData = (transactions, startDate, endDate, aggregationType) => {
    // Ensure we have transactions data
    if (!transactions || !Array.isArray(transactions)) {
      console.warn('No valid transactions data received', transactions);
      return [];
    }

    // Filter to expenses only and ensure they have valid dates
    const expenses = transactions.filter(t => {
      // Validate that we have a proper transaction with valid type and amount
      const isValidTransaction = t && t.type === 'expense' && typeof t.amount === 'number';
      // Check if date is valid
      const hasValidDate = t && t.date && !isNaN(new Date(t.date).getTime());
      
      if (!isValidTransaction) {
        console.warn('Invalid transaction filtered out:', t);
      }
      if (!hasValidDate) {
        console.warn('Transaction with invalid date filtered out:', t);
      }
      
      return isValidTransaction && hasValidDate;
    });
    
    // Log for debugging
    console.log(`Processing ${expenses.length} expenses from ${transactions.length} transactions`);
    
    // Get date range for aggregation
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Normalize to end of day
    
    // Create aggregation buckets based on aggregation type
    const aggregationMap = new Map();
    
    // Initialize all buckets in the date range
    let current = new Date(start);
    
    while (current <= end) {
      let key;
      
      if (aggregationType === 'day') {
        key = current.toISOString().split('T')[0];
      } else if (aggregationType === 'week') {
        // Get the week number
        const weekNumber = getWeekNumber(current);
        key = `Week ${weekNumber}`;
      } else if (aggregationType === 'month') {
        key = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (!aggregationMap.has(key)) {
        aggregationMap.set(key, 0);
      }
      
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
    
    // Aggregate expenses into buckets
    for (const expense of expenses) {
      try {
        const expenseDate = new Date(expense.date);
        
        // Make sure the date is valid
        if (isNaN(expenseDate.getTime())) {
          console.warn('Invalid date in expense:', expense);
          continue;
        }
        
        let key;
        
        if (aggregationType === 'day') {
          key = expenseDate.toISOString().split('T')[0];
        } else if (aggregationType === 'week') {
          const weekNumber = getWeekNumber(expenseDate);
          key = `Week ${weekNumber}`;
        } else if (aggregationType === 'month') {
          key = expenseDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        
        if (aggregationMap.has(key)) {
          aggregationMap.set(key, aggregationMap.get(key) + expense.amount);
        } else {
          console.warn(`Key not found in aggregation map: ${key}, expense date: ${expense.date}`);
        }
      } catch (error) {
        console.error('Error processing expense:', error, expense);
      }
    }
    
    // Convert map to array of data points
    const dataPoints = [];
    
    for (const [label, amount] of aggregationMap.entries()) {
      dataPoints.push({
        label,
        amount
      });
    }
    
    // Sort data points by date
    return dataPoints.sort((a, b) => {
      if (aggregationType === 'day') {
        return new Date(a.label) - new Date(b.label);
      } else if (aggregationType === 'week') {
        // Extract week numbers
        const weekA = parseInt(a.label.split(' ')[1]);
        const weekB = parseInt(b.label.split(' ')[1]);
        return weekA - weekB;
      } else {
        // For month, convert back to date objects
        const dateA = new Date(a.label);
        const dateB = new Date(b.label);
        return dateA - dateB;
      }
    });
  };
  
  // Helper function to get week number of the year
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };
  
  // Helper function to get period label
  const getPreviousPeriodLabel = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatOptions = { month: 'short', day: 'numeric' };
    const startFormatted = start.toLocaleDateString('en-US', formatOptions);
    const endFormatted = end.toLocaleDateString('en-US', formatOptions);
    
    return `${startFormatted} - ${endFormatted}`;
  };
  
  // Helper function to calculate the previous period based on current period
  const calculatePreviousPeriod = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate the duration in days
    const durationInDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate previous period by subtracting the duration from start date
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - durationInDays);
    
    const previousEnd = new Date(previousStart);
    previousEnd.setDate(previousEnd.getDate() + durationInDays - 1);
    
    return {
      start: previousStart.toISOString().split('T')[0],
      end: previousEnd.toISOString().split('T')[0],
      label: getPreviousPeriodLabel(previousStart, previousEnd)
    };
  };
  
  // Format month and year for calendar display
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Calendar navigation
  const previousMonth = () => {
    setCurrentDateRange(prev => ({
      ...prev,
      start: new Date(new Date(prev.start).setMonth(new Date(prev.start).getMonth() - 1)).toISOString().split('T')[0],
      end: new Date(new Date(prev.end).setMonth(new Date(prev.end).getMonth() - 1)).toISOString().split('T')[0],
      label: 'Previous Month'
    }));
  };
  
  const nextMonth = () => {
    setCurrentDateRange(prev => ({
      ...prev,
      start: new Date(new Date(prev.start).setMonth(new Date(prev.start).getMonth() + 1)).toISOString().split('T')[0],
      end: new Date(new Date(prev.end).setMonth(new Date(prev.end).getMonth() + 1)).toISOString().split('T')[0],
      label: 'Next Month'
    }));
  };
  
  // Set up period selection
  const setPeriod = (periodType) => {
    const now = new Date();
    let start, end, label;
    
    switch (periodType) {
      case 'week':
        // Get start of week (Sunday)
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek));
        label = 'This Week';
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        label = 'This Month';
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        label = 'This Year';
        break;
      default:
        return; // Don't change anything for unknown types
    }
    
    setPeriodType(periodType);
    setCurrentDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label
    });
    
    // Auto-select appropriate aggregation type based on period
    if (periodType === 'week') {
      setAggregationType('day');
    } else if (periodType === 'month') {
      setAggregationType('day');
    } else if (periodType === 'year') {
      setAggregationType('month');
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
    
    // For day-level aggregation, show full date
    if (aggregationType === 'day') {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    // For other aggregation types, return the string as is (already formatted in processTransactionData)
    return dateString;
  };
  
  // Calculate comparison metrics
  const calculateComparison = () => {
    if (!comparisonEnabled || currentPeriodData.length === 0 || previousPeriodData.length === 0) {
      return {
        change: 0,
        percentChange: 0
      };
    }
    
    const currentTotal = currentPeriodData.reduce((sum, item) => sum + item.amount, 0);
    const previousTotal = previousPeriodData.reduce((sum, item) => sum + item.amount, 0);
    
    const change = currentTotal - previousTotal;
    const percentChange = previousTotal !== 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;
    
    return {
      currentTotal,
      previousTotal,
      change,
      percentChange
    };
  };
  
  // Prepare chart data
  const chartData = {
    labels: currentPeriodData.length > 0 
      ? currentPeriodData.map(item => formatDate(item.label))
      : ['No data available'],
    datasets: [
      {
        label: `Current Period (${formatDate(currentDateRange.start)} - ${formatDate(currentDateRange.end)})`,
        data: currentPeriodData.length > 0 
          ? currentPeriodData.map(item => item.amount)
          : [0],
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.5)',
        tension: 0.3,
        fill: false,
      },
      ...comparisonEnabled && previousPeriodData.length > 0 ? [
        {
          label: `Previous Period (${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).start)} - ${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).end)})`,
          data: previousPeriodData.length > 0 
            ? previousPeriodData.map(item => item.amount)
            : Array(currentPeriodData.length > 0 ? currentPeriodData.length : 1).fill(0),
          borderColor: '#9ca3af', 
          backgroundColor: 'rgba(156, 163, 175, 0.5)',
          tension: 0.3,
          fill: false,
          borderDash: [5, 5]
        }
      ] : []
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const comparison = calculateComparison();
  
  return (
    <div className="card space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between items-center space-y-4 md:space-y-0">
        <h2 className="text-xl font-bold">Expense Trends</h2>
        
        <div className="flex flex-wrap gap-3">
          {/* Period selector */}
          <div className="relative">
            <button 
              onClick={() => setShowPeriodPicker(!showPeriodPicker)}
              className="btn btn-outline flex items-center"
            >
              <CalendarIcon className="h-5 w-5 mr-2" />
              <span>{currentDateRange.label}</span>
            </button>
            
            {showPeriodPicker && (
              <div className="absolute right-0 mt-1 p-3 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-700 w-56">
                <h3 className="text-sm font-medium mb-2">Select Period</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button 
                    onClick={() => {
                      setPeriod('week');
                      setShowPeriodPicker(false);
                    }}
                    className={`px-3 py-1 text-sm rounded ${periodType === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                  >
                    Week
                  </button>
                  <button 
                    onClick={() => {
                      setPeriod('month');
                      setShowPeriodPicker(false);
                    }}
                    className={`px-3 py-1 text-sm rounded ${periodType === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                  >
                    Month
                  </button>
                  <button 
                    onClick={() => {
                      setPeriod('year');
                      setShowPeriodPicker(false);
                    }}
                    className={`px-3 py-1 text-sm rounded ${periodType === 'year' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                  >
                    Year
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Aggregation Type selector */}
          <div className="relative">
            <button 
              onClick={() => {
                // Toggle between aggregation types
                const types = ['day', 'week', 'month'];
                const currentIndex = types.indexOf(aggregationType);
                const nextIndex = (currentIndex + 1) % types.length;
                setAggregationType(types[nextIndex]);
              }}
              className="btn btn-outline flex items-center"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              <span>Group by {aggregationType === 'day' ? 'Day' : aggregationType === 'week' ? 'Week' : 'Month'}</span>
            </button>
          </div>
          
          {/* Comparison toggle */}
          <button 
            onClick={() => setComparisonEnabled(!comparisonEnabled)}
            className={`btn flex items-center ${comparisonEnabled ? 'btn-primary' : 'btn-outline'}`}
          >
            <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
            <span>Compare</span>
          </button>
        </div>
      </div>
      
      {/* Comparison Summary */}
      {comparisonEnabled && comparison.currentTotal !== undefined && (
        <div className={`p-4 rounded-md mb-4 ${
          comparison.change < 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800' : 
          comparison.change > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800' : 
          'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Period Comparison</h3>
            <div className="group relative">
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <InformationCircleIcon className="h-5 w-5" />
              </button>
              <div className="hidden group-hover:block absolute right-0 top-6 w-64 p-2 bg-white dark:bg-gray-700 rounded shadow-lg z-20 text-xs text-gray-600 dark:text-gray-300">
                <p className="mb-1"><strong>How previous period is calculated:</strong></p>
                <p>The previous period is exactly the same duration as your selected period, but immediately before it.</p>
                <p className="mt-1">For example, if you select "This Month", the previous period will be last month.</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Period ({currentDateRange.label})</p>
              <p className="text-lg font-bold">{formatCurrency(comparison.currentTotal || 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(currentDateRange.start)} - {formatDate(currentDateRange.end)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Previous Period ({calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).label})
              </p>
              <p className="text-lg font-bold">{formatCurrency(comparison.previousTotal || 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).start)} - {formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).end)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Change</p>
              <p className={`text-lg font-bold ${
                comparison.change < 0 ? 'text-green-600 dark:text-green-400' : 
                comparison.change > 0 ? 'text-red-600 dark:text-red-400' : 
                'text-gray-600 dark:text-gray-400'
              }`}>
                {formatCurrency(comparison.change || 0)} 
                ({comparison.percentChange > 0 ? '+' : ''}{comparison.percentChange.toFixed(1)}%)
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm">
            {comparison.change < 0 
              ? `✅ You spent ${formatCurrency(Math.abs(comparison.change))} less compared to the previous period (${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).start)} - ${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).end)}). Great job!` 
              : comparison.change > 0 
                ? `⚠️ Your expenses increased by ${formatCurrency(comparison.change)} compared to the previous period (${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).start)} - ${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).end)}).` 
                : `📊 Your expenses remained the same compared to the previous period (${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).start)} - ${formatDate(calculatePreviousPeriod(currentDateRange.start, currentDateRange.end).end)}).`}
          </p>
        </div>
      )}
      
      {/* Chart section */}
      <div className="aspect-video mb-4 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center p-4">
              <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
              <button 
                onClick={fetchExpenseData} 
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          currentPeriodData.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No expense data available for the selected period.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try selecting a different time period or add some transactions.</p>
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )
        )}
      </div>
      
      {/* Insights Section */}
      {!isLoading && !error && currentPeriodData.length > 0 && (
        <div className="mt-6 p-4 bg-primary-50 dark:bg-gray-700 rounded-md border border-primary-100 dark:border-gray-600">
          <h3 className="font-medium mb-2">Expense Insights</h3>
          <div className="space-y-2 text-sm">
            {(() => {
              // Find peak spending day/period
              const peakSpending = [...currentPeriodData].sort((a, b) => b.amount - a.amount)[0];
              
              // Calculate average spending
              const avgSpending = currentPeriodData.reduce((sum, item) => sum + item.amount, 0) / currentPeriodData.length;
              
              // Detect spending pattern
              const firstHalf = currentPeriodData.slice(0, Math.floor(currentPeriodData.length / 2));
              const secondHalf = currentPeriodData.slice(Math.floor(currentPeriodData.length / 2));
              
              const firstHalfTotal = firstHalf.reduce((sum, item) => sum + item.amount, 0);
              const secondHalfTotal = secondHalf.reduce((sum, item) => sum + item.amount, 0);
              
              const insights = [];
              
              insights.push(
                <p key="peak">
                  <span className="font-medium">📊 Peak Spending:</span> Your highest spending was on {formatDate(peakSpending.label)} 
                  with {formatCurrency(peakSpending.amount)}.
                </p>
              );
              
              insights.push(
                <p key="average">
                  <span className="font-medium">📈 Average Spending:</span> You spent an average of {formatCurrency(avgSpending)} 
                  per {aggregationType}.
                </p>
              );
              
              if (Math.abs(firstHalfTotal - secondHalfTotal) > (firstHalfTotal + secondHalfTotal) * 0.2) {
                insights.push(
                  <p key="pattern">
                    <span className="font-medium">🔍 Spending Pattern:</span> You spent {
                      firstHalfTotal > secondHalfTotal ? 'more in the beginning' : 'more toward the end'
                    } of this period.
                  </p>
                );
              }
              
              if (comparisonEnabled && comparison.percentChange !== 0) {
                insights.push(
                  <p key="comparison">
                    <span className="font-medium">{
                      comparison.percentChange < 0 ? '💰 Savings:' : '💸 Increased Spending:'
                    }</span> Your expenses {
                      comparison.percentChange < 0 ? 'decreased' : 'increased'
                    } by {Math.abs(comparison.percentChange).toFixed(1)}% compared to the previous period.
                  </p>
                );
              }
              
              return insights;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseAnalytics; 