import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'

// Shows details for a tender and offers an Apply button
export default function TenderDetails(){
  const { id } = useParams()
  const [tender, setTender] = useState(null)
    const [qualify, setQualify] = useState(null)

  useEffect(() => {
    api.get(`/tenders/${id}`).then(r => setTender(r.data)).catch(e => console.error(e))
  }, [id])
  
    // Check qualification status when both tender and user profile are available.
    // This logic compares the user's uploaded documents and professional registrations
    // against the tender's requirements (e.g., CIDB grade, specific docs).
    useEffect(() => {
      const check = async () => {
        const token = localStorage.getItem('token')
        if (!token) return setQualify(null)
        try{
          const [profRes, tenderRes] = await Promise.all([api.get('/vendors/me'), api.get(`/tenders/${id}`)])
          const profile = profRes.data
          const tender = tenderRes.data
          if (!profile) return setQualify({ qualifies: false, missing: ['profile'] })
          
          // Normalize strings to ignore case and special characters for better matching
          const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          const docs = (profile.documents||[]).map(d => normalize(d.type))
          const required = tender.requiredDocs || ['cipc','bbbee','csd']
          
          // Identify missing documents
          const missingDocs = required.filter(r => !docs.includes(normalize(r)))

          // Check professional registrations (e.g. ECSA, SACPCMP)
          const userRegs = profile.professionalRegistrations || []
          const userBodies = userRegs.map(r => (r.body||'').toLowerCase())
          const requiredBodies = (tender.professionalRequirements || []).map(r => r.toLowerCase())
          
          // If tender has CIDB grade requirement, ensure user has CIDB registration and sufficient grade
          if (tender.cidbGrade) {
            const userCidb = userRegs.find(r => (r.body||'').toLowerCase() === 'cidb')
            if (!userCidb) {
              requiredBodies.push('cidb registration')
            } else {
              // Parse CIDB grades (e.g. "7GB") into level (7) and type (GB)
              const parseCidb = (str) => {
                // Match digits, optional space, then letters. e.g. "7GB", "7 GB", "Grade 7GB"
                const match = (str || '').match(/(\d+)\s*([a-zA-Z]+)/)
                if (!match) return { level: 0, type: '' }
                return { level: parseInt(match[1]), type: match[2].toUpperCase() }
              }
              
              const reqGrade = parseCidb(tender.cidbGrade)
              const userGrade = parseCidb(userCidb.grade)
              
              if (userGrade.type !== reqGrade.type || userGrade.level < reqGrade.level) {
                requiredBodies.push(`CIDB Grade ${tender.cidbGrade} (You have ${userCidb.grade || 'none'})`)
              }
            }
          }

          const missingBodies = requiredBodies.filter(b => !userBodies.includes(b) && !b.startsWith('CIDB Grade') && b !== 'cidb registration')
          
          // Add specific CIDB errors if any
          if (requiredBodies.some(b => b.startsWith('CIDB Grade') || b === 'cidb registration')) {
             // Filter out generic 'cidb' if we have a specific error
             const specificCidbError = requiredBodies.find(b => b.startsWith('CIDB Grade') || b === 'cidb registration')
             if (specificCidbError) missingBodies.push(specificCidbError)
          }

          const missing = [...missingDocs, ...missingBodies]
          setQualify({ qualifies: missing.length === 0, missing })
        }catch(err){ console.error(err); setQualify(null) }
      }
      check()
    }, [id, tender])

  if (!tender) return <p>Loading...</p>

  return (
    <div className="card">
      <div className="top-row">
        <div>
          <h2 style={{ margin: 0 }}>{tender.title}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{tender.category} • {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'No deadline'}</p>
        </div>
        <div className="tender-meta-tags">
          {(tender.requiredDocs || []).map(d => <span className="tag" key={d}>{d.toUpperCase()}</span>)}
          <div style={{ marginTop: 6 }}>
            {qualify && (qualify.qualifies ? <span className="badge" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>Qualified</span> : <span className="badge" style={{ background: 'rgba(249,115,22,0.08)', color: '#ea580c' }}>Not Qualified</span>)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {tender.cidbGrade && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>CIDB Grade</span>
              <div style={{ fontWeight: '600' }}>{tender.cidbGrade}</div>
            </div>
          )}
          {tender.contractDuration && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Duration</span>
              <div style={{ fontWeight: '600' }}>{tender.contractDuration}</div>
            </div>
          )}
          {tender.siteInspectionDate && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Site Inspection</span>
              <div style={{ fontWeight: '600' }}>
                {new Date(tender.siteInspectionDate).toLocaleDateString()} 
                {tender.siteInspectionMandatory && <span className="tag warning" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>Mandatory</span>}
              </div>
            </div>
          )}
        </div>

        <p>{tender.description}</p>
        
        <h4>Requirements</h4>
        <p>{tender.requirements}</p>

        {qualify && !qualify.qualifies && qualify.missing && qualify.missing.length > 0 && (
          <div className="card small warning" style={{ marginTop: 16, marginBottom: 16 }}>
            <h4 style={{ color: '#c2410c', marginTop: 0 }}>Missing Qualifications</h4>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {qualify.missing.map((item, i) => (
                <li key={i} style={{ color: '#9a3412' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {tender.evaluationCriteria && tender.evaluationCriteria.length > 0 && (
          <>
            <h4>Evaluation Criteria</h4>
            <ul className="muted-list">
              {tender.evaluationCriteria.map((c, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '400px' }}>
                  <span>{c.criterion}</span>
                  <span className="tag">{c.weight}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <Link to={`/apply/${tender._id}`} className={`btn ${qualify && !qualify.qualifies ? 'disabled' : ''}`}>Apply</Link>
        <Link to="/" className="btn ghost">Back</Link>
      </div>
    </div>
  )
}
