import React, { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'

// Login Page Component
// Handles user authentication, token storage, and redirection.
// Manages login form state, API communication, and error handling.

export default function Login(){
  // Form state for email and password inputs
  const [form, setForm] = useState({ email: '', password: '' })

  // Error state for displaying login failures
  const [error, setError] = useState('')

  // Navigation hook for programmatic routing
  const navigate = useNavigate()

  // Handle input field changes
  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  // Handle form submission and authentication
  const onSubmit = async e => {
    e.preventDefault(); setError('') // Prevent default form behavior and clear previous errors
    try{
      // Send login request to backend authentication endpoint
      const res = await api.post('/auth/login', form)

      // Store JWT token and user info in localStorage for persistence
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      // Redirect to home page after successful login
      navigate('/')
    }catch(err){
      // Display error message from backend or default message
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  // Render login form UI
  return (
    <div className="card form-card">
      {/* Page title */}
      <h2>Login</h2>

      {/* Error message display */}
      {error && <p className="error">{error}</p>}

      {/* Login form */}
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} />

        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={onChange} />

        {/* Submit button */}
        <button className="btn" type="submit">Login</button>
      </form>
    </div>
  )
}
