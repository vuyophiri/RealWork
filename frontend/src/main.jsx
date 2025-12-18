import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

// Main entry point for the React application
// This file initializes the React app with routing and renders it to the DOM
// Uses React 18's createRoot API for concurrent features and StrictMode for development checks

// Get the root DOM element and create React root
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter enables client-side routing with future flags for React Router v7 compatibility */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
