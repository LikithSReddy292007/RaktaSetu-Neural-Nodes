import test from 'node:test';
import assert from 'node:assert/strict';
import app, { server } from '../index.js';
import { admin } from '../config/firebase.js';
import { Server } from 'http';

let activeServer: Server;
let baseUrl: string;

test.before(async () => {
  return new Promise<void>((resolve) => {
    if (server && server.listening) {
      activeServer = server;
      baseUrl = 'http://localhost:5000';
      resolve();
    } else {
      activeServer = app.listen(0, () => {
        const addr = activeServer.address();
        const port = typeof addr === 'object' && addr ? addr.port : 5001;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    }
  });
});

test.after(async () => {
  try {
    if (admin.apps && admin.apps.length > 0) {
      if (admin.database) {
        admin.database().goOffline();
      }
      await admin.app().delete();
    }
  } catch (e) {}

  await new Promise<void>((resolve) => {
    if (activeServer) {
      activeServer.close(() => resolve());
    } else {
      resolve();
    }
  });

  setTimeout(() => process.exit(0), 100);
});

test('API: GET /health returns status healthy', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const json = (await res.json()) as any;
  assert.equal(json.status, 'healthy');
  assert.equal(json.service, 'RakthaSetu Backend API');
});

test('API: Module 1 - Multi-Step Donor Registration & Health Screening', async () => {
  const uniqueEmail = `donor_${Date.now()}@example.com`;

  // 1. Submit multi-step donor registration
  const regRes = await fetch(`${baseUrl}/api/donors/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Aditya Sharma',
      blood_group: 'B+',
      country: 'India',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city: 'Bengaluru',
      last_alcohol_consumption: 'Within the last 24 hours', // Disqualifies temporarily
      days_since_last_tattoo: 0,
      email: uniqueEmail,
    }),
  });

  assert.equal(regRes.status, 201);
  const regJson = (await regRes.json()) as any;
  assert.equal(regJson.success, true);
  assert.equal(regJson.data.full_name, 'Aditya Sharma');
  assert.equal(regJson.data.blood_group, 'B+');
  assert.equal(regJson.screening_status, 'temporarily_disqualified');
  assert.equal(regJson.data.is_available, false);
});

test('API: Module 2 - Blood Request Submission with Medical Proofs', async () => {
  // 1. Attempt submission without medical proof -> should fail
  const failRes = await fetch(`${baseUrl}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: 'Vikram S',
      blood_group: 'B+',
      hospital: 'Apollo Hospital',
      location: 'Sheshadripuram, Bengaluru',
      severity: 'High — Emergency',
    }),
  });
  assert.equal(failRes.status, 400, 'Must require doctor_prescription and admission_proof');

  // 2. Submit with both mandatory medical documents
  const successRes = await fetch(`${baseUrl}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: 'Vikram S',
      blood_group: 'B+',
      hospital: 'Apollo Hospital',
      location: 'Sheshadripuram, Bengaluru',
      severity: 'High — Emergency',
      units_needed: 1,
      doctor_prescription: {
        filename: 'rx_apollo_vikram.pdf',
        mime_type: 'application/pdf',
        size_bytes: 256000,
      },
      admission_proof: {
        filename: 'admission_card.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 340000,
      },
    }),
  });

  assert.equal(successRes.status, 201);
  const json = (await successRes.json()) as any;
  assert.equal(json.success, true);
  assert.equal(json.data.status, 'pending_verification', 'New request must enter Pending Verification');
  assert.equal(json.data.verification_status, 'pending');

  const reqId = json.data.id;

  // 3. Module 4: Authorized Medical Document Verification
  const verifyRes = await fetch(`${baseUrl}/api/requests/${reqId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo_admin_super',
    },
    body: JSON.stringify({ status: 'verified' }),
  });

  assert.equal(verifyRes.status, 200);
  const verifyJson = (await verifyRes.json()) as any;
  assert.equal(verifyJson.data.status, 'matching', 'Approved request must enter matching status');

  // Register a donor to test acceptance
  const donorRegRes = await fetch(`${baseUrl}/api/donors/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Verified Donor Test',
      blood_group: 'B+',
      country: 'India',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city: 'Bengaluru',
      last_alcohol_consumption: 'Never consumed',
      days_since_last_tattoo: 300,
      email: `acceptor_${Date.now()}@example.com`,
    }),
  });
  const donorRegJson = (await donorRegRes.json()) as any;
  const donorAuthToken = donorRegJson.token;
  const donorUserId = donorRegJson.data.id;

  // 4. Module 3: Nearby Emergency Alert for Eligible Donor
  const alertRes = await fetch(`${baseUrl}/api/requests/nearby-for-donor?group=B+&lat=12.9716&lng=77.5946`);
  assert.equal(alertRes.status, 200);
  const alertJson = (await alertRes.json()) as any;
  assert.equal(alertJson.success, true);
  assert.ok(alertJson.data);
  assert.ok(typeof alertJson.data.distance_km === 'number');

  // 5. Module 4: Accept Request and Prevent Duplicate Acceptance
  const acceptRes = await fetch(`${baseUrl}/api/requests/${reqId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${donorAuthToken}`,
    },
  });
  assert.equal(acceptRes.status, 200);
  const acceptJson = (await acceptRes.json()) as any;
  assert.equal(acceptJson.data.status, 'accepted');

  // Duplicate acceptance attempt by same donor
  const dupRes = await fetch(`${baseUrl}/api/requests/${reqId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${donorAuthToken}`,
    },
  });
  assert.equal(dupRes.status, 409, 'Duplicate acceptance must be rejected');

  // 6. Realtime GPS Location update & retrieval on active request
  const updateRes = await fetch(`${baseUrl}/api/location/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: reqId,
      user_id: donorUserId,
      lat: 12.9750,
      lng: 77.6420,
      heading: 90,
      speed: 30,
    }),
  });
  assert.equal(updateRes.status, 200);

  const getRes = await fetch(`${baseUrl}/api/location/${reqId}/${donorUserId}`);
  assert.equal(getRes.status, 200);
  const getJson = (await getRes.json()) as any;
  assert.equal(getJson.success, true);
  assert.equal(getJson.data.lat, 12.9750);

  // 7. Anti-Payment Chat Detector Test
  // Block payment messages
  const payBlockRes = await fetch(`${baseUrl}/api/chat/${reqId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Please send 500 rupees via UPI or Google Pay for donating blood',
      sender_role: 'donor',
      sender_name: 'Test User',
    }),
  });
  assert.equal(payBlockRes.status, 400);
  const payBlockJson = (await payBlockRes.json()) as any;
  assert.equal(payBlockJson.blocked, true);

  // Allow voluntary medical coordination messages
  const cleanChatRes = await fetch(`${baseUrl}/api/chat/${reqId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'I am on my way to the blood bank. I should be there in 15 minutes.',
      sender_role: 'donor',
      sender_name: 'Verified Donor Test',
    }),
  });
  assert.equal(cleanChatRes.status, 201);
  const cleanChatJson = (await cleanChatRes.json()) as any;
  assert.equal(cleanChatJson.success, true);

  // 8. Terminate Request Test
  const termRes = await fetch(`${baseUrl}/api/requests/${reqId}/terminate`, {
    method: 'POST',
  });
  assert.equal(termRes.status, 200);
  const termJson = (await termRes.json()) as any;
  assert.equal(termJson.data.status, 'cancelled');
});

test('API: Agora Token generation', async () => {
  const res = await fetch(`${baseUrl}/api/agora/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelName: 'consultation_channel_test',
      role: 'publisher',
      uid: 99,
    }),
  });
  assert.equal(res.status, 200);
  const json = (await res.json()) as any;
  assert.equal(json.success, true);
  assert.ok(json.data.token);
  assert.equal(json.data.channelName, 'consultation_channel_test');
});

test('API: Admin statistics endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/admin/stats`);
  assert.equal(res.status, 200);
  const json = (await res.json()) as any;
  assert.equal(json.success, true);
  assert.ok(json.data.total_donors > 0);
  assert.ok(json.data.blood_group_distribution);
});
