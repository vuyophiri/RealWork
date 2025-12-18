// Axios API utility
// This module configures and exports an axios instance for making HTTP requests
// to the backend API with automatic token attachment and consistent base URL
import axios from 'axios'

// Define API base URL from environment variable or fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL + '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor to automatically attach JWT token if available
// This ensures authenticated requests include the authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
