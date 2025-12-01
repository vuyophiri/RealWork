import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

// Global variable to cache the PDF.js instance
let pdfjsInstance = null

/**
 * Dynamically loads the PDF.js library.
 * This is used for client-side parsing of uploaded PDF documents to extract text (e.g., for auto-filling fields).
 * It uses dynamic imports to avoid bloating the initial bundle size.
 */
const loadPdfJs = async () => {
  if (pdfjsInstance) return pdfjsInstance
  if (typeof window === 'undefined') throw new Error('PDF parsing is only available in the browser')
  const [{ GlobalWorkerOptions, getDocument }, workerModule] = await Promise.all([
    import('pdfjs-dist/build/pdf') /* webpackChunkName: "pdfjs" */,
    import('pdfjs-dist/build/pdf.worker.js?url')
  ])
  const workerSrc = workerModule.default || workerModule
  GlobalWorkerOptions.workerSrc = workerSrc
  pdfjsInstance = { getDocument }
  return pdfjsInstance
}

const REQUIRED_DOC_TYPES = ['cipc', 'bbbee', 'csd', 'taxClearance']
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const PROFESSIONAL_BODIES = [
  'CIDB',
  'ECSA',
  'SACPCMP',
  'SACAP',
  'SACQSP',
  'NHBRC',
  'EAPASA',
  'SAGC',
  'Other'
]
const EMPTY_PROFILE = {
  companyName: '',
  tradingName: '',
  registrationNumber: '',
  vatNumber: '',
  csdNumber: '',
  bbbeeLevel: '',
  phone: '',
  address: { street: '', city: '', postalCode: '' },
  directors: [],
  documents: [],
  professionalRegistrations: [],
  yearsExperience: '',
  completedProjects: '',
  coreCapabilities: [],
  industriesServed: [],
  metrics: {},
  autoExtracted: {}
}

const steps = [
  { id: 'basics', label: 'Company Basics', description: 'Identity & Registration' },
  { id: 'contact', label: 'Contact Details', description: 'Location & Communication' },
  { id: 'registrations', label: 'Registrations', description: 'Professional Bodies' },
  { id: 'governance', label: 'Governance', description: 'Directors & Ownership' },
  { id: 'documents', label: 'Compliance', description: 'Required Documents' },
  { id: 'review', label: 'Review', description: 'Confirm & Submit' }
]

const getValue = (obj, path) => {
  if (!path) return undefined
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }
  return current
}

const normaliseProfile = (data) => {
  if (!data) return { ...EMPTY_PROFILE }
  return {
    ...EMPTY_PROFILE,
    ...data,
    address: { ...EMPTY_PROFILE.address, ...(data.address || {}) },
    directors: Array.isArray(data.directors) ? data.directors : [],
    documents: Array.isArray(data.documents) ? data.documents : [],
    professionalRegistrations: Array.isArray(data.professionalRegistrations) ? data.professionalRegistrations : [],
    coreCapabilities: Array.isArray(data.coreCapabilities) ? data.coreCapabilities : [],
    industriesServed: Array.isArray(data.industriesServed) ? data.industriesServed : [],
    metrics: { ...EMPTY_PROFILE.metrics, ...(data.metrics || {}) },
    autoExtracted: { ...EMPTY_PROFILE.autoExtracted, ...(data.autoExtracted || {}) }
  }
}

async function extractPdfMetadata(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const { getDocument } = await loadPdfJs()
    const pdf = await getDocument({ data: arrayBuffer }).promise
    const info = await pdf.getMetadata()
    const textContent = []
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i)
      const text = await page.getTextContent()
      textContent.push(text.items.map(item => item.str).join(' '))
    }
    return {
      pageCount: pdf.numPages,
      info: info.info,
      textSample: textContent.join('\n').slice(0, 1000)
    }
  } catch (error) {
    console.error('PDF extraction failed:', error)
    return null
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('VendorProfile Error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">We encountered an error loading the vendor profile wizard.</p>
          <pre className="text-left bg-gray-100 p-4 rounded overflow-auto max-w-2xl mx-auto text-sm">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const validators = [
  (state) => {
    const errs = {}
    if (!state.companyName.trim()) errs.companyName = 'Company name is required'
    if (!state.registrationNumber.trim()) errs.registrationNumber = 'Registration number is required'
    if (!state.bbbeeLevel.trim()) errs.bbbeeLevel = 'B-BBEE level is required'
    if (!state.vatNumber.trim()) errs.vatNumber = 'VAT number is required'
    if (!state.csdNumber.trim()) errs.csdNumber = 'CSD number is required'
    return errs
  },
  (state) => {
    const errs = {}
    if (!state.phone.trim()) errs.phone = 'Phone number is required'
    if (!state.address.street.trim()) errs['address.street'] = 'Street address is required'
    if (!state.address.city.trim()) errs['address.city'] = 'City is required'
    if (!state.address.postalCode.trim()) errs['address.postalCode'] = 'Postal code is required'
    return errs
  },
  (state) => {
    const errs = {}
    if (!state.professionalRegistrations.length) {
      // Optional
    } else {
      state.professionalRegistrations.forEach((registration, index) => {
        if (!registration.body.trim()) errs[`registrations.${index}.body`] = 'Registration body is required'
        if (!registration.registrationNumber.trim()) errs[`registrations.${index}.registrationNumber`] = 'Registration number is required'
      })
    }
    return errs
  },
  (state) => {
    const errs = {}
    if (!state.directors.length) {
      errs.directors = 'Add at least one director'
    } else {
      state.directors.forEach((director, index) => {
        if (!director.name.trim()) errs[`directors.${index}.name`] = 'Director name is required'
        if (!director.idNumber.trim()) errs[`directors.${index}.idNumber`] = 'Director ID/Passport is required'
        if (!director.role.trim()) errs[`directors.${index}.role`] = 'Director role is required'
      })
    }
    return errs
  },
  (state) => {
    const errs = {}
    const docs = (state.documents || []).map(doc => (doc.type || '').toLowerCase())
    REQUIRED_DOC_TYPES.forEach(type => {
      if (!docs.includes(type.toLowerCase())) errs[`documents.${type}`] = `Upload your ${type.replace(/([A-Z])/g, ' $1').trim()} document`
    })
    if (state.vatNumber && !docs.includes('vatregistration')) {
      errs['documents.vatRegistration'] = 'Upload your VAT Registration document'
    }
    return errs
  },
  () => ({})
]

function VendorProfileContent() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ ...EMPTY_PROFILE })
  const [profileId, setProfileId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [docUploading, setDocUploading] = useState({})
  const [docPreviewing, setDocPreviewing] = useState(null)
  const [docDownloading, setDocDownloading] = useState(null)
  const [expiryDates, setExpiryDates] = useState({})
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    api.get('/vendors/me')
      .then(res => {
        const data = normaliseProfile(res.data)
        setDraft(data)
        setProfileId(res.data?._id || res.data?.id || data._id || null)
        setLoading(false)
        // If verified or pending, default to view mode (not editing)
        if (data.status === 'verified' || data.status === 'pending') {
          setIsEditing(false)
        } else {
          setIsEditing(true)
        }
      })
      .catch(err => {
        console.error(err)
        setDraft({ ...EMPTY_PROFILE })
        setLoading(false)
        setIsEditing(true)
      })
  }, [])

  const updateField = (path, value) => {
    setDraft(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      const parts = path.split('.')
      let cur = copy
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]
        cur[key] = cur[key] || {}
        cur = cur[key]
      }
      cur[parts[parts.length - 1]] = value
      return copy
    })
  }

  const addDirector = () => {
    setDraft(prev => ({ ...prev, directors: [...prev.directors, { name: '', idNumber: '', role: '' }] }))
  }

  const resolveDocumentEndpoint = (doc) => {
    if (doc?.url) {
      const raw = doc.url.startsWith('http') ? doc.url.replace(API_BASE, '') : doc.url
      return raw.replace(/^\/?api\//, '')
    }
    const fallbackId = doc?.profileId || profileId
    if (doc?.filename && fallbackId) {
      return `vendors/${fallbackId}/documents/${doc.filename}/download`
    }
    throw new Error('Document URL unavailable')
  }

  const inferMimeType = (doc, fallback) => {
    const declared = doc?.mimeType || doc?.contentType
    if (declared) return declared
    const fromResponse = (fallback || '').split(';')[0].trim()
    if (fromResponse) return fromResponse
    const extension = (doc?.filename || '').split('.').pop()?.toLowerCase()
    if (!extension) return 'application/octet-stream'
    const map = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml'
    }
    return map[extension] || 'application/octet-stream'
  }

  const preferredFilename = (doc, mimeType) => {
    if (doc?.filename) return doc.filename
    if (!mimeType) return `${doc?.type || 'document'}`
    const map = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/webp': 'webp',
      'image/svg+xml': 'svg'
    }
    const ext = map[mimeType] || 'bin'
    return `${doc?.type || 'document'}.${ext}`
  }

  const [previewData, setPreviewData] = useState(null)

  useEffect(() => {
    if (!previewData?.url || typeof window === 'undefined') return
    return () => {
      window.URL.revokeObjectURL(previewData.url)
    }
  }, [previewData])

  useEffect(() => {
    if (!previewData || typeof window === 'undefined') return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewData(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewData])

  const closePreview = () => setPreviewData(null)

  const describeMissingFile = (doc) => {
    const kind = doc?.type ? doc.type.toUpperCase() : 'Document'
    return `${kind} is missing on the server. Please upload a fresh copy using the Update button.`
  }

  const isLegacyPlaceholder = (doc) => (!doc?.url || doc.url === '#') && !doc?.mimeType

  const handleViewDocument = async (doc) => {
    if (!doc) return
    try {
      setDocPreviewing(doc.filename)
      const endpoint = resolveDocumentEndpoint(doc)
      const response = await api.get(endpoint, { responseType: 'blob' })
      const mimeType = inferMimeType(doc, response.headers['content-type'])
      const blob = new Blob([response.data], { type: mimeType })
      const objectUrl = window.URL.createObjectURL(blob)
      const viewType = mimeType?.includes('pdf') ? 'pdf' : mimeType?.startsWith('image/') ? 'image' : 'unsupported'

      if (viewType === 'unsupported') {
        const fallbackWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer')
        if (!fallbackWindow && typeof document !== 'undefined') {
          const fallbackLink = document.createElement('a')
          fallbackLink.href = objectUrl
          fallbackLink.target = '_blank'
          document.body.appendChild(fallbackLink)
          fallbackLink.click()
          document.body.removeChild(fallbackLink)
        }
        setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000)
        return
      }

  setPreviewData({ url: objectUrl, mimeType, filename: doc.filename, type: viewType, doc })
    } catch (err) {
      console.error(err)
      const status = err.response?.status
      if (status === 404) {
        alert(describeMissingFile(doc))
      } else if (status === 401 || status === 403) {
        alert('Please sign in again to view this document.')
      } else {
        alert('Unable to open the document preview. Please try downloading the file instead.')
      }
    } finally {
      setDocPreviewing(null)
    }
  }

  const handleDownloadDocument = async (doc) => {
    if (!doc) return
    try {
      setDocDownloading(doc.filename)
      const endpoint = resolveDocumentEndpoint(doc)
      const response = await api.get(endpoint, { responseType: 'blob' })
      const mimeType = inferMimeType(doc, response.headers['content-type'])
      const blob = new Blob([response.data], { type: mimeType })
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = preferredFilename(doc, mimeType)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000)
    } catch (err) {
      console.error(err)
      const status = err.response?.status
      if (status === 404) {
        alert(describeMissingFile(doc))
      } else if (status === 401 || status === 403) {
        alert('Please sign in again to download this document.')
      } else {
        alert('Download failed. Please try again.')
      }
    } finally {
      setDocDownloading(null)
    }
  }

  const updateDirector = (index, key, value) => {
    setDraft(prev => {
      const directors = prev.directors.map((director, i) => i === index ? { ...director, [key]: value } : director)
      return { ...prev, directors }
    })
  }

  const removeDirector = (index) => {
    setDraft(prev => {
      const directors = prev.directors.filter((_, i) => i !== index)
      return { ...prev, directors }
    })
  }

  const addRegistration = () => {
    setDraft(prev => ({
      ...prev,
      professionalRegistrations: [...prev.professionalRegistrations, { body: '', registrationNumber: '', grade: '', expiry: '' }]
    }))
  }

  const updateRegistration = (index, key, value) => {
    setDraft(prev => {
      const professionalRegistrations = prev.professionalRegistrations.map((registration, i) =>
        i === index ? { ...registration, [key]: value } : registration
      )
      return { ...prev, professionalRegistrations }
    })
  }

  const removeRegistration = (index) => {
    setDraft(prev => {
      const professionalRegistrations = prev.professionalRegistrations.filter((_, i) => i !== index)
      return { ...prev, professionalRegistrations }
    })
  }

  const updateListField = (field, value) => {
    setDraft(prev => ({
      ...prev,
      [field]: value.split(',').map(item => item.trim()).filter(Boolean)
    }))
  }

  const validateStep = (index) => {
    if (index >= 0 && index < validators.length) {
      const validator = validators[index]
      if (typeof validator === 'function') {
        return validator(draft)
      }
    }
    return {}
  }

  const validateAll = () => {
    const aggregateErrors = {}
    let firstInvalidStep = null
    validators.forEach((validator, index) => {
      if (typeof validator !== 'function') return
      const result = validator(draft)
      if (Object.keys(result).length) {
        Object.assign(aggregateErrors, result)
        if (firstInvalidStep === null) firstInvalidStep = index
      }
    })
    return { firstInvalidStep, errors: aggregateErrors }
  }

  const saveProgress = async ({ statusOverride, silent } = {}) => {
    setSaving(true)
    if (!silent) setMessage('')
    try {
      const payload = {
        ...draft,
        status: statusOverride || draft.status || 'draft',
        yearsExperience: draft.yearsExperience === '' ? null : Number(draft.yearsExperience),
        completedProjects: draft.completedProjects === '' ? null : Number(draft.completedProjects),
        professionalRegistrations: draft.professionalRegistrations.map(reg => ({
          ...reg,
          expiry: reg.expiry || null
        })),
        coreCapabilities: draft.coreCapabilities.filter(Boolean),
        industriesServed: draft.industriesServed.filter(Boolean)
      }
      const res = await api.post('/vendors', payload)
      const data = normaliseProfile(res.data)
      setDraft(data)
      setProfileId(res.data?._id || data._id || profileId)
      if (!silent) setMessage(statusOverride === 'pending' ? 'Submitted for verification' : 'Progress saved')
      return res.data
    } catch (err) {
      console.error(err)
      const feedback = err.response?.data?.message || 'Could not save profile'
      setMessage(feedback)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const ensureProfileExists = async () => {
    if (profileId) return profileId
    
    const v0 = typeof validators[0] === 'function' ? validators[0](draft) : {};
    const v1 = typeof validators[1] === 'function' ? validators[1](draft) : {};
    const v2 = typeof validators[2] === 'function' ? validators[2](draft) : {};
    const earlyErrors = { ...v0, ...v1, ...v2 }

    if (Object.keys(earlyErrors).length) {
      setErrors(earlyErrors)
      setActiveStep(0)
      throw new Error('Complete company details before uploading documents')
    }
    const saved = await saveProgress({ silent: true })
    const newId = saved?._id
    if (!newId) throw new Error('Profile ID missing after save')
    setProfileId(newId)
    return newId
  }

  const handleNext = async () => {
    const stepErrors = validateStep(activeStep)
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
  if (activeStep <= 3) {
      try {
        await saveProgress({ silent: true })
      } catch {
        return
      }
    }
    setActiveStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setErrors({})
    setActiveStep(prev => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (status) => {
    const { firstInvalidStep, errors: allErrors } = validateAll()
    if (firstInvalidStep !== null) {
      setErrors(allErrors)
      setActiveStep(firstInvalidStep)
      window.scrollTo(0, 0)
      return
    }
    try {
      await saveProgress({ statusOverride: status })
      if (status === 'pending') {
        setSubmitted(true)
        window.scrollTo(0, 0)
      }
    } catch (err) {
      window.scrollTo(0, 0)
    }
  }

  const handleDocumentUpload = async (type, file) => {
    if (!file) return
    try {
      setDocUploading(prev => ({ ...prev, [type]: 'Uploading...' }))
      const id = await ensureProfileExists()
      if (file.type === 'application/pdf') {
        const insights = await extractPdfMetadata(file)
        if (insights.registrationNumber && !draft.registrationNumber) updateField('registrationNumber', insights.registrationNumber)
        if (insights.csdNumber && !draft.csdNumber) updateField('csdNumber', insights.csdNumber)
        if (insights.bbbeeLevel && !draft.bbbeeLevel) updateField('bbbeeLevel', insights.bbbeeLevel)
        setDraft(prev => ({ ...prev, autoExtracted: { ...prev.autoExtracted, ...insights } }))
      }
      const form = new FormData()
      form.append('file', file)
      form.append('type', type)
      if (expiryDates[type]) {
        form.append('expiryDate', expiryDates[type])
      }
      await api.post(`/vendors/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const refreshed = await api.get('/vendors/me')
      setDraft(normaliseProfile(refreshed.data))
      setDocUploading(prev => ({ ...prev, [type]: 'Uploaded' }))
    } catch (err) {
      console.error(err)
      setDocUploading(prev => ({ ...prev, [type]: 'Failed' }))
    }
  }

  const documentsByType = useMemo(() => {
    const map = {};
    (draft.documents || []).forEach(doc => {
      map[(doc.type || '').toLowerCase()] = doc
    })
    return map
  }, [draft.documents])

  const formatFieldLabel = (field) => field
    .split('.')
    .map(part => part.replace(/([A-Z])/g, ' $1'))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  if (loading) return <p>Loading...</p>

  const previewOverlay = previewData ? (
    <div className="preview-overlay" role="dialog" aria-modal="true" onClick={closePreview}>
      <div className="preview-container" onClick={event => event.stopPropagation()}>
        <div className="preview-header">
          <div>
            <h3>Document Preview</h3>
            <p className="muted" style={{ fontSize: '0.85rem' }}>{previewData.filename || 'Document'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {previewData.doc && (
              <button
                type="button"
                className="btn tiny ghost"
                onClick={() => handleDownloadDocument(previewData.doc)}
                disabled={docDownloading === previewData.doc.filename}
              >
                {docDownloading === previewData.doc.filename ? 'Saving…' : 'Download'}
              </button>
            )}
            <button type="button" className="btn tiny outline" onClick={closePreview}>Close</button>
          </div>
        </div>
        <div className="preview-body">
          {previewData.type === 'pdf' && (
            <iframe src={previewData.url} title="PDF preview" allowFullScreen />
          )}
          {previewData.type === 'image' && (
            <img src={previewData.url} alt={previewData.filename || 'Document preview'} />
          )}
          {previewData.type !== 'pdf' && previewData.type !== 'image' && (
            <p className="muted">Preview unavailable for this file type. Please download the document instead.</p>
          )}
        </div>
      </div>
    </div>
  ) : null

  if (submitted) {
    return (
      <>
        {previewOverlay}
        <div className="card form-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2>Application Submitted</h2>
          <p className="muted" style={{ maxWidth: 400, margin: '0 auto 24px' }}>
            Your vendor profile has been submitted for verification. We will notify you once the review is complete.
          </p>
          <button className="btn" onClick={() => navigate('/')}>Return to Home</button>
        </div>
      </>
    )
  }

  if (!isEditing && (draft.status === 'verified' || draft.status === 'pending')) {
    return (
      <>
        {previewOverlay}
        <div className="card form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2>My Business Profile</h2>
            {draft.status === 'verified' ? (
              <span className="badge success">Verified</span>
            ) : (
              <span className="badge warning">Under Review</span>
            )}
          </div>

          <div className="grid two-col">
            <div>
              <h4 className="muted">Company Details</h4>
              <p><strong>{draft.companyName}</strong></p>
              <p className="muted">{draft.tradingName}</p>
              <p>Reg: {draft.registrationNumber}</p>
              <p>VAT: {draft.vatNumber}</p>
              <p>CSD: {draft.csdNumber}</p>
              <p>B-BBEE Level: {draft.bbbeeLevel}</p>
            </div>
            <div>
              <h4 className="muted">Contact</h4>
              <p>{draft.phone}</p>
              <p>{draft.address.street}</p>
              <p>{draft.address.city}, {draft.address.postalCode}</p>
            </div>
          </div>

          <h4 className="muted" style={{ marginTop: 24 }}>Directors</h4>
          <div className="list">
            {draft.directors.map((d, i) => (
              <div key={i} className="card small">
                <strong>{d.name}</strong> • {d.role}
              </div>
            ))}
          </div>

          {draft.professionalRegistrations && draft.professionalRegistrations.length > 0 && (
            <>
              <h4 className="muted" style={{ marginTop: 24 }}>Professional Registrations</h4>
              <div className="list">
                {draft.professionalRegistrations.map((reg, i) => (
                  <div key={i} className="card small">
                    <strong>{reg.body}</strong>
                    {reg.grade && <span className="tag" style={{ marginLeft: 8 }}>{reg.grade}</span>}
                    <p className="muted">Reg: {reg.registrationNumber}</p>
                    {reg.expiry && <p className="muted">Expires: {reg.expiry.slice(0, 10)}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          <h4 className="muted" style={{ marginTop: 24 }}>Documents</h4>
          <div className="document-grid">
            {draft.documents.map((doc, i) => (
              <div key={i} className="card small">
                <strong>{doc.type.toUpperCase()}</strong>
                <p className="muted doc-filename">{doc.filename}</p>
                {doc.expiryDate && (
                  <p className={new Date(doc.expiryDate) < new Date() ? 'error-text' : 'muted'}>
                    Expires: {doc.expiryDate.slice(0, 10)} {new Date(doc.expiryDate) < new Date() && '(Expired)'}
                  </p>
                )}
                {isLegacyPlaceholder(doc) && (
                  <p className="error-text" style={{ fontSize: '0.75rem' }}>
                    Preview unavailable. Upload a new copy to replace this placeholder record.
                  </p>
                )}
                {docUploading[doc.type] && (
                  <p className="muted" style={{ fontSize: '0.8rem' }}>{docUploading[doc.type]}</p>
                )}
                <div className="document-actions">
                  <button
                    className="btn tiny"
                    onClick={() => handleViewDocument(doc)}
                    disabled={isLegacyPlaceholder(doc) || docPreviewing === doc.filename}
                  >
                    {docPreviewing === doc.filename ? 'Opening…' : 'View'}
                  </button>
                  <button
                    className="btn tiny ghost"
                    onClick={() => handleDownloadDocument(doc)}
                    disabled={isLegacyPlaceholder(doc) || docDownloading === doc.filename}
                  >
                    {docDownloading === doc.filename ? 'Saving…' : 'Download'}
                  </button>
                  <label className="btn tiny outline" style={{ cursor: 'pointer' }}>
                    Update
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const nextFile = e.target.files?.[0]
                        if (nextFile) handleDocumentUpload(doc.type, nextFile)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 24 }}>
            <button 
              className="btn outline" 
              onClick={() => {
                if (window.confirm('Updating your details will require re-verification. Your profile status will change to "Pending" until approved. Continue?')) {
                  setIsEditing(true)
                }
              }}
            >
              Update My Details
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {previewOverlay}
      <div className="card form-card">
      <h2>{isEditing && draft.status === 'verified' ? 'Update Profile' : 'Business Profile Wizard'}</h2>
      {message && <p className="muted" style={{ marginBottom: 16 }}>{message}</p>}

      <div className="wizard-steps">
        {steps.map((step, index) => (
          <div key={step.id} className={`wizard-step ${index === activeStep ? 'active' : index < activeStep ? 'complete' : ''}`}>
            <span className="wizard-index">{index + 1}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <div className="wizard-body">
        {activeStep === 0 && (
          <section>
            <label>Company Name</label>
            <input value={draft.companyName} onChange={e => updateField('companyName', e.target.value)} />
            {errors.companyName && <p className="error-text">{errors.companyName}</p>}

            <label>Trading Name</label>
            <input value={draft.tradingName} onChange={e => updateField('tradingName', e.target.value)} />

            <label>Registration Number (CIPC)</label>
            <input value={draft.registrationNumber} onChange={e => updateField('registrationNumber', e.target.value)} />
            {errors.registrationNumber && <p className="error-text">{errors.registrationNumber}</p>}

            <label>VAT Number</label>
            <input value={draft.vatNumber} onChange={e => updateField('vatNumber', e.target.value)} />
            {errors.vatNumber && <p className="error-text">{errors.vatNumber}</p>}

            <label>CSD Number</label>
            <input value={draft.csdNumber} onChange={e => updateField('csdNumber', e.target.value)} />
            {errors.csdNumber && <p className="error-text">{errors.csdNumber}</p>}

            <label>B-BBEE Level</label>
            <input value={draft.bbbeeLevel} onChange={e => updateField('bbbeeLevel', e.target.value)} />
            {errors.bbbeeLevel && <p className="error-text">{errors.bbbeeLevel}</p>}
          </section>
        )}

        {activeStep === 1 && (
          <section>
            <label>Phone</label>
            <input value={draft.phone} onChange={e => updateField('phone', e.target.value)} />
            {errors.phone && <p className="error-text">{errors.phone}</p>}

            <label>Street</label>
            <input value={draft.address.street} onChange={e => updateField('address.street', e.target.value)} />
            {errors['address.street'] && <p className="error-text">{errors['address.street']}</p>}

            <label>City</label>
            <input value={draft.address.city} onChange={e => updateField('address.city', e.target.value)} />
            {errors['address.city'] && <p className="error-text">{errors['address.city']}</p>}

            <label>Postal Code</label>
            <input value={draft.address.postalCode} onChange={e => updateField('address.postalCode', e.target.value)} />
            {errors['address.postalCode'] && <p className="error-text">{errors['address.postalCode']}</p>}
          </section>
        )}

        {activeStep === 2 && (
          <section>
            <h4 style={{ marginTop: 12 }}>Professional registrations</h4>
            <p className="muted">Add any professional bodies you are registered with (e.g. CIDB, ECSA, SACPCMP).</p>
            {errors.professionalRegistrations && <p className="error-text">{errors.professionalRegistrations}</p>}
            <div className="list">
              {draft.professionalRegistrations.map((registration, index) => (
                <div key={index} className="card small">
                  <label>Body</label>
                  <select 
                    value={PROFESSIONAL_BODIES.includes(registration.body) && registration.body !== 'Other' ? registration.body : (registration.body ? 'Other' : '')} 
                    onChange={e => updateRegistration(index, 'body', e.target.value)}
                  >
                    <option value="">Select Body</option>
                    {PROFESSIONAL_BODIES.map(body => (
                      <option key={body} value={body}>{body}</option>
                    ))}
                  </select>
                  {(registration.body === 'Other' || (registration.body && !PROFESSIONAL_BODIES.includes(registration.body))) && (
                    <input 
                      placeholder="Enter professional body name"
                      style={{ marginTop: 8 }}
                      value={registration.body === 'Other' ? '' : registration.body} 
                      onChange={e => updateRegistration(index, 'body', e.target.value)} 
                    />
                  )}
                  {errors[`registrations.${index}.body`] && <p className="error-text">{errors[`registrations.${index}.body`]}</p>}

                  <label>Registration number</label>
                  <input value={registration.registrationNumber} onChange={e => updateRegistration(index, 'registrationNumber', e.target.value)} />
                  {errors[`registrations.${index}.registrationNumber`] && <p className="error-text">{errors[`registrations.${index}.registrationNumber`]}</p>}

                  <label>Grade / Level (Optional)</label>
                  <input 
                    placeholder="e.g. 7GB, Level 1, PrEng"
                    value={registration.grade || ''} 
                    onChange={e => updateRegistration(index, 'grade', e.target.value)} 
                  />

                  <label>Expiry date</label>
                  <input type="date" value={registration.expiry ? registration.expiry.slice(0, 10) : ''} onChange={e => updateRegistration(index, 'expiry', e.target.value)} />

                  <button type="button" className="btn small danger" onClick={() => removeRegistration(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn small" onClick={addRegistration}>Add Registration</button>
          </section>
        )}

        {activeStep === 3 && (
          <section>
            <div className="list">
              {draft.directors.map((director, index) => (
                <div key={index} className="card small">
                  <label>Name</label>
                  <input value={director.name} onChange={e => updateDirector(index, 'name', e.target.value)} />
                  {errors[`directors.${index}.name`] && <p className="error-text">{errors[`directors.${index}.name`]}</p>}

                  <label>ID/Passport</label>
                  <input value={director.idNumber} onChange={e => updateDirector(index, 'idNumber', e.target.value)} />
                  {errors[`directors.${index}.idNumber`] && <p className="error-text">{errors[`directors.${index}.idNumber`]}</p>}

                  <label>Role</label>
                  <input value={director.role} onChange={e => updateDirector(index, 'role', e.target.value)} />
                  {errors[`directors.${index}.role`] && <p className="error-text">{errors[`directors.${index}.role`]}</p>}

                  <button type="button" className="btn small danger" onClick={() => removeDirector(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn small" onClick={addDirector}>Add Director</button>
            {errors.directors && <p className="error-text">{errors.directors}</p>}
          </section>
        )}

        {activeStep === 4 && (
          <section>
            <p className="muted">Upload each required compliance document. We will auto-scan PDFs and pre-fill matching fields.</p>
            <div className="document-grid">
              {REQUIRED_DOC_TYPES.map(type => {
                const doc = documentsByType[type.toLowerCase()]
                return (
                  <div key={type} className="card small">
                    <h4 style={{ marginBottom: 4 }}>{type.replace(/([A-Z])/g, ' $1').toUpperCase()}</h4>
                    {doc ? (
                      <div style={{ marginBottom: 8 }}>
                        <p className="text-success" style={{ fontWeight: 500 }}>✓ {doc.filename}</p>
                        {doc.verified && <span className="badge success">Verified</span>}
                        {doc.expiryDate && <p className="muted" style={{ fontSize: '0.8rem' }}>Expires: {doc.expiryDate.slice(0, 10)}</p>}
                        {isLegacyPlaceholder(doc) && (
                          <p className="error-text" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                            Preview unavailable. Upload a new copy to replace this placeholder record.
                          </p>
                        )}
                        {docUploading[type] && (
                          <p className="muted" style={{ fontSize: '0.75rem' }}>{docUploading[type]}</p>
                        )}
                        <div className="document-actions" style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn tiny"
                            onClick={() => handleViewDocument(doc)}
                            disabled={isLegacyPlaceholder(doc) || docPreviewing === doc.filename}
                          >
                            {docPreviewing === doc.filename ? 'Opening…' : 'View'}
                          </button>
                          <button
                            type="button"
                            className="btn tiny ghost"
                            onClick={() => handleDownloadDocument(doc)}
                            disabled={isLegacyPlaceholder(doc) || docDownloading === doc.filename}
                          >
                            {docDownloading === doc.filename ? 'Saving…' : 'Download'}
                          </button>
                          <label className="btn tiny outline" style={{ cursor: 'pointer' }}>
                            Replace
                            <input
                              type="file"
                              style={{ display: 'none' }}
                              onChange={e => {
                                const nextFile = e.target.files?.[0]
                                if (nextFile) handleDocumentUpload(type, nextFile)
                                e.target.value = ''
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <p className="muted" style={{ marginBottom: 8 }}>No document uploaded</p>
                    )}
                    
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Expiry Date</label>
                      <input 
                        type="date" 
                        value={expiryDates[type] || ''} 
                        onChange={e => setExpiryDates(prev => ({ ...prev, [type]: e.target.value }))}
                        style={{ width: '100%', padding: '4px 8px' }}
                      />
                    </div>

                    {docUploading[type] ? (
                       <p className="muted">{docUploading[type]}</p>
                    ) : (
                       doc ? (
                         <label className="btn small outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
                           Replace File
                           <input type="file" style={{ display: 'none' }} onChange={e => handleDocumentUpload(type, e.target.files?.[0])} />
                         </label>
                       ) : (
                         <input type="file" onChange={e => handleDocumentUpload(type, e.target.files?.[0])} />
                       )
                    )}
                    {errors[`documents.${type}`] && <p className="error-text">{errors[`documents.${type}`]}</p>}
                  </div>
                )
              })}
              {draft.vatNumber && (
                <div className="card small">
                  <h4 style={{ marginBottom: 4 }}>VAT REGISTRATION</h4>
                  {documentsByType['vatregistration'] ? (
                    <div style={{ marginBottom: 8 }}>
                      <p className="text-success" style={{ fontWeight: 500 }}>✓ {documentsByType['vatregistration'].filename}</p>
                      {documentsByType['vatregistration'].verified && <span className="badge success">Verified</span>}
                      {documentsByType['vatregistration'].expiryDate && <p className="muted" style={{ fontSize: '0.8rem' }}>Expires: {documentsByType['vatregistration'].expiryDate.slice(0, 10)}</p>}
                      {isLegacyPlaceholder(documentsByType['vatregistration']) && (
                        <p className="error-text" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                          Preview unavailable. Upload a new copy to replace this placeholder record.
                        </p>
                      )}
                      {docUploading['vatRegistration'] && (
                        <p className="muted" style={{ fontSize: '0.75rem' }}>{docUploading['vatRegistration']}</p>
                      )}
                      <div className="document-actions" style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="btn tiny"
                          onClick={() => handleViewDocument(documentsByType['vatregistration'])}
                          disabled={isLegacyPlaceholder(documentsByType['vatregistration']) || docPreviewing === documentsByType['vatregistration'].filename}
                        >
                          {docPreviewing === documentsByType['vatregistration'].filename ? 'Opening…' : 'View'}
                        </button>
                        <button
                          type="button"
                          className="btn tiny ghost"
                          onClick={() => handleDownloadDocument(documentsByType['vatregistration'])}
                          disabled={isLegacyPlaceholder(documentsByType['vatregistration']) || docDownloading === documentsByType['vatregistration'].filename}
                        >
                          {docDownloading === documentsByType['vatregistration'].filename ? 'Saving…' : 'Download'}
                        </button>
                        <label className="btn tiny outline" style={{ cursor: 'pointer' }}>
                          Replace
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const nextFile = e.target.files?.[0]
                              if (nextFile) handleDocumentUpload('vatRegistration', nextFile)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <p className="muted" style={{ marginBottom: 8 }}>No document uploaded</p>
                  )}
                  
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Expiry Date</label>
                    <input 
                      type="date" 
                      value={expiryDates['vatRegistration'] || ''} 
                      onChange={e => setExpiryDates(prev => ({ ...prev, vatRegistration: e.target.value }))}
                      style={{ width: '100%', padding: '4px 8px' }}
                    />
                  </div>

                  {docUploading['vatRegistration'] ? (
                     <p className="muted">{docUploading['vatRegistration']}</p>
                  ) : (
                     documentsByType['vatregistration'] ? (
                       <label className="btn small outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
                         Replace File
                         <input type="file" style={{ display: 'none' }} onChange={e => handleDocumentUpload('vatRegistration', e.target.files?.[0])} />
                       </label>
                     ) : (
                       <input type="file" onChange={e => handleDocumentUpload('vatRegistration', e.target.files?.[0])} />
                     )
                  )}
                  {errors['documents.vatRegistration'] && <p className="error-text">{errors['documents.vatRegistration']}</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {activeStep === 5 && (
          <section>
            <h3>Review & Quality Checks</h3>
            <div className="metrics">
              <div className="metric-row">
                <span>Profile completeness</span>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${Math.round((draft.metrics?.completeness || 0) * 100)}%` }}></div>
                </div>
                <span className="muted">{Math.round((draft.metrics?.completeness || 0) * 100)}%</span>
              </div>
              <div className="metric-row">
                <span>Document coverage</span>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${Math.round((draft.metrics?.documentCoverage || 0) * 100)}%` }}></div>
                </div>
                <span className="muted">{Math.round((draft.metrics?.documentCoverage || 0) * 100)}%</span>
              </div>
            </div>

            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Professional Registrations</h4>
            {draft.professionalRegistrations?.length > 0 ? (
              <div className="list">
                {draft.professionalRegistrations.map((reg, i) => (
                  <div key={i} className="card small" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{reg.body}</strong>
                      <span className="muted" style={{ marginLeft: 8 }}>{reg.registrationNumber}</span>
                    </div>
                    {reg.expiry && <span className="muted">Exp: {reg.expiry.slice(0, 10)}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No professional registrations added.</p>
            )}

            {draft.metrics?.missingFields?.length ? (
              <div className="card small warning">
                <h4>Missing details</h4>
                <ul>
                  {draft.metrics.missingFields.map(field => <li key={field}>{formatFieldLabel(field)}</li>)}
                </ul>
              </div>
            ) : <p className="muted">All core fields captured.</p>}

            {draft.metrics?.missingDocs?.length ? (
              <div className="card small warning">
                <h4>Missing documents</h4>
                <ul>
                  {draft.metrics.missingDocs.map(doc => <li key={doc}>{doc.toUpperCase()}</li>)}
                </ul>
              </div>
            ) : <p className="muted">All required documents uploaded.</p>}

            {draft.metrics?.missingRegistrations?.length ? (
              <div className="card small warning">
                <h4>Professional registration gaps</h4>
                <ul>
                  {draft.metrics.missingRegistrations.map(item => <li key={item}>{formatFieldLabel(item)}</li>)}
                </ul>
              </div>
            ) : <p className="muted">Professional registrations captured.</p>}

            {!!(draft.autoExtracted && Object.keys(draft.autoExtracted).length) && (
              <div className="card small">
                <h4>Auto-extracted from PDFs</h4>
                <ul>
                  {Object.entries(draft.autoExtracted).map(([key, value]) => (
                    <li key={key}><strong>{key}</strong>: {value}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="wizard-footer">
        {activeStep > 0 ? (
          <button type="button" className="btn ghost" onClick={handleBack}>Back</button>
        ) : (
          <div></div>
        )}
        {activeStep < steps.length - 1 && (
          <button type="button" className="btn" onClick={handleNext} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        )}
        {activeStep === steps.length - 1 && (
          <div>
            {draft.status === 'verified' ? (
              <div className="badge success" style={{ display: 'inline-block', padding: '10px 20px', fontSize: '1rem' }}>
                ✓ Profile Verified
              </div>
            ) : draft.status === 'pending' ? (
              <div className="badge warning" style={{ display: 'inline-block', padding: '10px 20px', fontSize: '1rem' }}>
                ⚠ Under Review
              </div>
            ) : (
              <>
                <button type="button" className="btn ghost" onClick={() => handleSubmit('draft')} disabled={saving}>
                  {saving ? 'Saving...' : 'Save as draft'}
                </button>
                <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={() => handleSubmit('pending')} disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit for verification'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  )
}

export default function VendorProfile() {
  return (
    <ErrorBoundary>
      <VendorProfileContent />
    </ErrorBoundary>
  )
}
