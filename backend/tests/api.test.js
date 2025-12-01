const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Tender = require('../models/Tender');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  const tasks = Object.values(collections).map((collection) => collection.deleteMany({}));
  await Promise.all(tasks);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Auth API', () => {
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

  test('rejects login when password is incorrect', async () => {
    const password = await bcrypt.hash('CorrectHorseBatteryStaple1!', 10);
    await User.create({ name: 'Test Vendor', email: 'vendor@example.com', password, role: 'applicant' });

    const response = await request(app).post('/api/auth/login').send({ email: 'vendor@example.com', password: 'wrong-password' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('message');
  });
});

describe('Tender API', () => {
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
