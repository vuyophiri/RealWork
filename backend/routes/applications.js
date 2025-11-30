// Routes for applications: applicants submit, admin view and update status
const express = require('express');
const Application = require('../models/Application');
const Tender = require('../models/Tender');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/applications - logged-in users
// Allows a vendor to submit a bid for a tender.
router.post('/', auth, async (req, res) => {
  try {
    const { tenderId, coverLetter, documents, proposedAmount, durationWeeks, methodStatement, complianceDeclaration } = req.body;
    
    // Create new application linked to the current user
    const app = new Application({ 
      userId: req.user.id, 
      tenderId, 
      coverLetter, 
      documents,
      proposedAmount,
      durationWeeks,
      methodStatement,
      complianceDeclaration
    });
    
    await app.save();
    res.status(201).json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/applications/user/:userId - users can fetch their own apps
// Security: Users can only see their own applications, unless they are an admin.
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const apps = await Application.find({ userId: req.params.userId }).populate('tenderId');
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/applications/tender/:tenderId - admin or tender owner
// Retrieves all applications for a specific tender.
router.get('/tender/:tenderId', auth, async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.tenderId);
    if (!tender) return res.status(404).json({ message: 'Tender not found' });
    
    if (req.user.role !== 'admin' && (!tender.createdBy || tender.createdBy.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const apps = await Application.find({ tenderId: req.params.tenderId }).populate('userId');
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/applications/:id/status - admin or tender owner updates status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['submitted','under-review','accepted','rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const app = await Application.findById(req.params.id).populate('tenderId');
    if (!app) return res.status(404).json({ message: 'Not found' });

    const tender = app.tenderId;
    if (req.user.role !== 'admin' && (!tender.createdBy || tender.createdBy.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    app.status = status;
    await app.save();
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
