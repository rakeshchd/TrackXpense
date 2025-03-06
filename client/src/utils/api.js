import axios from "axios";

// const API_URL = "http://localhost:5000/api";
const API_URL = "https://trackxpense-backend.onrender.com/api";

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Log all API responses for debugging
api.interceptors.response.use(
  (response) => {
    console.log(
      `API Response [${response.config.method}] ${response.config.url}:`,
      response.data
    );
    return response;
  },
  (error) => {
    console.error("API Error:", error.response || error);
    return Promise.reject(error);
  }
);

// Auth API calls
export const login = (credentials) => api.post("/login", credentials);
export const register = (userData) => api.post("/register", userData);

// Transactions API calls
export const getTransactions = (dateRange = {}) => {
  // Add query parameters for date filtering if provided
  let url = "/transactions";

  if (dateRange.startDate && dateRange.endDate) {
    url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
  }

  return api.get(url);
};
export const addTransaction = (transaction) =>
  api.post("/transactions", transaction);

// Budget API calls
export const getBudgets = () => api.get("/budgets");
export const addBudget = (budget) => api.post("/budgets", budget);

// Loans API calls
export const getLoans = () => api.get("/loans");
export const addLoan = (loan) => api.post("/loans", loan);
export const settleLoan = (loanId) => api.put(`/loans/${loanId}/settle`);

// Subscriptions API calls
export const getSubscriptions = () => api.get("/subscriptions");
export const addSubscription = (subscription) =>
  api.post("/subscriptions", subscription);

// Analytics API calls
export const getSummary = (dateRange = {}) => {
  // Add query parameters for date filtering if provided
  let url = "/analytics/summary";

  if (dateRange.startDate && dateRange.endDate) {
    url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
  }

  return api.get(url);
};

// Notifications API calls
export const getNotifications = () => api.get("/notifications");
export const markNotificationAsRead = (notificationId) =>
  api.put(`/notifications/${notificationId}/read`);
export const markAllNotificationsAsRead = () =>
  api.put("/notifications/read-all");

export default api;
