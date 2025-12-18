import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import Register from './pages/Register'
import Login from './pages/Login'
import TenderDetails from './pages/TenderDetails'
import ApplyForm from './pages/ApplyForm'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ManageTenders from './pages/ManageTenders'
import ViewApplications from './pages/ViewApplications'
import AdminVendorList from './pages/AdminVendorList'
import AdminVendorView from './pages/AdminVendorView'
import VendorProfile from './pages/VendorProfile'
import ProtectedRoute from './components/ProtectedRoute'

// App sets up routes for public, user and admin pages
// This is the main routing component that defines all application routes
// and wraps protected routes with authentication/authorization checks
export default function App() {
  return (
    <div className="app">
      {/* Global navigation bar */}
      <Navbar />
      <main className="container">
        <Routes>
          {/* Public routes accessible without authentication */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Tender viewing and application routes */}
          <Route path="/tenders/:id" element={<TenderDetails />} />
          <Route path="/apply/:id" element={<ProtectedRoute><ApplyForm /></ProtectedRoute>} />

          {/* User dashboard and profile management */}
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/vendor" element={<ProtectedRoute><VendorProfile /></ProtectedRoute>} />

          {/* Admin-only routes with role-based protection */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/tenders" element={<ProtectedRoute allowedRoles={['admin', 'publisher']}><ManageTenders /></ProtectedRoute>} />
          <Route path="/admin/tenders/:id/applications" element={<ProtectedRoute allowedRoles={['admin', 'publisher']}><ViewApplications /></ProtectedRoute>} />
          <Route path="/admin/vendors" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendorList /></ProtectedRoute>} />
          <Route path="/admin/vendors/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendorView /></ProtectedRoute>} />

          {/* Catch-all route redirects to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
