<<<<<<< HEAD
# RaktaSetu-Neural-Nodes
=======
# RakthaSetu (रक्तसेतु) — Complete Full-Stack Blood Donation & Emergency Assistance Platform

RakthaSetu connects patients, hospitals, and verified donors in real time when every second matters. Built with a responsive React frontend, an Express + TypeScript backend, Cloud Firestore, Firebase Realtime Database, Leaflet OpenStreetMap, Tesseract.js OCR, and Agora RTC for encrypted video/audio consultations.

---

## 1. Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              RAKTHASETU FRONTEND             │
                      │  React 18 + Vite + TailwindCSS + Leaflet Map │
                      │ (Indiranagar, Koramangala, Whitefield, etc.) │
                      └───────┬──────────────────────────────┬───────┘
                              │                              │
                     Direct Web APIs                  REST API Client
                              │                              │
             ┌────────────────▼─────────────┐    ┌───────────▼──────────────────┐
             │   Client Services            │    │    Express + TypeScript API   │
             │  - Tesseract.js Client OCR   │    │  - Zod Request Validation    │
             │  - Browser Geolocation API   │    │  - Haversine Distance Filter │
             │  - Agora RTC Client Engine   │    │  - Medical Compatibility Rule│
             └──────────────────────────────┘    │  - Rate Limiter & Helmet     │
                                                 │  - Agora Temporary Token Gen │
                                                 └───────────┬──────────────────┘
                                                             │
                                             ┌───────────────▼──────────────────┐
                                             │     Cloud Firestore & RTDB       │
                                             │  - Users, Donors, Blood Requests │
                                             │  - Notifications, Live Tracking  │
                                             │  - Admin Analytics & Audit Logs  │
                                             └──────────────────────────────────┘
```

---

## 2. Key Features Implemented

1. **Medical Blood Compatibility & Matching Engine**:
   - Medically verified ABO/Rh compatibility matrix (e.g. O- universal donor, AB+ universal recipient).
   - Haversine distance formula with proximity scoring and urgency multipliers.
   - Human confirmation workflow (request broadcast -> donor accepts -> mutual channel opens).

2. **Interactive Leaflet OpenStreetMap**:
   - Real-time map rendering with OpenStreetMap tiles.
   - Custom markers for donors, your position, and emergency hospitals.
   - Radius filtering (Nearby 6km vs. All Bengaluru).
   - "My Location" browser geolocation integration with graceful fallback.

3. **Live GPS En-Route Location Tracking**:
   - Geolocation `watchPosition` updates with speed and heading.
   - Ephemeral live location tracking active only during in-progress emergency requests.

4. **Encrypted Video & Audio Calling (Agora RTC)**:
   - Server-side temporary token generation (`/api/agora/token`).
   - Private consultation channel for accepted donor & requester.
   - Microphone mute/unmute, Camera toggle, and complete track cleanup on call termination.

5. **Client-Side Document OCR (Tesseract.js)**:
   - Donors can scan their blood test report, donor card, or medical certificate.
   - Client-side regex extraction of blood group (`O+`, `A-`, `B+`, etc.).
   - User verification and correction step before submitting.

6. **In-App Notification Center**:
   - Real-time notification drawer with unread badges.
   - Alerts for matching emergency requests and donor acceptance.

7. **Administrator Operations Dashboard**:
   - Real-time platform statistics (Total Donors, Verified Donors, Active Requests).
   - Blood Group Availability Barometer across all 8 blood groups.
   - Donor verification queue with one-click approval.
   - Live blood request monitor.

---

## 3. Getting Started

### Prerequisites
- Node.js >= 18 (Tested on v25.1.0)
- npm >= 9

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../project
npm install
```

### Step 2: Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

# Optional for local test mode; required for production Firebase:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com

# Optional for local test mode; required for live Agora RTC calls:
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

**Frontend (`project/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 4. Running the Platform

### Terminal 1: Start Backend Server
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

### Terminal 2: Start Frontend Application
```bash
cd project
npm run dev
# Vite runs on http://localhost:5173
```

---

## 5. Running the Test Suite

The project includes unit tests for matching/compatibility and end-to-end integration tests for all API routes:

```bash
cd backend
npm run build
node --test dist/tests/matching.test.js dist/tests/api.test.js
```

**Test Results:**
- `✔ Medical Blood Compatibility: O- is universal donor`
- `✔ Medical Blood Compatibility: AB+ is universal recipient`
- `✔ Medical Blood Compatibility: Incompatible groups rejected`
- `✔ Haversine Distance Calculation`
- `✔ Matching Engine: Ranks available and compatible donors`
- `✔ Agora Service: Token generation produces valid structure`
- `✔ API: GET /health returns status healthy`
- `✔ API: Auth flow (register & login)`
- `✔ API: Donors listing & distance filter`
- `✔ API: Blood request creation, matching & acceptance`
- `✔ API: Agora Token generation`
- `✔ API: Realtime GPS Location update & retrieval`
- `✔ API: Admin statistics endpoint`
- **Total: 13 passed, 0 failed**

---

## 6. Security & Rules

- `firestore.rules`: Strict Cloud Firestore security rules ensuring authenticated access, role authorization, and ownership checks.
- `database.rules.json`: Ephemeral Realtime Database rules restricting GPS tracking only to active request participants.
- Zero private keys or credentials exposed in frontend code.

>>>>>>> 46d65f8 (latest repo)
