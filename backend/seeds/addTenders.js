// Script to add sample tenders without clearing existing data
const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()
const Tender = require('../models/Tender')

const tenders = [
  {
    title: 'Digital Skills Bootcamp Rollout',
    description: 'Deliver a 12-week digital skills programme for unemployed youth, including facilitation, laptops, and post-training placement support.',
    category: 'Education',
    sector: 'ICT & Training',
    location: 'Johannesburg, Gauteng',
    budgetMin: 850000,
    budgetMax: 1200000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
    requirements: 'Provide accreditation documents, facilitator CVs, and proof of similar programmes executed in the last 3 years.',
    requiredDocs: ['cipc', 'bbbee', 'csd'],
    tags: ['training', 'youth', 'digital']
  },
  {
    title: 'Rural Clinic Solar Microgrid',
    description: 'Supply, install, and maintain a 25kW hybrid solar microgrid with remote monitoring for four rural clinics. Include three-year O&M contract.',
    category: 'Energy',
    sector: 'Renewable Energy',
    location: 'Eastern Cape',
    budgetMin: 3200000,
    budgetMax: 4200000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 40),
    requirements: 'CIDB grading 4EP or higher, PV GreenCard certification, and bankable project references within Southern Africa.',
    requiredDocs: ['cipc', 'bbbee', 'csd'],
    tags: ['solar', 'infrastructure', 'maintenance']
  },
  {
    title: 'Municipal Fleet Telematics Upgrade',
    description: 'Deploy telematics hardware and analytics software to track 180 municipal vehicles, integrate with existing fuel cards, and provide driver scoring dashboards.',
    category: 'Transport',
    sector: 'Smart Mobility',
    location: 'Durban, KwaZulu-Natal',
    budgetMin: 2100000,
    budgetMax: 2850000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28),
    requirements: 'Demonstrate integrations with fuel card providers, provide POPIA compliance statement, and 24/7 support SLA.',
    requiredDocs: ['cipc', 'bbbee', 'csd'],
    tags: ['iot', 'analytics', 'telematics']
  },
  {
    title: 'Public Wi-Fi Expansion Phase 2',
    description: 'Install and maintain 150 additional outdoor Wi-Fi access points across township business districts. Provide quarterly utilization reports.',
    category: 'Infrastructure',
    sector: 'Connectivity',
    location: 'Cape Town, Western Cape',
    budgetMin: 1800000,
    budgetMax: 2500000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
    requirements: 'ICASA license copy, proof of municipal wayleave approvals on prior projects, and network uptime guarantees.',
    requiredDocs: ['cipc', 'bbbee', 'csd'],
    tags: ['wifi', 'connectivity', 'smart-city']
  },
  {
    title: 'SME Supplier Development Programme',
    description: 'Design and execute a supplier development programme for 30 emerging construction SMEs, including diagnostics, mentoring, and market access support.',
    category: 'Business Support',
    sector: 'Enterprise Development',
    location: 'Pretoria, Gauteng',
    budgetMin: 950000,
    budgetMax: 1400000,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 35),
    requirements: 'Provide methodology, coaching team profiles, and monitoring framework outlining KPIs and reporting cadence.',
    requiredDocs: ['cipc', 'bbbee', 'csd'],
    tags: ['sme', 'mentorship', 'development']
  }
]

async function run(){
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  for (const tender of tenders) {
    const existing = await Tender.findOne({ title: tender.title })
    if (existing) {
      console.log(`Skipping existing tender: ${tender.title}`)
      continue
    }
    await Tender.create(tender)
    console.log(`Inserted tender: ${tender.title}`)
  }

  await mongoose.disconnect()
  console.log('Done adding tenders')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
