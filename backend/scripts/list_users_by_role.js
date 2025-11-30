const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const listUsersByRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const admins = await User.find({ role: 'admin' });
    const publishers = await User.find({ role: 'publisher' });
    const applicants = await User.find({ role: 'applicant' });

    console.log('\n--- ADMINS ---');
    admins.forEach(u => console.log(`- ${u.name} (${u.email})`));

    console.log('\n--- PUBLISHERS (Bid Advertisers) ---');
    publishers.forEach(u => console.log(`- ${u.name} (${u.email})`));

    console.log('\n--- VENDORS (Applicants) ---');
    applicants.forEach(u => console.log(`- ${u.name} (${u.email})`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

listUsersByRole();
