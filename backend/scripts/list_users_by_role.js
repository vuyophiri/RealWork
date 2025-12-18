// Script to list all users grouped by their roles (admin, publisher, applicant)
// This is useful for administrative purposes to see user distribution

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

// Main function to query and display users by role
const listUsersByRole = async () => {
  try {
    // Connect to MongoDB using the connection string from environment variables
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Query users for each role
    const admins = await User.find({ role: 'admin' });
    const publishers = await User.find({ role: 'publisher' });
    const applicants = await User.find({ role: 'applicant' });

    // Display admins
    console.log('\n--- ADMINS ---');
    admins.forEach(u => console.log(`- ${u.name} (${u.email})`));

    // Display publishers (bid advertisers)
    console.log('\n--- PUBLISHERS (Bid Advertisers) ---');
    publishers.forEach(u => console.log(`- ${u.name} (${u.email})`));

    // Display applicants (vendors)
    console.log('\n--- VENDORS (Applicants) ---');
    applicants.forEach(u => console.log(`- ${u.name} (${u.email})`));

    process.exit(0);
  } catch (err) {
    // Handle any errors that occur during execution
    console.error(err);
    process.exit(1);
  }
};

// Execute the script
listUsersByRole();
