import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { getSummary, getTransactions, getLoans } from '../utils/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  CalendarIcon, 
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShareIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [summary, setSummary] = useState({
    totals: { income: 0, expenses: 0, balance: 0 },
    categories: [],
    recent: []
  });
  const [loans, setLoans] = useState({
    lent: [],
    borrowed: []
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const dashboardRef = useRef(null);
  
  // Date filtering states
  const [dateFilter, setDateFilter] = useState('month'); // 'day', 'week', 'month', 'year', 'lifetime', 'custom'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
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
  // Track selection state for custom date range
  const [selectionState, setSelectionState] = useState('none'); // 'none', 'first-selected'
  const [tempStartDate, setTempStartDate] = useState(null);
  
  // Calendar navigation state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]); // Refetch when date range changes

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get API parameters for date filtering
      const params = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      // Fetch multiple data sources in parallel
      const [summaryResponse, loansResponse, transactionsResponse] = await Promise.all([
        getSummary(params),
        getLoans(),
        getTransactions(params)
      ]);
      
      setSummary(summaryResponse.data);
      
      // Process loans data - separate into lent and borrowed based on is_lent flag
      // Only include active (not settled) loans
      const loanData = loansResponse.data.loans || [];
      
      const lentLoans = loanData.filter(loan => loan.is_lent && !loan.is_settled);
      const borrowedLoans = loanData.filter(loan => !loan.is_lent && !loan.is_settled);
      
      setLoans({
        lent: lentLoans,
        borrowed: borrowedLoans
      });
      
      // We can use the transactions data if needed for additional charts or displays
      // const transactions = transactionsResponse.data.transactions || [];
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  // Set date filter and update date range
  const setDateFilterPeriod = (filter) => {
    const now = new Date();
    let start, end, label;
    
    switch (filter) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        label = 'Today';
        break;
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
      case 'lifetime':
        // Set a date far in the past for lifetime
        start = new Date(2000, 0, 1);
        end = new Date(now.getFullYear() + 10, 11, 31);
        label = 'Lifetime';
        break;
      default:
        return; // Don't change anything for custom
    }
    
    setDateFilter(filter);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label
    });
    setShowDatePicker(false);
  };
  
  // Calendar navigation
  const previousMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    // Get first day of month and how many days to show from previous month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Add days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPreviousMonth - i),
        isCurrentMonth: false
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows of 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };
  
  const handleDateSelect = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    if (selectionState === 'none') {
      // First date selection
      setTempStartDate(dateStr);
      setSelectionState('first-selected');
      
      // Preview the selection (both start and end set to the same date initially)
      setDateRange({
        start: dateStr,
        end: dateStr,
        label: 'Selecting End Date...'
      });
    } else {
      // Second date selection
      setSelectionState('none');
      
      // Get the dates as Date objects for comparison
      const firstDate = new Date(tempStartDate);
      const secondDate = new Date(dateStr);
      
      // Determine start and end dates based on chronological order
      const start = firstDate <= secondDate ? tempStartDate : dateStr;
      const end = firstDate <= secondDate ? dateStr : tempStartDate;
      
      // Format the date range label to show both dates are included
      const startFormatted = formatDate(start);
      const endFormatted = formatDate(end);
      
      setDateRange({
        start,
        end,
        label: start === end 
          ? `${startFormatted}` 
          : `${startFormatted} to ${endFormatted}`
      });
      
      setDateFilter('custom');
      setShowDatePicker(false);
      setTempStartDate(null);
    }
  };

  // Calculate totals for loans
  const lentTotal = loans.lent.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
  const borrowedTotal = loans.borrowed.reduce((sum, loan) => sum + parseFloat(loan.amount), 0);

  // Prepare chart data
  const categoryData = {
    labels: summary.categories.map(cat => cat.category),
    datasets: [
      {
        label: 'Expenses by Category',
        data: summary.categories.map(cat => cat.total),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
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
  
  // Format month and year for calendar
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Function to generate and download PDF
  const generatePDF = async () => {
    try {
      setGenerating(true);
      toast.loading('Generating PDF...', { duration: 5000 });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Get current month and year
      const currentDate = new Date();
      const monthName = currentDate.toLocaleString('default', { month: 'long' });
      const year = currentDate.getFullYear();
      
      // Add header with logo/branding
      pdf.setFillColor(41, 128, 185); // A nice blue color
      pdf.rect(0, 0, 210, 40, 'F');
      
      // Add title in white
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.text('Financial Dashboard', 105, 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text(`${monthName} ${year}`, 105, 30, { align: 'center' });
      
      // Add period subtitle
      pdf.setFontSize(12);
      pdf.text(`Period: ${dateRange.label}`, 105, 38, { align: 'center' });
      
      // Add metadata
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 50, { align: 'center' });
      
      // Add summary section
      let yPos = 60;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Financial Summary', margin, yPos);
      
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Create a summary table
      const summaryData = [
        ['Income', formatCurrency(summary.totals.income)],
        ['Expenses', formatCurrency(summary.totals.expenses)],
        ['Balance', formatCurrency(summary.totals.balance)],
        ['Money Lent', formatCurrency(lentTotal)],
        ['Money Borrowed', formatCurrency(borrowedTotal)]
      ];
      
      // Draw summary table
      summaryData.forEach((row, index) => {
        // Alternate row background for better readability
        if (index % 2 === 0) {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPos, contentWidth, 8, 'F');
        }
        
        pdf.text(row[0], margin + 5, yPos + 5.5);
        pdf.text(row[1], pageWidth - margin - 5, yPos + 5.5, { align: 'right' });
        yPos += 8;
      });
      
      // Add top spending categories section with enhanced visualization
      if (summary.categories && summary.categories.length > 0) {
        yPos += 15;
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Top Expense Categories', margin, yPos);
        
        yPos += 10;
        
        // Get top expense categories
        const expenseCategories = summary.categories
          .filter(cat => cat.type === 'expense')
          .sort((a, b) => b.amount - a.amount);
        
        // Calculate total expenses for percentage calculation
        const totalExpenses = expenseCategories.reduce((sum, cat) => sum + cat.amount, 0);
        
        // Take top 5 categories or all if less than 5
        const topCategories = expenseCategories.slice(0, 5);
        
        // Draw category table with bar visualization
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        // Table header
        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text('Category', margin + 5, yPos + 5.5);
        pdf.text('Amount', margin + 60, yPos + 5.5);
        pdf.text('% of Total', margin + 100, yPos + 5.5);
        pdf.text('Distribution', margin + 140, yPos + 5.5);
        
        yPos += 8;
        pdf.setFont('helvetica', 'normal');
        
        // Category rows
        topCategories.forEach((category, index) => {
          const rowHeight = 12;
          const percentage = (category.amount / totalExpenses) * 100;
          const barWidth = (percentage / 100) * 40; // Max bar width is 40mm
          
          // Alternate row background
          if (index % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
          }
          
          // Category name
          pdf.text(category.category, margin + 5, yPos + 7);
          
          // Amount
          pdf.text(formatCurrency(category.amount), margin + 60, yPos + 7);
          
          // Percentage
          pdf.text(`${percentage.toFixed(1)}%`, margin + 100, yPos + 7);
          
          // Bar visualization
          pdf.setFillColor(41, 128, 185);
          pdf.rect(margin + 140, yPos + 3, barWidth, 6, 'F');
          
          yPos += rowHeight;
        });
        
        // Add "Others" category if there are more than 5 expense categories
        if (expenseCategories.length > 5) {
          const othersAmount = expenseCategories
            .slice(5)
            .reduce((sum, cat) => sum + cat.amount, 0);
          
          const percentage = (othersAmount / totalExpenses) * 100;
          const barWidth = (percentage / 100) * 40;
          
          // Background for Others row
          if (topCategories.length % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, yPos, contentWidth, 12, 'F');
          }
          
          // Others category
          pdf.text('Others', margin + 5, yPos + 7);
          pdf.text(formatCurrency(othersAmount), margin + 60, yPos + 7);
          pdf.text(`${percentage.toFixed(1)}%`, margin + 100, yPos + 7);
          
          // Bar for Others
          pdf.setFillColor(150, 150, 150);
          pdf.rect(margin + 140, yPos + 3, barWidth, 6, 'F');
          
          yPos += 12;
        }
      }
      
      // Add recent transactions section if available
      if (summary.recent && summary.recent.length > 0) {
        yPos += 15;
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Recent Transactions', margin, yPos);
        
        yPos += 10;
        
        // Table header
        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text('Date', margin + 5, yPos + 5.5);
        pdf.text('Category', margin + 35, yPos + 5.5);
        pdf.text('Description', margin + 75, yPos + 5.5);
        pdf.text('Amount', pageWidth - margin - 5, yPos + 5.5, { align: 'right' });
        
        yPos += 8;
        pdf.setFont('helvetica', 'normal');
        
        // Get the 5 most recent transactions
        const recentTransactions = summary.recent.slice(0, 5);
        
        // Transaction rows
        recentTransactions.forEach((transaction, index) => {
          // Check if we need to add a new page
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          
          // Alternate row background
          if (index % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, yPos, contentWidth, 8, 'F');
          }
          
          // Format date
          const transactionDate = new Date(transaction.date);
          const dateStr = transactionDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          
          // Truncate description if too long
          const description = transaction.description || '';
          const truncatedDesc = description.length > 20 
            ? description.substring(0, 20) + '...' 
            : description;
          
          pdf.text(dateStr, margin + 5, yPos + 5.5);
          pdf.text(transaction.category, margin + 35, yPos + 5.5);
          pdf.text(truncatedDesc, margin + 75, yPos + 5.5);
          
          // Amount with color based on type
          const amountText = formatCurrency(transaction.amount);
          if (transaction.type === 'income') {
            pdf.setTextColor(0, 128, 0); // Green for income
          } else {
            pdf.setTextColor(192, 0, 0); // Red for expense
          }
          pdf.text(amountText, pageWidth - margin - 5, yPos + 5.5, { align: 'right' });
          pdf.setTextColor(0, 0, 0); // Reset text color
          
          yPos += 8;
        });
      }
      
      // Add footer with page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `Page ${i} of ${totalPages} | Generated by Financial Dashboard App`, 
          105, 
          290, 
          { align: 'center' }
        );
      }
      
      // Save the PDF with a formatted filename
      const formattedDate = new Date().toISOString().split('T')[0];
      pdf.save(`Financial_Summary_${monthName}_${year}_${formattedDate}.pdf`);
      
      toast.dismiss();
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={dashboardRef}>
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
              className="btn btn-outline flex items-center space-x-2"
            >
              <CalendarIcon className="h-5 w-5" />
              <span>Filter</span>
            </button>
            
            {/* Date Picker Dropdown */}
            {showDatePicker && (
              <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-700">
                <div className="p-3 border-b dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Select Date Range</h3>
                    <div className="flex">
                      <button 
                        onClick={previousMonth} 
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={nextMonth} 
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-center text-sm mt-1">{formatMonthYear(calendarMonth)}</p>
                  
                  {/* Selection status */}
                  {selectionState === 'first-selected' && (
                    <p className="text-center text-xs mt-1 text-primary-600">
                      Select end date
                    </p>
                  )}
                </div>
                
                {/* Calendar */}
                <div className="p-3">
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-center text-xs text-gray-500">{day}</div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays().map((day, i) => {
                      const dateStr = day.date.toISOString().split('T')[0];
                      
                      // Determine if this date is part of the selected range
                      let isSelected = false;
                      let isStartDate = false;
                      let isEndDate = false;
                      let isInRange = false;
                      
                      if (selectionState === 'none') {
                        // Regular selection display
                        isStartDate = dateStr === dateRange.start;
                        isEndDate = dateStr === dateRange.end;
                        isInRange = dateStr >= dateRange.start && dateStr <= dateRange.end;
                        isSelected = isStartDate || isEndDate;
                      } else if (selectionState === 'first-selected') {
                        // During selection process
                        isStartDate = dateStr === tempStartDate;
                        isSelected = isStartDate;
                      }
                      
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      
                      // Determine special styling for start and end dates
                      let specialStyle = '';
                      if (isStartDate) {
                        specialStyle = 'bg-primary-600 text-white font-bold';
                        // If there's a range (not just a single day), add right spacing
                        if (dateRange.start !== dateRange.end) {
                          specialStyle += ' rounded-r-none';
                        }
                      } else if (isEndDate) {
                        specialStyle = 'bg-primary-600 text-white font-bold';
                        // If there's a range (not just a single day), add left spacing
                        if (dateRange.start !== dateRange.end) {
                          specialStyle += ' rounded-l-none';
                        }
                      } else if (isInRange) {
                        specialStyle = 'bg-primary-100 dark:bg-primary-900/30 rounded-none';
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => handleDateSelect(day.date)}
                          className={`h-8 w-8 text-xs flex items-center justify-center 
                            ${!day.isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : ''}
                            ${specialStyle}
                            ${!isSelected && !isInRange ? 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full' : ''}
                            ${isToday && !isSelected && !isInRange ? 'border border-primary-600 rounded-full' : ''}
                          `}
                          title={isStartDate ? "Start Date" : isEndDate ? "End Date" : ""}
                        >
                          {day.date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Quick Filters */}
                <div className="p-3 border-t dark:border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-500">Quick Filters</span>
                    {dateFilter === 'custom' && selectionState === 'none' && (
                      <span className="text-xs text-primary-500">Range selected</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => {
                        setDateFilterPeriod('day');
                        setSelectionState('none');
                        setTempStartDate(null);
                      }}
                      className={`px-2 py-1 text-xs rounded ${dateFilter === 'day' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => {
                        setDateFilterPeriod('week');
                        setSelectionState('none');
                        setTempStartDate(null);
                      }}
                      className={`px-2 py-1 text-xs rounded ${dateFilter === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                      This Week
                    </button>
                    <button 
                      onClick={() => {
                        setDateFilterPeriod('month');
                        setSelectionState('none');
                        setTempStartDate(null);
                      }}
                      className={`px-2 py-1 text-xs rounded ${dateFilter === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                      This Month
                    </button>
                    <button 
                      onClick={() => {
                        setDateFilterPeriod('year');
                        setSelectionState('none');
                        setTempStartDate(null);
                      }}
                      className={`px-2 py-1 text-xs rounded ${dateFilter === 'year' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                      This Year
                    </button>
                    <button 
                      onClick={() => {
                        setDateFilterPeriod('lifetime');
                        setSelectionState('none');
                        setTempStartDate(null);
                      }}
                      className={`px-2 py-1 text-xs rounded ${dateFilter === 'lifetime' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                      Lifetime
                    </button>
                    {selectionState === 'first-selected' && (
                      <button 
                        onClick={() => {
                          setSelectionState('none');
                          setTempStartDate(null);
                        }}
                        className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Share Button */}
          <button 
            onClick={generatePDF}
            disabled={generating}
            className={`btn ${generating ? 'btn-disabled' : 'btn-primary'} flex items-center space-x-2`}
          >
            {generating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                <span>Export Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
          <h2 className="text-lg font-medium mb-2">Income</h2>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totals.income)}</p>
        </div>
        <div className="card bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
          <h2 className="text-lg font-medium mb-2">Expenses</h2>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.totals.expenses)}</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-medium mb-2">Balance</h2>
          <p className={`text-2xl font-bold ${summary.totals.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(summary.totals.balance)}
          </p>
        </div>
        <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <h2 className="text-lg font-medium mb-2">Money Lent</h2>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(lentTotal)}</p>
          <Link to="/app/loans" className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block">
            Manage loans →
          </Link>
        </div>
        <div className="card bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
          <h2 className="text-lg font-medium mb-2">Money Borrowed</h2>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(borrowedTotal)}</p>
          <Link to="/app/loans" className="text-xs text-purple-600 hover:text-purple-800 mt-2 inline-block">
            Manage loans →
          </Link>
        </div>
      </div>

      {/* Charts and recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense categories chart */}
        <div className="card">
          <h2 className="text-lg font-medium mb-6">Expense Categories</h2>
          {summary.categories.length > 0 ? (
            <div className="flex justify-center items-center pt-4 h-80">
              <div className="w-3/4 h-full flex items-center justify-center">
                <Doughnut 
                  data={categoryData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    layout: {
                      padding: {
                        top: 20
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 text-gray-500">
              No expense data available for this period
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Recent Transactions</h2>
            <Link to="/app/transactions" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          
          {summary.recent.length > 0 ? (
            <div className="space-y-3">
              {summary.recent.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="font-medium">{transaction.description || transaction.category}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(transaction.date)}</p>
                  </div>
                  <p className={`font-medium ${
                    transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No transactions for this period
            </div>
          )}
        </div>
      </div>

      {/* Lending & Borrowing */}
      {(loans.lent.length > 0 || loans.borrowed.length > 0) && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Money Lending & Borrowing</h2>
            <Link to="/app/loans" className="text-sm text-primary-600 hover:text-primary-700">
              Manage all loans
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loans.lent.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Money You've Lent</h3>
                <div className="space-y-2">
                  {loans.lent.map(loan => (
                    <div key={loan.id} className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <div>
                        <p className="font-medium">{loan.person || 'Unnamed'}</p>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Loan Date: {formatDate(loan.date)}</p>
                        </div>
                      </div>
                      <p className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(loan.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {loans.borrowed.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Money You've Borrowed</h3>
                <div className="space-y-2">
                  {loans.borrowed.map(loan => (
                    <div key={loan.id} className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                      <div>
                        <p className="font-medium">{loan.person || 'Unnamed'}</p>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Loan Date: {formatDate(loan.date)}</p>
                        </div>
                      </div>
                      <p className="font-medium text-purple-600 dark:text-purple-400">{formatCurrency(loan.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Tips */}
      <div className="card bg-primary-50 dark:bg-gray-700 border border-primary-100 dark:border-gray-600">
        <h2 className="text-lg font-medium mb-2">AI Financial Tips</h2>
        <div className="space-y-2">
          {summary.categories.length > 0 && (
            <p className="text-sm">
              <span className="font-medium">💡 Tip:</span> Based on your spending, you could save more by reducing expenses in the {summary.categories[0]?.category || 'top'} category.
            </p>
          )}
          {summary.totals.balance < 0 && (
            <p className="text-sm">
              <span className="font-medium">⚠️ Alert:</span> Your expenses exceed your income for this period. Consider creating a budget to help manage your spending.
            </p>
          )}
          <p className="text-sm">
            <span className="font-medium">🎯 Goal:</span> Try to save at least 20% of your income each month for financial security.
          </p>
          {summary.totals.expenses > 0 && (
            <p className="text-sm">
              <span className="font-medium">📊 Analysis:</span> Your essential expenses account for approximately {Math.round((summary.totals.expenses * 0.6) / (summary.totals.income || 1) * 100)}% of your income during this period.
            </p>
          )}
          {borrowedTotal > 0 && (
            <p className="text-sm">
              <span className="font-medium">⏰ Reminder:</span> Don't forget to plan for your debt repayments of {formatCurrency(borrowedTotal)}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 