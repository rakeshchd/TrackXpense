import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  CurrencyDollarIcon, 
  ChartPieIcon, 
  UserGroupIcon, 
  CalendarIcon,
  MoonIcon,
  SunIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ShareIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  CameraIcon,
  XCircleIcon,
  CreditCardIcon,
  BanknotesIcon,
  CalculatorIcon,
  ArrowPathRoundedSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../utils/api';

const MainLayout = ({ user, setUser }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    
    // Apply dark mode to document element
    if (savedMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load user profile data including photo
    const fetchUserProfile = async () => {
      try {
        // First try to load from localStorage as a quick display
        const savedPhoto = localStorage.getItem('userProfilePhoto');
        if (savedPhoto) {
          setProfilePhotoUrl(savedPhoto);
        }
        
        // Then fetch from API to ensure we have the latest
        setLoading(true);
        const response = await api.get('/user/profile');
        
        if (response.data && response.data.profile_photo) {
          setProfilePhotoUrl(response.data.profile_photo);
          // Update localStorage with the latest
          localStorage.setItem('userProfilePhoto', response.data.profile_photo);
        } else if (response.data && response.data.profile_photo === null && savedPhoto) {
          // If API returns null but we have a saved photo, clear it
          setProfilePhotoUrl('');
          localStorage.removeItem('userProfilePhoto');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // We already tried localStorage above, so no need to do it again
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
    fetchNotifications();

    // Add click outside handler for notifications dropdown
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Set up interval to check for new notifications every 5 minutes
    const notificationInterval = setInterval(fetchNotifications, 5 * 60 * 1000);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(notificationInterval);
    };
  }, []);

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await getNotifications();
      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Mark a notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: 1 } 
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, is_read: 1 }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Get unread notifications count
  const unreadCount = notifications.filter(notification => notification.is_read === 0).length;

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'subscription':
        return <CalendarIcon className="w-5 h-5 text-blue-500" />;
      case 'borrowed_money':
        return <CurrencyDollarIcon className="w-5 h-5 text-red-500" />;
      case 'lent_money':
        return <CurrencyDollarIcon className="w-5 h-5 text-green-500" />;
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    
    // Explicitly add or remove the class based on the new mode
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const shareWithParents = () => {
    // Create a shareable link or display a modal with sharing options
    const dashboardLink = window.location.origin;
    navigator.clipboard.writeText(dashboardLink)
      .then(() => {
        alert('Dashboard link copied! You can now share it with your parents.');
      })
      .catch(() => {
        alert('Failed to copy link. Please copy the URL manually.');
      });
  };

  const handleProfilePhotoClick = () => {
    setPhotoPickerOpen(true);
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.error('File is too large. Please select an image under 5MB.');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const newPhotoUrl = event.target.result;
        
        // Check if the base64 string is too large for the database
        if (newPhotoUrl.length > 2 * 1024 * 1024) { // Roughly 2MB as base64
          toast.error('Image is too large after encoding. Please choose a smaller image.');
          setLoading(false);
          return;
        }
        
        // Save to database via API
        const response = await api.put('/user/profile-photo', { photoData: newPhotoUrl });
        
        if (response && response.data) {
          // Update state and localStorage as fallback
          setProfilePhotoUrl(newPhotoUrl);
          localStorage.setItem('userProfilePhoto', newPhotoUrl);
          
          toast.success('Profile photo updated successfully!');
          setPhotoPickerOpen(false);
        }
      } catch (error) {
        console.error('Error updating profile photo:', error);
        
        // More specific error messages based on the error
        if (error.response) {
          if (error.response.status === 413) {
            toast.error('Image is too large. Please choose a smaller image.');
          } else if (error.response.data && error.response.data.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error('Failed to update profile photo. Please try again.');
          }
        } else if (error.request) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error('Failed to update profile photo. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read the selected file. Please try again.');
      setLoading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleSelectPhotoClick = () => {
    document.getElementById('photo-input').click();
  };

  const handleRemovePhoto = async () => {
    try {
      setLoading(true);
      await api.delete('/user/profile-photo');
      
      setProfilePhotoUrl('');
      localStorage.removeItem('userProfilePhoto');
      toast.success('Profile photo removed');
      setPhotoPickerOpen(false);
    } catch (error) {
      console.error('Error removing profile photo:', error);
      toast.error('Failed to remove profile photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: HomeIcon },
    { name: 'Expense Analytics', href: '/app/analytics', icon: ChartBarIcon },
    { name: 'Transactions', href: '/app/transactions', icon: CreditCardIcon },
    { name: 'Budget', href: '/app/budget', icon: BanknotesIcon },
    { name: 'Loans', href: '/app/loans', icon: CalculatorIcon },
    { name: 'Subscriptions', href: '/app/subscriptions', icon: ArrowPathRoundedSquareIcon },
  ];

  // Reminders based on user data
  const reminders = [
    { id: 1, title: 'Rent payment due', date: 'Tomorrow' },
    { id: 2, title: 'Netflix subscription renews', date: 'In 3 days' },
    { id: 3, title: 'Pay back $20 to Alex', date: 'Friday' }
  ];

  // Profile photo component for reuse
  const ProfilePhoto = ({ size = "md", onClick }) => {
    const sizes = {
      sm: "w-7 h-7",
      md: "w-8 h-8",
      lg: "w-10 h-10"
    };
    
    return (
      <div 
        className={`${sizes[size]} rounded-full overflow-hidden flex items-center justify-center bg-gray-200 dark:bg-gray-700 cursor-pointer`}
        onClick={onClick}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        ) : profilePhotoUrl ? (
          <img 
            src={profilePhotoUrl} 
            alt="User profile" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Handle image loading errors
              console.error('Error loading profile image');
              e.target.onerror = null; // Prevent infinite error loop
              e.target.src = ''; // Clear the src
              setProfilePhotoUrl(''); // Clear the state
              localStorage.removeItem('userProfilePhoto'); // Clear localStorage
            }}
          />
        ) : (
          <UserCircleIcon className="w-full h-full text-gray-600 dark:text-gray-300" />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* File input (hidden) */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        id="photo-input"
        accept="image/*"
        onChange={handleFileInputChange}
      />

      {/* Photo picker modal */}
      {photoPickerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Update Profile Photo</h3>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setPhotoPickerOpen(false)}
                disabled={loading}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 mb-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {loading ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                ) : profilePhotoUrl ? (
                  <img 
                    src={profilePhotoUrl} 
                    alt="User profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Error loading profile image in modal');
                      e.target.onerror = null;
                      e.target.src = '';
                    }}
                  />
                ) : (
                  <UserCircleIcon className="w-20 h-20 text-gray-400" />
                )}
              </div>
              
              <div className="space-y-3 w-full">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleSelectPhotoClick}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Select New Photo'}
                </button>
                
                {profilePhotoUrl && (
                  <button 
                    className="btn btn-error w-full" 
                    onClick={handleRemovePhoto}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Remove Photo'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Recommended: Square image, max 2MB</p>
              <p className="mt-1">Supported formats: JPEG, PNG, GIF</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary-600">TrackXpense</h1>
            <button onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 dark:bg-gray-700 dark:text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
          <div className="flex items-center h-16 px-4 border-b dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary-600">TrackXpense</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 dark:bg-gray-700 dark:text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              className="lg:hidden mr-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            {/* User profile info - left side */}
            <div className="flex items-center">
              <ProfilePhoto onClick={handleProfilePhotoClick} />
              <span className="text-sm font-medium ml-2">
                {user?.username || 'User'}
              </span>
            </div>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center space-x-2">
            {/* Share button */}
            <button
              onClick={shareWithParents}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Share with parents"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Notifications"
              >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-700">
                  <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-sm font-medium">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="p-4 text-center">
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start ${
                            notification.is_read === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="mr-3 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          {notification.is_read === 0 && (
                            <button 
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Mark as read"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <main className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;