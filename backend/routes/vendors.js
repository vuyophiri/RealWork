// Routes for vendor profiles (business registration and compliance)
const express = require('express')
const VendorProfile = require('../models/VendorProfile')
const { auth, adminOnly } = require('../middleware/auth')

const router = express.Router()

// File system and upload dependencies
const path = require('path')
const fs = require('fs')
const multer = require('multer')

// Configure multer for file uploads to vendor directories
// Multer storage setup: store files under backend/uploads/vendors/<userId>/
// This ensures files are organized by user ID for easier management.
const uploadRoot = path.join(__dirname, '..', 'uploads', 'vendors')
fs.mkdirSync(uploadRoot, { recursive: true })

// Define storage configuration for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const ownerId = req.params.id || req.user.id
    const dest = path.join(uploadRoot, ownerId.toString())
    fs.mkdirSync(dest, { recursive: true })
    cb(null, dest)
  },
  filename: function (req, file, cb) {
    // Generate a unique filename to prevent overwrites
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${unique}-${file.originalname}`)
  }
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB limit

// Required fields for vendor profile completeness
const REQUIRED_FIELDS = [
  'companyName',
  'registrationNumber',
  'vatNumber',
  'csdNumber',
  'bbbeeLevel',
  'phone',
  'address.street',
  'address.city',
  'address.postalCode',
  'professionalRegistrations',
  'yearsExperience',
  'completedProjects'
]

// Required document types for compliance
const REQUIRED_DOC_TYPES = ['cipc', 'bbbee', 'csd']

// Helper function to safely access nested object properties
const getValue = (obj, path) => {
  if (!obj) return undefined
  const parts = path.split('.')
  let cur = obj
  for (const part of parts) {
    if (cur == null) return undefined
    cur = cur[part]
  }
  return cur
}

// Function to evaluate vendor profile completeness and compliance
function evaluateProfile(profile) {
  const plain = typeof profile.toObject === 'function' ? profile.toObject() : profile
  // Check for missing required fields
  const missingFields = REQUIRED_FIELDS.filter(field => {
    const value = getValue(plain, field)
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null || value === ''
  })

  // Check for missing required documents
  const docs = Array.isArray(plain.documents) ? plain.documents : []
  const docTypes = new Set(docs.map(d => (d.type || '').toLowerCase()))
  const missingDocs = REQUIRED_DOC_TYPES.filter(type => !docTypes.has(type))

  // Evaluate professional registrations
  const registrations = Array.isArray(plain.professionalRegistrations) ? plain.professionalRegistrations : []
  const registrationBodies = registrations
    .filter(reg => reg && typeof reg.body === 'string' && reg.body.trim())
    .map(reg => reg.body.trim())
  const normalisedBodies = new Set(registrationBodies.map(body => body.toLowerCase()))

  const missingRegistrations = registrationBodies.length ? [] : ['professionalRegistrations']

  const yearsExperience = Number(plain.yearsExperience || 0)
  const completedProjects = Number(plain.completedProjects || 0)

  // Calculate completeness metrics
  const completeness = REQUIRED_FIELDS.length === 0 ? 1 : Number(((REQUIRED_FIELDS.length - missingFields.length) / REQUIRED_FIELDS.length).toFixed(2))
  const documentCoverage = REQUIRED_DOC_TYPES.length === 0 ? 1 : Number(((REQUIRED_DOC_TYPES.length - missingDocs.length) / REQUIRED_DOC_TYPES.length).toFixed(2))

  // Identify risk flags based on profile data
  const riskFlags = []
  if ((plain.directors || []).length === 0) riskFlags.push('no-directors')
  if (missingDocs.length > 0) riskFlags.push('docs-incomplete')
  if (missingFields.length > 0) riskFlags.push('profile-incomplete')
  if (!registrationBodies.length) riskFlags.push('no-professional-registrations')
  if (yearsExperience < 1) riskFlags.push('low-experience')
  if (completedProjects < 1) riskFlags.push('low-project-count')

  // Update profile metrics
  profile.metrics = {
    ...((profile.metrics && typeof profile.metrics.toObject === 'function') ? profile.metrics.toObject() : profile.metrics),
    completeness,
    documentCoverage,
    missingFields,
    missingDocs,
    riskFlags,
    missingRegistrations,
    experienceYears: yearsExperience,
    projectsCompleted: completedProjects,
    professionalBodies: registrationBodies.length,
    lastEvaluation: new Date()
  }

  // Automatically promote status from 'incomplete' to 'draft' if all required data is present
  if (missingFields.length === 0 && missingDocs.length === 0 && profile.status === 'incomplete') {
    profile.status = 'draft'
  }
}

// Route to get the current user's vendor profile
// GET /api/vendors/me - get profile for current user
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.user.id })
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Route to create or update the current user's vendor profile
// POST /api/vendors - create or update profile for current user
router.post('/', auth, async (req, res) => {
  try {
    const data = req.body
    let profile = await VendorProfile.findOne({ userId: req.user.id })
    if (profile) {
      Object.assign(profile, data)
      evaluateProfile(profile)
      await profile.save()
    } else {
      profile = new VendorProfile({ userId: req.user.id, ...data })
      evaluateProfile(profile)
      await profile.save()
    }
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Route to upload a document for a vendor profile
// POST /api/vendors/:id/documents - upload a document for a vendor profile
router.post('/:id/documents', auth, upload.single('file'), async (req, res) => {
  try {
    const profile = await VendorProfile.findById(req.params.id)
    if (!profile) return res.status(404).json({ message: 'Vendor profile not found' })
    // only owner or admin can upload
    if (req.user.id !== profile.userId.toString() && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
    const file = req.file
    const doc = { 
      type: req.body.type || 'other', 
      url: `/api/vendors/${profile._id}/documents/${file.filename}/download`, 
      filename: file.filename, 
      mimeType: file.mimetype, 
      size: file.size,
      expiryDate: req.body.expiryDate || null
    }

    // Remove existing document of the same type to prevent duplicates
    // If type is 'other', we might want to allow multiples, but for now let's keep it simple and unique per type
    // or maybe only unique for standard types. 
    // Let's make it unique per type to solve the user's "repetition" issue.
    const existingIndex = profile.documents.findIndex(d => d.type === doc.type)
    if (existingIndex !== -1) {
      profile.documents.splice(existingIndex, 1)
    }

    profile.documents.push(doc)
    evaluateProfile(profile)
    await profile.save()
    res.status(201).json({ document: profile.documents[profile.documents.length - 1] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Route to download a document from a vendor profile
// GET /api/vendors/:id/documents/:filename/download - download a document (owner or admin)
router.get('/:id/documents/:filename/download', auth, async (req, res) => {
  try {
    const profile = await VendorProfile.findById(req.params.id)
    if (!profile) return res.status(404).json({ message: 'Vendor profile not found' })
    // allow owner or admin
    if (req.user.id !== profile.userId.toString() && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    const filename = req.params.filename
    const doc = profile.documents.find(d => d.filename === filename)
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    // Files are stored under the Profile ID (req.params.id), not the User ID
    const filePath = path.join(__dirname, '..', 'uploads', 'vendors', profile._id.toString(), filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk' })
    res.download(filePath, doc.filename)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Admin route to list all vendor profiles
// GET /api/vendors - admin list all
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const profiles = await VendorProfile.find().populate('userId', 'name email')
    res.json(profiles)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Admin route to get a single vendor profile
// GET /api/vendors/:id - admin get single profile
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const profile = await VendorProfile.findById(req.params.id).populate('userId', 'name email')
    if (!profile) return res.status(404).json({ message: 'Not found' })
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Admin route to update vendor profile verification status
// PUT /api/vendors/:id/status - admin updates verification status and adds note
router.put('/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body
    if (!['incomplete','draft','pending','verified','rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' })
    const profile = await VendorProfile.findById(req.params.id)
    if (!profile) return res.status(404).json({ message: 'Not found' })
    profile.status = status
    if (note) profile.notes.push({ by: req.user.id, text: note })
    profile.review = profile.review || {}
    profile.review.lastReviewer = req.user.id
    profile.review.lastReviewedAt = new Date()
    evaluateProfile(profile)
    await profile.save()
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
