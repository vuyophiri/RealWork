// API Integration Tests
// Tests the main API endpoints for authentication, tenders, vendors, and applications
// Uses MongoDB Memory Server for isolated testing environment

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Tender = require('../models/Tender');
const Application = require('../models/Application');

// Helper function to generate JWT tokens for testing authenticated requests
const signToken = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

let mongoServer;

// Setup: Start in-memory MongoDB server before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

// Cleanup: Clear all collections after each test to ensure isolation
afterEach(async () => {
  const collections = mongoose.connection.collections;
  const tasks = Object.values(collections).map((collection) => collection.deleteMany({}));
  await Promise.all(tasks);
});

// Teardown: Disconnect and stop the in-memory server after all tests
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Auth API', () => {
  // Test user registration endpoint
  test('registers a new applicant and issues a token', async () => {
    const payload = { name: 'Acme Builders', email: 'contact@acme.co.za', password: 'SecurePass123!', role: 'publisher' };
    const response = await request(app).post('/api/auth/register').send(payload);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({ email: payload.email, role: 'publisher' });

    const user = await User.findOne({ email: payload.email });
    expect(user).not.toBeNull();
    expect(user.role).toBe('publisher');
  });

  // Test login with incorrect password
  test('rejects login when password is incorrect', async () => {
    const password = await bcrypt.hash('CorrectHorseBatteryStaple1!', 10);
    await User.create({ name: 'Test Vendor', email: 'vendor@example.com', password, role: 'applicant' });

    const response = await request(app).post('/api/auth/login').send({ email: 'vendor@example.com', password: 'wrong-password' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('message');
  });
});

describe('Tender API', () => {
  // Test that only approved tenders are returned in public listing
  test('returns only approved tenders to the public listing', async () => {
    await Tender.create([
      { title: 'Road Resurfacing Phase 1', status: 'approved', category: 'Construction', sector: 'Public' },
      { title: 'IT Support Contract', status: 'pending', category: 'ICT', sector: 'Public' }
    ]);

    const response = await request(app).get('/api/tenders');

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Road Resurfacing Phase 1');
    expect(response.body[0].status).toBe('approved');
  });
});

describe('Vendor API', () => {
  // Test vendor profile creation with complete data and metric calculation
  test('creates or updates the current user profile and calculates metrics', async () => {
    const user = await User.create({
      name: 'Maseko Interactive',
      email: 'maseko@example.com',
      password: await bcrypt.hash('StrongPass123!', 10),
      role: 'applicant'
    });
    const token = signToken(user);

    const payload = {
      companyName: 'Maseko Interactive',
      registrationNumber: '2015/123456/07',
      vatNumber: '4123456789',
      csdNumber: 'MASEKO123',
      bbbeeLevel: '2',
      phone: '+27 21 555 0101',
      address: { street: '12 Harbour Road', city: 'Cape Town', postalCode: '8000' },
      professionalRegistrations: [{ body: 'CIDB', registrationNumber: '7GB', grade: '7GB' }],
      yearsExperience: 10,
      completedProjects: 25,
      documents: [
        { type: 'cipc', filename: 'cipc.pdf' },
        { type: 'bbbee', filename: 'bbbee.pdf' },
        { type: 'csd', filename: 'csd.pdf' }
      ]
    };

    const response = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('_id');
    expect(response.body.metrics?.missingFields).toHaveLength(0);
    expect(response.body.metrics?.missingDocs).toHaveLength(0);
    expect(response.body.metrics?.completeness).toBe(1);
    expect(response.body.status).toBe('draft');
  });
});

describe('Application API', () => {
  // Test that users can only access their own applications
  test('requires ownership when fetching user applications', async () => {
    const [owner, other] = await Promise.all([
      User.create({ name: 'Owner', email: 'owner@example.com', password: await bcrypt.hash('OwnerPass123!', 10), role: 'applicant' }),
      User.create({ name: 'Other', email: 'other@example.com', password: await bcrypt.hash('OtherPass123!', 10), role: 'applicant' })
    ]);

    await Application.create({ userId: owner._id, tenderId: new mongoose.Types.ObjectId(), status: 'submitted' });

    const token = signToken(other);
    const response = await request(app)
      .get(`/api/applications/user/${owner._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty('message');
  });

  // Test application submission with file upload to GridFS
  test('submits a new application with methodology PDF stored in GridFS', async () => {
    const user = await User.create({
      name: 'Zebulon Enterprise',
      email: 'zebulon@example.com',
      password: await bcrypt.hash('ZebulonPass123!', 10),
      role: 'applicant'
    });
    const tender = await Tender.create({
      title: 'Community Hall Renovation',
      status: 'approved',
      category: 'Construction',
      sector: 'Public'
    });

    const token = signToken(user);

    // Submit application with form fields and file attachment
    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .field('tenderId', tender._id.toString())
      .field('coverLetter', 'We bring certified teams and proven delivery.')
      .field('proposedAmount', '7500000')
      .field('durationWeeks', '26')
      .field('methodStatement', 'Outline of delivery approach')
      .field('complianceDeclaration', 'true')
  .attach('methodDocument', Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF'), {
        filename: 'methodology.pdf',
        contentType: 'application/pdf'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body.methodDocumentId).toBeTruthy();

    const stored = await Application.findById(response.body._id);
    expect(stored.methodDocumentId).toBeDefined();

    // Test document download
    const download = await request(app)
      .get(`/api/applications/${stored._id.toString()}/method-document`)
      .set('Authorization', `Bearer ${token}`);

    expect(download.statusCode).toBe(200);
    expect(download.headers['content-type']).toMatch(/application\/pdf/);
    expect(download.body.length).toBeGreaterThan(0);
  });
});
