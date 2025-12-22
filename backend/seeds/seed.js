// Seed script for RealWork
// Connects to the DB and creates sample users, tenders and applications
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')
const bcrypt = require('bcryptjs')

// Load backend .env explicitly so running from any cwd works
dotenv.config({ path: path.resolve(__dirname, '../.env') })
const mongoURI = process.env.MONGO_URI;
const User = require('../models/User')
const Tender = require('../models/Tender')
const Application = require('../models/Application')

async function main(){
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  console.log('Connected to MongoDB for seeding')

  // Clear existing collections (use carefully)
  // WARNING: Uncommenting these lines will wipe your database!
  // await Application.deleteMany({})
  // await Tender.deleteMany({})
  // await User.deleteMany({})
  // console.log('Cleared existing data')

  // Create users
  const pw = await bcrypt.hash('password123', 10)
  const admin = await User.create({ name: 'Admin User', email: 'admin@realwork.com', password: pw, role: 'admin' })
  const alice = await User.create({ name: 'Alice Contractor', email: 'alice@example.com', password: pw })
  const bob = await User.create({ name: 'Bob Solutions', email: 'bob@example.com', password: pw })
  console.log('Created users:', [admin.email, alice.email, bob.email])

  // Create some tenders
  const tendersData = [
    {
      title: 'Road Maintenance - Sector 7',
      description: 'Resurfacing and pothole repairs for the main arterial roads in Sector 7. Minimum 2 years warranty on work.',
      category: 'Infrastructure',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      requirements: 'Proof of previous road works, equipment list, company registration documents.'
    },
    {
      title: 'School IT Upgrade',
      description: 'Supply and install computers and networking for 10 schools. Include training for staff.',
      category: 'Education',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
      requirements: 'Authorized reseller certificates; 3 year support plan.'
    },
    {
      title: 'Office Cleaning Services (Annual)',
      description: 'Provide cleaning and janitorial services for government offices across three locations.',
      category: 'Services',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      requirements: 'Company profile, personnel vetting procedures, insurance.'
    },
    {
      title: 'Solar Panel Installation - Community Centre',
      description: 'Design and install a 50kW solar PV system with grid-tie inverters and battery backup.',
      category: 'Energy',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      requirements: 'PV installer certification, previous project references.'
    },
    {
      title: 'Catering for Annual Conference',
      description: 'Provide catering services for a 3-day conference for up to 400 attendees per day.',
      category: 'Catering',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      requirements: 'Food safety certificates, menu samples, insurance.'
    }
  ]

  const tenders = await Tender.insertMany(tendersData)
  console.log('Created tenders:', tenders.map(t => t.title))

  // Create applications
  const apps = []
  apps.push(await Application.create({ userId: alice._id, tenderId: tenders[0]._id, coverLetter: 'Experienced in road resurfacing. We propose high-quality asphalt works with a 2-year warranty.', status: 'submitted' }))
  apps.push(await Application.create({ userId: bob._id, tenderId: tenders[1]._id, coverLetter: 'We supply certified hardware and provide installation and training.', status: 'under-review' }))
  apps.push(await Application.create({ userId: alice._id, tenderId: tenders[2]._id, coverLetter: 'Reliable cleaning crews with vetted personnel and insurance.', status: 'accepted' }))

  console.log('Created applications:', apps.map(a => `${a.userId}->${a.tenderId}`))

  console.log('Seeding complete. You can login with:')
  console.log('Admin -> admin@realwork.com / password123')
  console.log('Alice -> alice@example.com / password123')
  console.log('Bob -> bob@example.com / password123')

  // Summary
  console.log('')
  console.log('Seed summary:')
  console.log(`- Users created: 3`) // admin, alice, bob
  console.log(`- Tenders created: ${tenders.length}`)
  console.log(`- Applications created: ${apps.length}`)
  console.log('')

  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
