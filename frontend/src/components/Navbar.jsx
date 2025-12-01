import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// Navbar Component
// Handles navigation, responsive menu toggling, and conditional rendering based on user role/auth state.
export default function Navbar() {
  const navigate = useNavigate()
  // State to manage the mobile menu (hamburger) open/close status
  const [isOpen, setIsOpen] = useState(false)
  
  // Retrieve auth data from local storage
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  // Logout handler: clears session and redirects to login
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={() => setIsOpen(false)}>RealWork</Link>

        {/* Navigation Links - toggled via 'open' class on mobile */}
        <div className={`nav-links ${isOpen ? 'open' : ''}`}>
          <div className="nav-left">
            <Link to="/" onClick={() => setIsOpen(false)}>Tenders</Link>
            {/* Publisher-specific link */}
            {user && user.role === 'publisher' && (
              <Link to="/admin/tenders" onClick={() => setIsOpen(false)}>My Tenders</Link>
            )}
          </div>
          <div className="nav-right">
            {/* Guest Links */}
            {!token && <Link to="/login" onClick={() => setIsOpen(false)}>Login</Link>}
            {!token && <Link to="/register" onClick={() => setIsOpen(false)}>Register</Link>}

            {/* Vendor/Applicant Links */}
            {token && user?.role !== 'admin' && <Link to="/dashboard" onClick={() => setIsOpen(false)}>My Applications</Link>}
            {token && user?.role !== 'admin' && <Link to="/vendor" onClick={() => setIsOpen(false)}>Business Profile</Link>}

            {/* Admin Links */}
            {user && user.role === 'admin' && <Link to="/admin" onClick={() => setIsOpen(false)}>Admin</Link>}

            {/* Authenticated User Info & Logout */}
            {token && (
              <>
                <span className="user-name" style={{ marginLeft: 12, marginRight: 8 }}>{user?.name}</span>
                <button onClick={() => { logout(); setIsOpen(false); }} className="btn small">Logout</button>
              </>
            )}
          </div>
        </div>

        {/* Hamburger button for mobile view */}
        <button className="hamburger" onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </nav>
  )
}
