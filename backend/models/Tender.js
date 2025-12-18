// Mongoose model for tenders with richer procurement metadata
// This model represents a procurement opportunity (Tender) in the system.
const mongoose = require('mongoose');

// Define the Tender schema

const tenderSchema = new mongoose.Schema({
  // Basic Tender Information
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String }, // e.g., Construction, IT, Services
  sector: { type: String }, // e.g., Public, Private
  location: { type: String },
  
  // Budget Information
  budgetMin: { type: Number },
  budgetMax: { type: Number },
  
  // Key Dates
  deadline: { type: Date },
  
  // Requirements
  requirements: { type: String },
  // List of document types required for qualification (e.g. ['cipc','bbbee','csd'])
  requiredDocs: [{ type: String }],
  tags: [{ type: String }], // Keywords for search
  
  // Professional & Experience Requirements
  professionalRequirements: [{ type: String }], // e.g., "ECSA Registration"
  minYearsExperience: { type: Number },
  minCompletedProjects: { type: Number },
  specialisedNotes: { type: String },
  
  // Specific fields for construction tenders
  siteInspectionDate: { type: Date },
  siteInspectionMandatory: { type: Boolean, default: false },
  contractDuration: { type: String }, // e.g. "6 months"
  cidbGrade: { type: String }, // e.g. "7GB" - Critical for construction qualification
  
  // Evaluation Criteria for scoring bids
  evaluationCriteria: [{
    criterion: String,
    weight: Number
  }],
  
  // Ownership & Status
  // createdBy can be a publisher (organization) or admin
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Status: pending (waiting for admin approval), approved (live), rejected, closed
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'closed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Virtual property to format the budget range as a string
tenderSchema.virtual('budgetRange').get(function(){
  if (this.budgetMin == null && this.budgetMax == null) return null;
  if (this.budgetMin != null && this.budgetMax != null) return `${this.budgetMin} - ${this.budgetMax}`;
  return this.budgetMin != null ? `From ${this.budgetMin}` : `Up to ${this.budgetMax}`;
});

// Export the Tender model
module.exports = mongoose.model('Tender', tenderSchema);
