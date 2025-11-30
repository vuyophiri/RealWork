// Mongoose model for applications
// Represents a bid submitted by a Vendor for a specific Tender.
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Link to the Vendor (User) submitting the bid
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Link to the Tender being applied for
  tenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
  
  // Application Details
  coverLetter: { type: String },
  
  // Bid Specifics
  proposedAmount: { type: Number }, // The bid price
  durationWeeks: { type: Number }, // Estimated time to complete
  methodStatement: { type: String }, // Technical approach
  complianceDeclaration: { type: Boolean, default: false }, // User confirmed compliance
  
  // Supporting Documents (URLs or filenames)
  documents: [{ type: String }],
  
  // Application Status Workflow
  status: {
    type: String,
    enum: ['submitted', 'under-review', 'accepted', 'rejected'],
    default: 'submitted'
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Application', applicationSchema);
