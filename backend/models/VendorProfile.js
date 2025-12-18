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
  companyName: { type: String }, // Registered Company Name
  tradingName: { type: String }, // Trading Name
  registrationNumber: { type: String }, // CIPC Number
  vatNumber: { type: String }, // VAT Number
  csdNumber: { type: String }, // Central Supplier Database Number
  bbbeeLevel: { type: String }, // B-BBEE Level (1-8)
  
  // Contact Info
  address: {
    street: String, // Street Address
    city: String, // City
    postalCode: String // Postal Code
  },
  phone: { type: String },
  
  // Nested Arrays for structured data
  directors: [directorSchema], // Company Directors
  documents: [documentSchema], // Uploaded Documents
  professionalRegistrations: [registrationSchema], // Professional Registrations
  
  // Experience & Capabilities
  yearsExperience: { type: Number }, // Years of Experience
  completedProjects: { type: Number }, // Number of Completed Projects
  coreCapabilities: [{ type: String }], // Core Capabilities
  industriesServed: [{ type: String }], // Industries Served
  status: { type: String, enum: ['incomplete','draft','pending','verified','rejected'], default: 'incomplete' }, // Verification Status
  // Metrics for qualification evaluation
  metrics: {
    completeness: { type: Number, default: 0 },
    documentCoverage: { type: Number, default: 0 }, // Percentage of required docs uploaded
    missingFields: [{ type: String }], // List of critical missing fields
    missingDocs: [{ type: String }], // Missing required documents
    riskFlags: [{ type: String }], // Risk Flags
    missingRegistrations: [{ type: String }], // Missing Professional Registrations
    experienceYears: { type: Number, default: 0 }, // Years of Experience
    projectsCompleted: { type: Number, default: 0 }, // Number of Completed Projects
    professionalBodies: { type: Number, default: 0 }, // Number of Verified Professional Bodies
    lastEvaluation: { type: Date }
  },
  autoExtracted: {
    registrationNumber: { type: String }, // Auto-extracted Registration Number
    bbbeeLevel: { type: String }, // Auto-extracted B-BBEE Level
    csdNumber: { type: String } // Auto-extracted CSD Number
  },
  review: {
    lastReviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Last user who reviewed the profile
    lastReviewedAt: { type: Date } // Time of last review
  },
  notes: [{ by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String, createdAt: { type: Date, default: Date.now } }], // Notes added by reviewers
  createdAt: { type: Date, default: Date.now }, // Profile creation timestamp
  updatedAt: { type: Date, default: Date.now } // Profile last update timestamp
})
// Middleware to update the updatedAt timestamp
vendorProfileSchema.pre('save', function(next){
  this.updatedAt = Date.now() // Update the timestamp on each save
  next() 
})

// Export the VendorProfile model
module.exports = mongoose.model('VendorProfile', vendorProfileSchema) // Export the VendorProfile model
