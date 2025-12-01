# RealWork — Tender Management MVP

RealWork is a web application that simplifies how SMEs, entrepreneurs, and organisations access and apply for tenders. The platform pools tender opportunities into a central place, providing clear requirements and deadlines so applicants can browse, apply, and track progress without relying on email or paper submissions.

Concept summary
RealWork consolidates tender opportunities from various sources into a single platform. Registered and verified users submit applications through a standardized process that reduces errors and inefficiencies. Organisations and authorised administrators can post new tenders, edit existing entries, and update application statuses.

Core goal
To deliver a simple and effective tender-management platform that reduces administrative overhead, and gives SMEs transparent, real-time visibility into tender opportunities and the progress of their submissions — promoting fairness and transparency in the tendering process.

Key users & roles
- Public/Guest: view published tenders.
- Registered Applicant: register, log in, view tenders, submit and track applications.
- Admin (organization): create, update, delete tenders and manage application statuses.

Features (MVP)
- JWT authentication (applicants and admin)
- Role-based access control and protected routes
- Tender CRUD (admin) and public tender listing
- Application submission (applicants) and admin status updates
- Backend: Node.js + Express, MongoDB + Mongoose
- Frontend: React (Vite), Axios, responsive UI (CSS Grid + Flexbox)

Repository structure
- `backend/` — Express API, Mongoose models, auth middleware, routes, and seed script
- `frontend/` — React SPA with pages for public, user, and admin workflows

Quickstart
1. Start MongoDB (local or Atlas) and note the connection string.
2. Backend
   - cd backend
   - copy `.env.example` to `.env` and set `MONGO_URI`, `JWT_SECRET` and `PORT`
   - npm install
   - npm run dev
3. Frontend
   - cd frontend
   - copy `.env.example` to `.env` and set `VITE_API_URL` (e.g. http://localhost:5000)
   - npm install
   - npm run dev

Development notes
- Use `backend/seeds/seed.js` to populate development data (creates sample admin and applicants, tenders and applications).
- To create an admin manually, register a user and update its `role` field to `admin` in MongoDB (or modify the seed script to keep existing data).

Contributing
- This repo is intended as an MVP. If you'd like enhancements (file uploads, improved validation, email notifications, tests, CI), open an issue or request changes.

---

Project maintained locally in this workspace. See `backend/` and `frontend/` folders for implementation and run instructions.
