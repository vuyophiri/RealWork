// VendorProfile model stores business registration and compliance metadata for bidders
// This is separate from the User model to keep the auth lightweight.
const mongoose = require('mongoose')

// Sub-schema for Company Directors
const directorSchema = new mongoose.Schema({
  name: { type: String },
  idNumber: { type: String },
  role: { type: String }
}, { _id: false })

// Sub-schema for Uploaded Documents (e.g., CIPC, Tax Clearance)
const documentSchema = new mongoose.Schema({
  type: { type: String }, // e.g., 'cipc', 'bbbee'
  url: { type: String }, // Path to file
  filename: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
  expiryDate: { type: Date }, // When the document expires
  verified: { type: Boolean, default: false }, // Admin verification status
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

// Sub-schema for Professional Registrations (e.g., CIDB, ECSA)
const registrationSchema = new mongoose.Schema({
  body: { type: String }, // e.g., 'CIDB'
  registrationNumber: { type: String },
  grade: { type: String }, // e.g., '7GB'
  expiry: { type: Date },
  verified: { type: Boolean, default: false }
}, { _id: false })

const vendorProfileSchema = new mongoose.Schema({
  // Link to the User account
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Company Details
  companyName: { type: String },
  tradingName: { type: String },
  registrationNumber: { type: String }, // CIPC Number
  vatNumber: { type: String },
  csdNumber: { type: String }, // Central Supplier Database Number
  bbbeeLevel: { type: String }, // B-BBEE Level (1-8)
  
  // Contact Info
  address: {
    street: String,
    city: String,
    postalCode: String
  },
  phone: { type: String },
  
  // Nested Arrays for structured data
  directors: [directorSchema],
  documents: [documentSchema],
  professionalRegistrations: [registrationSchema],
  
  // Experience & Capabilities
  yearsExperience: { type: Number },
  completedProjects: { type: Number },
  coreCapabilities: [{ type: String }],
  industriesServed: [{ type: String }],
  status: { type: String, enum: ['incomplete','draft','pending','verified','rejected'], default: 'incomplete' },
  metrics: {
    completeness: { type: Number, default: 0 },
    documentCoverage: { type: Number, default: 0 },
    missingFields: [{ type: String }],
    missingDocs: [{ type: String }],
    riskFlags: [{ type: String }],
    missingRegistrations: [{ type: String }],
    experienceYears: { type: Number, default: 0 },
    projectsCompleted: { type: Number, default: 0 },
    professionalBodies: { type: Number, default: 0 },
    lastEvaluation: { type: Date }
  },
  autoExtracted: {
    registrationNumber: { type: String },
    bbbeeLevel: { type: String },
    csdNumber: { type: String }
  },
  review: {
    lastReviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastReviewedAt: { type: Date }
  },
  notes: [{ by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String, createdAt: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

vendorProfileSchema.pre('save', function(next){
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('VendorProfile', vendorProfileSchema)
