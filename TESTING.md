# RealWork - Manual Test Cases

This document outlines the manual test scenarios used to verify the functionality of the RealWork web application. These tests cover authentication, vendor profiling, tender management, and responsive design.

## Test Environment
- **URL:** http://localhost:5173 (Frontend)
- **Backend:** http://localhost:5000 (API)
- **Database:** MongoDB (Local)
- **Browser:** Chrome / Firefox / Edge

---

## Test Suite 1: Authentication & User Management

| Test ID | Test Case Name | Pre-conditions | Steps | Expected Result | Status |
|---------|----------------|----------------|-------|-----------------|--------|
| **TC-001** | **User Registration (Vendor)** | Database is running. | 1. Navigate to `/register`.<br>2. Enter Name: "Test Vendor".<br>3. Enter Email: "vendor@test.com".<br>4. Enter Password: "password123".<br>5. Select Role: "Applicant".<br>6. Click "Register". | User is redirected to the Dashboard or Login page. Token is stored. | |
| **TC-002** | **User Login (Success)** | User "vendor@test.com" exists. | 1. Navigate to `/login`.<br>2. Enter Email: "vendor@test.com".<br>3. Enter Password: "password123".<br>4. Click "Login". | User is redirected to the Dashboard. "Welcome, Test Vendor" is displayed. | |
| **TC-003** | **Login (Invalid Credentials)** | None. | 1. Navigate to `/login`.<br>2. Enter Email: "wrong@test.com".<br>3. Enter Password: "wrongpass".<br>4. Click "Login". | Error message "Invalid credentials" is displayed. User remains on login page. | |
| **TC-004** | **Logout Functionality** | User is logged in. | 1. Click the "Logout" button in the Navbar. | User is redirected to the Login/Home page. Session token is cleared from storage. | |

---

## Test Suite 2: Vendor Profile & Compliance

| Test ID | Test Case Name | Pre-conditions | Steps | Expected Result | Status |
|---------|----------------|----------------|-------|-----------------|--------|
| **TC-005** | **Complete Profile Wizard** | User logged in as Vendor. | 1. Navigate to "My Profile".<br>2. Complete Step 1 (Company Info).<br>3. Complete Step 2 (Address).<br>4. Complete Step 3 (Banking).<br>5. Click "Submit". | Profile status changes to "Pending" or "Verified". Data is saved to database. | |
| **TC-006** | **Document Upload** | User is on Profile page. | 1. Locate "CIPC Registration" upload field.<br>2. Select a PDF file.<br>3. Click "Upload". | File is uploaded successfully. "View" button appears next to the document. | |
| **TC-007** | **Data Persistence** | Profile created. | 1. Log out of the application.<br>2. Restart the browser.<br>3. Log back in.<br>4. Navigate to "My Profile". | All previously entered company details and uploaded documents are visible. Data is NOT lost. | |

---

## Test Suite 3: Tender Management & Qualification

| Test ID | Test Case Name | Pre-conditions | Steps | Expected Result | Status |
|---------|----------------|----------------|-------|-----------------|--------|
| **TC-008** | **View Tender Listings** | Tenders exist in DB. | 1. Navigate to "Tenders" page. | List of available tenders is displayed with Titles, Closing Dates, and CIDB grades. | |
| **TC-009** | **Qualification Check (Eligible)** | Vendor has Grade 7GB. Tender requires 5GB. | 1. Click on a Tender requiring "5GB".<br>2. View "Qualification Status" section. | System displays a Green checkmark / "Qualified" message. "Apply" button is enabled. | |
| **TC-010** | **Qualification Check (Ineligible)** | Vendor has Grade 2GB. Tender requires 5GB. | 1. Click on a Tender requiring "5GB".<br>2. View "Qualification Status" section. | System displays a Red warning / "Not Qualified" message. Reason: "Grade too low". | |

---

## Test Suite 4: UI/UX & Responsiveness

| Test ID | Test Case Name | Pre-conditions | Steps | Expected Result | Status |
|---------|----------------|----------------|-------|-----------------|--------|
| **TC-011** | **Mobile Navigation** | Screen width < 768px. | 1. Resize browser window to mobile size.<br>2. Verify Navbar links disappear.<br>3. Click the "Hamburger" icon. | Mobile menu slides down/opens. Links are clickable. | |
| **TC-012** | **Responsive Grid Layout** | Tender list page open. | 1. Resize browser from Desktop to Mobile width. | Tender cards stack vertically (1 column) on mobile, instead of 3 columns on desktop. No horizontal scrolling. | |
