import React, { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'

// Register Page Component
// Handles new user registration, including role selection (Bidder vs Advertiser).
export default function Register(){
  // Default role is 'applicant' (Bidder)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'applicant' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async e => {
    e.preventDefault()
    setError('')
    
    // Client-side validation
    if (!form.name || !form.email || form.password.length < 6) return setError('Please provide name, email and a password of at least 6 chars')
    
    try{
      // Send registration request
      const res = await api.post('/auth/register', form)
      
      // Auto-login after successful registration
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      // Redirect flow:
      // If user is a Vendor (applicant) or Publisher, guide them to complete their business profile
      navigate('/vendor')
    }catch(err){
      setError(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="card form-card">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
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
        
        <button className="btn" type="submit">Register</button>
      </form>
    </div>
  )
}
