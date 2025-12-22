const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Tender = require('./models/Tender');
const VendorProfile = require('./models/VendorProfile');

dotenv.config();

const mongoURI = process.env.MONGO_URI;

const seedData = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected...');

    // Clear existing data
    // WARNING: Uncommenting these lines will wipe your database!
    // await User.deleteMany({});
    // await Tender.deleteMany({});
    // await VendorProfile.deleteMany({});
    // console.log('Data cleared.');

    // Create Users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@realwork.co.za',
      password: hashedPassword,
      role: 'admin'
    });

    const publisherUser = new User({
      name: 'City of Cape Town',
      email: 'tenders@capetown.gov.za',
      password: hashedPassword,
      role: 'publisher'
    });

    const vendor1 = new User({
      name: 'Maseko Interactive',
      email: 'info@maseko.co.za',
      password: hashedPassword,
      role: 'applicant'
    });

    const vendor2 = new User({
      name: 'BuildRight Construction',
      email: 'contact@buildright.co.za',
      password: hashedPassword,
      role: 'applicant'
    });

    await User.insertMany([adminUser, publisherUser, vendor1, vendor2]);
    console.log('Users created.');

    // Create Tenders
    const tenders = [
      {
        title: 'Renovation of Community Hall',
        description: 'Complete renovation of the community hall including roofing, painting, and electrical work.',
        category: 'Construction',
        sector: 'Public',
        location: 'Cape Town',
        budgetMin: 500000,
        budgetMax: 1500000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        requirements: 'Must have CIDB Grade 3GB or higher.',
        requiredDocs: ['CIPC', 'Tax Clearance', 'CSD', 'B-BBEE'],
        tags: ['renovation', 'building', 'electrical'],
        minYearsExperience: 3,
        minCompletedProjects: 2,
        siteInspectionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        siteInspectionMandatory: true,
        contractDuration: '6 months',
        cidbGrade: '3GB',
        createdBy: publisherUser._id,
        status: 'approved'
      },
      {
        title: 'Road Resurfacing - Main Road',
        description: 'Resurfacing of 5km of Main Road. Includes pothole repair and line marking.',
        category: 'Civil Engineering',
        sector: 'Public',
        location: 'Stellenbosch',
        budgetMin: 2000000,
        budgetMax: 5000000,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        requirements: 'CIDB Grade 5CE required.',
        requiredDocs: ['CIPC', 'Tax Clearance', 'CSD', 'COIDA'],
        tags: ['roads', 'civil', 'asphalt'],
        minYearsExperience: 5,
        minCompletedProjects: 5,
        siteInspectionDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        siteInspectionMandatory: true,
        contractDuration: '12 months',
        cidbGrade: '5CE',
        createdBy: publisherUser._id,
        status: 'approved'
      },
      {
        title: 'Supply of Office Furniture',
        description: 'Supply and delivery of office desks and chairs for the new municipal building.',
        category: 'Supply',
        sector: 'Public',
        location: 'Cape Town',
        budgetMin: 100000,
        budgetMax: 300000,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requirements: 'Local content requirements apply.',
        requiredDocs: ['CIPC', 'Tax Clearance', 'B-BBEE'],
        tags: ['furniture', 'supply'],
        minYearsExperience: 1,
        minCompletedProjects: 0,
        siteInspectionMandatory: false,
        contractDuration: '1 month',
        createdBy: publisherUser._id,
        status: 'pending'
      }
    ];

    await Tender.insertMany(tenders);
    console.log('Tenders created.');

    // Create Vendor Profiles
    const vendorProfile1 = new VendorProfile({
      userId: vendor1._id,
      companyName: 'Maseko Interactive (Pty) Ltd',
      tradingName: 'Maseko Interactive',
      registrationNumber: '2025/57984/07',
      vatNumber: '8965431',
      csdNumber: 'MAAA0012345',
      bbbeeLevel: 'Level 1',
      address: {
        street: '123 Impala Drive',
        city: 'Newcastle',
        postalCode: '2940'
      },
      phone: '0693026063',
      directors: [
        { name: 'Vuyo Phiri', idNumber: '9001015000080', role: 'Director' }
      ],
      yearsExperience: 4,
      completedProjects: 10,
      status: 'verified',
      documents: [
        {
            type: 'CIPC',
            filename: 'cipc_cert.pdf',
            url: '#',
            uploadedAt: new Date(),
            expiryDate: new Date('2026-01-01')
        },
        {
            type: 'Tax Clearance',
            filename: 'tax_clearance.pdf',
            url: '#',
            uploadedAt: new Date(),
            expiryDate: new Date('2025-12-31')
        }
      ]
    });

    const vendorProfile2 = new VendorProfile({
      userId: vendor2._id,
      companyName: 'BuildRight Construction CC',
      tradingName: 'BuildRight',
      registrationNumber: '2010/002345/23',
      vatNumber: '4012345678',
      csdNumber: 'MAAA0098765',
      bbbeeLevel: 'Level 2',
      address: {
        street: '45 Construction Ave',
        city: 'Cape Town',
        postalCode: '8001'
      },
      phone: '0215551234',
      directors: [
        { name: 'John Builder', idNumber: '8002025000080', role: 'Member' }
      ],
      yearsExperience: 12,
      completedProjects: 45,
      status: 'pending'
    });

    await VendorProfile.insertMany([vendorProfile1, vendorProfile2]);
    console.log('Vendor Profiles created.');

  console.log('Database seeded successfully.');
  // Summary and convenient login credentials
  console.log('');
  console.log('Seed summary:');
  console.log(`- Users created: 4`);
  console.log(`- Tenders created: ${tenders.length}`);
  console.log(`- Vendor profiles created: 2`);
  console.log('');
  console.log('You can login with:');
  console.log(`Admin       -> ${adminUser.email} / password123`);
  console.log(`Publisher   -> ${publisherUser.email} / password123`);
  console.log(`Maseko      -> ${vendor1.email} / password123`);
  console.log(`BuildRight  -> ${vendor2.email} / password123`);
  console.log('');
  process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();
