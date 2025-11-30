import React from 'react'
import { Link } from 'react-router-dom'

// Admin dashboard provides links to manage tenders and view applications
export default function AdminDashboard(){
  return (
    <div>
      <h2>Admin</h2>
      <div className="grid">
        <div className="card small">
          <h4>Manage Tenders</h4>
          <Link to="/admin/tenders" className="btn small">Open</Link>
        </div>
        <div className="card small">
          <h4>Manage Vendors</h4>
          <Link to="/admin/vendors" className="btn small">Open</Link>
        </div>
      </div>
    </div>
  )
}
