import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const NotFound = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setIsLoggedIn(!!(token && user));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <h1 className="text-6xl font-bold text-primary-600">404</h1>
      <p className="mt-4 text-xl text-gray-700 dark:text-gray-300">Page not found</p>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to={isLoggedIn ? "/app/dashboard" : "/"}
        className="mt-6 btn btn-primary"
      >
        Go back home
      </Link>
    </div>
  );
};

export default NotFound; 