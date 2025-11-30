import React, { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'

// Login Page Component
// Handles user authentication, token storage, and redirection.
export default function Login(){
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Update form state on input change
  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  // Handle form submission
  const onSubmit = async e => {
    e.preventDefault(); setError('')
    try{
      // Send login request to backend
      const res = await api.post('/auth/login', form)
      
      // Store JWT token and user info in localStorage for persistence
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      // Redirect to home page
      navigate('/')
    }catch(err){
      // Display error message from backend or default
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="card form-card">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} />
        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={onChange} />
        <button className="btn" type="submit">Login</button>
      </form>
    </div>
  )
}
