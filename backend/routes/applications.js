// Routes for applications: applicants submit, admin view and update status
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const { promisify } = require('util');
const Application = require('../models/Application');
const Tender = require('../models/Tender');
const { auth, adminOnly } = require('../middleware/auth');

const pipeline = promisify(require('stream').pipeline);

const router = express.Router();

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'applications');
fs.mkdirSync(uploadsRoot, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed for methodology uploads'));
    }
    cb(null, true);
  }
});

const normalizeDocuments = (documents) => {
  if (!documents) return [];
  if (Array.isArray(documents)) return documents;
  if (typeof documents === 'string') {
    try {
      const parsed = JSON.parse(documents);
      return Array.isArray(parsed) ? parsed : [documents];
    } catch {
      return [documents];
    }
  }
  return [];
};

let gridFsBucket;
let gridFsBucketDbName;
const getGridFsBucket = () => {
  const db = mongoose.connection.db;
  if (!db) return null;
  if (!gridFsBucket || gridFsBucketDbName !== db.databaseName) {
    gridFsBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'methodologyDocs' });
    gridFsBucketDbName = db.databaseName;
  }
  return gridFsBucket;
};

// POST /api/applications - logged-in users
// Allows a vendor to submit a bid for a tender.
router.post('/', auth, (req, res, next) => {
  upload.single('methodDocument')(req, res, async (err) => {
    if (err) {
      const status = err instanceof multer.MulterError ? 400 : 415;
      return res.status(status).json({ message: err.message || 'Failed to upload methodology document' });
    }

    try {
      const { tenderId, coverLetter, documents, proposedAmount, durationWeeks, methodStatement, complianceDeclaration } = req.body;
      let parsedAmount = proposedAmount !== undefined ? Number(proposedAmount) : undefined;
      if (Number.isNaN(parsedAmount)) parsedAmount = undefined;
      let parsedDuration = durationWeeks !== undefined ? Number(durationWeeks) : undefined;
      if (Number.isNaN(parsedDuration)) parsedDuration = undefined;
      const compliance = complianceDeclaration === 'true' || complianceDeclaration === true || complianceDeclaration === 'on';
      const docList = normalizeDocuments(documents);
      let methodDocumentId;
      let methodDocumentName;

      if (req.file) {
        const bucket = getGridFsBucket();
        if (!bucket) {
          return res.status(503).json({ message: 'File storage is still initializing. Please try again shortly.' });
        }
        methodDocumentName = req.file.originalname;
        try {
          const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
            metadata: {
              uploadedBy: req.user.id,
              tenderId
            }
          });
          await pipeline(Readable.from(req.file.buffer), uploadStream);
          methodDocumentId = uploadStream.id;
        } catch (fileErr) {
          console.error('Failed to persist methodology document to GridFS:', fileErr);
          return res.status(500).json({ message: 'Failed to store methodology document' });
        }
      }

      // Create new application linked to the current user
      const app = new Application({
        userId: req.user.id,
        tenderId,
        coverLetter,
        documents: docList,
        proposedAmount: parsedAmount,
        durationWeeks: parsedDuration,
        methodStatement,
        complianceDeclaration: compliance,
        methodDocument: methodDocumentId ? methodDocumentId.toString() : undefined,
        methodDocumentId,
        methodDocumentName
      });

      await app.save();
      return res.status(201).json(app);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  });
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

// GET /api/applications/:id/method-document - download methodology PDF if authorized
router.get('/:id/method-document', auth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const ownsApplication = app.userId.toString() === req.user.id;
    if (!ownsApplication && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!app.methodDocument && !app.methodDocumentId) {
      return res.status(404).json({ message: 'No methodology document uploaded' });
    }

    const downloadName = app.methodDocumentName || `methodology-${app._id}.pdf`;
    const asAttachment = ['1', 'true', 'download'].includes((req.query.download || '').toString().toLowerCase());
    const dispositionType = asAttachment ? 'attachment' : 'inline';

    if (app.methodDocumentId) {
      const bucket = getGridFsBucket();
      if (!bucket) {
        return res.status(503).json({ message: 'File storage is currently unavailable. Please try again later.' });
      }
      try {
        const downloadStream = bucket.openDownloadStream(app.methodDocumentId);
        let headersPrepared = false;
        downloadStream.on('file', (fileDoc) => {
          if (headersPrepared || res.headersSent) return;
          headersPrepared = true;
          res.setHeader('Content-Type', fileDoc?.contentType || 'application/pdf');
          res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(downloadName)}"`);
        });
        downloadStream.on('error', (streamErr) => {
          console.error('Failed to read methodology document from GridFS:', streamErr);
          if (!res.headersSent) {
            const notFound = streamErr?.code === 'ENOENT' || streamErr?.message?.includes('FileNotFound');
            const status = notFound ? 404 : 500;
            res.status(status).json({ message: notFound ? 'Document not found on server' : 'Failed to stream methodology document' });
          } else {
            res.destroy(streamErr);
          }
        });
        return downloadStream.pipe(res);
      } catch (streamErr) {
        console.error('Failed to stream methodology document from GridFS:', streamErr);
        return res.status(500).json({ message: 'Failed to stream methodology document' });
      }
    }

    const filePath = path.join(__dirname, '..', 'uploads', app.methodDocument);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document not found on server' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(downloadName)}"`);
    return res.sendFile(filePath);
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

// DELETE /api/applications/:id - withdraw an application and remove stored file
router.delete('/:id', auth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const ownsApplication = app.userId.toString() === req.user.id;
    if (!ownsApplication && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (app.methodDocumentId) {
      const bucket = getGridFsBucket();
      if (bucket) {
        try {
          await bucket.delete(app.methodDocumentId);
        } catch (err) {
          console.error('Failed to remove methodology document from GridFS:', err);
        }
      }
    }

    if (app.methodDocument && (!app.methodDocumentId || app.methodDocument.includes('/'))) {
      const filePath = path.join(__dirname, '..', 'uploads', app.methodDocument);
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error('Failed to remove methodology document:', err);
        }
      }
    }

    await app.deleteOne();
    res.json({ message: 'Application withdrawn' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
