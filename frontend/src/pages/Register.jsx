// Register Page Component
// Handles new user registration, including role selection (Bidder vs Advertiser).
// Manages registration form, validation, auto-login, and post-registration navigation.

import React, { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'

export default function Register(){
  // Default role is 'applicant' (Bidder) for new registrations
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'applicant' })

  // Error state for displaying registration failures
  const [error, setError] = useState('')

  // Navigation hook for programmatic routing
  const navigate = useNavigate()

  // Handle input field changes
  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  // Handle form submission and user registration
  const onSubmit = async e => {
    e.preventDefault()
    setError('')

    // Client-side validation for required fields and password length
    if (!form.name || !form.email || form.password.length < 6) return setError('Please provide name, email and a password of at least 6 chars')

    try{
      // Send registration request to backend
      const res = await api.post('/auth/register', form)

      // Auto-login after successful registration by storing auth data
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      // Redirect flow:
      // If user is a Vendor (applicant) or Publisher, guide them to complete their business profile.
      navigate('/vendor')
    }catch(err){
      setError(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="card form-card">
      {/* Page title */}
      <h2>Register</h2>

      {/* Error message display */}
      {error && <p className="error">{error}</p>}

      {/* Registration form */}
      <form onSubmit={onSubmit}>
        <label>Name</label>
        <input name="name" value={form.name} onChange={onChange} />

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} />

        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={onChange} />

        {/* Role Selection Dropdown */}
        <label>Register As</label>
        <select name="role" value={form.role} onChange={onChange}>
          <option value="applicant">Bidder (Apply for tenders)</option>
          <option value="publisher">Bid Advertiser (Post tenders)</option>
        </select>

        {/* Submit button */}
        <button className="btn" type="submit">Register</button>
      </form>
    </div>
  )
}