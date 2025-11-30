import React from 'react'
import { Navigate } from 'react-router-dom'

// ProtectedRoute wraps pages that need authentication.
// allowedRoles: array of roles permitted to access the route.
// adminOnly: legacy prop, equivalent to allowedRoles=['admin']
export default function ProtectedRoute({ children, adminOnly = false, allowedRoles = [] }) {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  
  if (!token) return <Navigate to="/login" />
  
  const permitted = allowedRoles.length > 0 ? allowedRoles : (adminOnly ? ['admin'] : [])
  
  if (permitted.length > 0 && (!user || !permitted.includes(user.role))) {
    return <Navigate to="/" />
  }
  
  return children
}
