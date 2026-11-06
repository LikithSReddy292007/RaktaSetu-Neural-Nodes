import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Droplet,
  Eye,
  FileText,
  HeartPulse,
  Hospital,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface AdminDashboardProps {
  onSignOut: () => void;
  showNotice: (msg: string) => void;
}

export function AdminDashboard({ onSignOut, showNotice }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'requests'>('overview');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; filename: string; data?: string; mime: string } | null>(
    null
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, reqRes] = await Promise.all([
        api.getAdminStats().catch(() => ({ data: null })),
        api.getAdminUsers().catch(() => ({ data: [] })),
        api.getRequests().catch(() => ({ data: [] })),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (reqRes.data) setRequests(reqRes.data);
    } catch (err: any) {
      console.warn('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleVerifyDonor = async (userId: string, userName: string) => {
    try {
      await api.verifyDonor(userId);
      showNotice(`Donor ${userName} has been successfully verified.`);
      void loadData();
    } catch (err: any) {
      showNotice(err.message || 'Failed to verify donor.');
    }
  };

  const handleVerifyMedicalRequest = async (requestId: string, status: 'verified' | 'rejected') => {
    try {
      let reason: string | undefined;
      if (status === 'rejected') {
        const inputReason = window.prompt('Enter rejection reason for this medical request:');
        if (inputReason === null) return; // User cancelled
        reason = inputReason || 'Medical proofs do not meet validation criteria.';
      }

      await api.verifyMedicalRequest(requestId, status, reason);
      showNotice(
        status === 'verified'
          ? 'Medical proof verified! Matching in progress and alerts broadcasted to donors.'
          : 'Request verification rejected.'
      );
      void loadData();
    } catch (err: any) {
      showNotice(err.message || 'Failed to update request verification status.');
    }
  };

  const pendingMedicalRequests = requests.filter(
    (r) => r.status === 'pending_verification' || r.verification_status === 'pending'
  );

  return (
    <section className="page-section section-wrap">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow dark">ADMINISTRATOR CONTROL</span>
          <h1>
            Platform <em>Operations.</em>
          </h1>
          <p>Real-time platform metrics, medical document verification queue, and emergency blood request management.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="button button-secondary" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rs-chip-row" style={{ marginTop: '24px', marginBottom: '24px', display: 'flex', gap: '8px' }}>
        <button
          className={`rs-chip ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{
            border: '1px solid #dcd1c4',
            background: activeTab === 'overview' ? '#b13026' : '#fffdf9',
            color: activeTab === 'overview' ? '#fff' : '#61564e',
            padding: '8px 14px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Activity size={14} /> Analytics & Inventory
        </button>
        <button
          className={`rs-chip ${activeTab === 'verifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('verifications')}
          style={{
            border: '1px solid #dcd1c4',
            background: activeTab === 'verifications' ? '#b13026' : '#fffdf9',
            color: activeTab === 'verifications' ? '#fff' : '#61564e',
            padding: '8px 14px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            position: 'relative',
          }}
        >
          <ShieldCheck size={14} /> Verification Queue
          {pendingMedicalRequests.length > 0 && (
            <span
              style={{
                background: activeTab === 'verifications' ? '#fff' : '#b13026',
                color: activeTab === 'verifications' ? '#b13026' : '#fff',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 800,
              }}
            >
              {pendingMedicalRequests.length}
            </span>
          )}
        </button>
        <button
          className={`rs-chip ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
          style={{
            border: '1px solid #dcd1c4',
            background: activeTab === 'requests' ? '#b13026' : '#fffdf9',
            color: activeTab === 'requests' ? '#fff' : '#61564e',
            padding: '8px 14px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <HeartPulse size={14} /> Request Monitor
        </button>
      </div>

      {loading && <p className="rs-loading">Loading administrative platform data…</p>}

      {/* TAB 1: OVERVIEW & INVENTORY */}
      {!loading && activeTab === 'overview' && (
        <div>
          <div className="activity-summary" style={{ marginTop: '10px' }}>
            <div>
              <span className="summary-icon">
                <Users size={18} />
              </span>
              <strong>{stats?.total_donors ?? 12}</strong>
              <small>Registered Donors</small>
            </div>
            <div>
              <span className="summary-icon green">
                <CheckCircle2 size={18} />
              </span>
              <strong>{stats?.verified_donors ?? 8}</strong>
              <small>Verified Donors</small>
            </div>
            <div>
              <span className="summary-icon yellow">
                <ShieldAlert size={18} />
              </span>
              <strong>{pendingMedicalRequests.length}</strong>
              <small>Pending Medical Proofs</small>
            </div>
          </div>

          {/* Blood Group Inventory Distribution */}
          <div className="activity-card" style={{ marginTop: '20px' }}>
            <div className="activity-card-header">
              <h3>Live Blood Group Availability Barometer</h3>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginTop: '16px',
              }}
            >
              {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((grp) => {
                const grpStats = stats?.blood_group_distribution?.[grp] || { donors: 2, requests: 1 };
                return (
                  <div
                    key={grp}
                    style={{
                      background: '#fcfaf6',
                      border: '1px solid #e8ded3',
                      padding: '12px',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#f4dad5',
                        color: '#b13026',
                        fontWeight: 800,
                        fontSize: '13px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        marginBottom: '6px',
                      }}
                    >
                      {grp}
                    </span>
                    <strong style={{ display: 'block', fontSize: '16px', color: '#282421' }}>
                      {grpStats.donors} Donors
                    </strong>
                    <small style={{ color: '#958a81', fontSize: '10px' }}>{grpStats.requests} open requests</small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERIFICATION QUEUE (MODULE 4) */}
      {!loading && activeTab === 'verifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SECTION A: Medical Proof Verification for Blood Requests */}
          <div className="activity-card">
            <div className="activity-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>Emergency Request Medical Proof Verification</h3>
                <small style={{ color: '#887d74', fontSize: '11px' }}>
                  Review doctor prescriptions and admission proofs. Only approved requests become eligible for donor matching.
                </small>
              </div>
              <span
                style={{
                  background: pendingMedicalRequests.length > 0 ? '#fbeae7' : '#edf6ef',
                  color: pendingMedicalRequests.length > 0 ? '#b13026' : '#357143',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {pendingMedicalRequests.length} Pending
              </span>
            </div>

            {pendingMedicalRequests.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#81776f', fontSize: '12px' }}>
                All emergency blood request documents are up to date!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                {pendingMedicalRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      background: '#fffdf9',
                      border: '1px solid #ebdcd0',
                      borderRadius: '6px',
                      padding: '16px 18px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              background: '#b13026',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            {req.blood_group}
                          </span>
                          <strong style={{ fontSize: '15px', color: '#2b2521' }}>{req.patient_name}</strong>
                          <span
                            style={{
                              background: '#fbeae7',
                              color: '#b13026',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                            }}
                          >
                            {req.severity || req.urgency.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: '2px 0 6px', fontSize: '12px', color: '#685d54' }}>
                          <Hospital size={13} style={{ display: 'inline', marginRight: '4px' }} />
                          {req.hospital} · {req.location}
                        </p>
                        {req.notes && (
                          <small style={{ color: '#887d74', fontStyle: 'italic', display: 'block', marginBottom: '8px' }}>
                            Notes: “{req.notes}”
                          </small>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="button button-primary"
                          style={{ minHeight: '34px', fontSize: '11px', padding: '0 12px' }}
                          onClick={() => handleVerifyMedicalRequest(req.id, 'verified')}
                        >
                          <Check size={14} /> Approve & Match Donors
                        </button>
                        <button
                          className="button button-secondary"
                          style={{ minHeight: '34px', fontSize: '11px', padding: '0 10px', color: '#b13026', borderColor: '#e5b9b4' }}
                          onClick={() => handleVerifyMedicalRequest(req.id, 'rejected')}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </div>

                    {/* Medical Proof Documents Display */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '10px',
                        background: '#f9f6f1',
                        border: '1px solid #eadfd4',
                        padding: '10px 12px',
                        borderRadius: '4px',
                        marginTop: '12px',
                      }}
                    >
                      {/* Doctor Prescription */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                          <FileText size={15} color="#b13026" />
                          <div>
                            <strong style={{ display: 'block', fontSize: '11px' }}>Doctor Prescription</strong>
                            <small style={{ color: '#887d74' }}>
                              {req.doctor_prescription_doc?.filename || 'Prescription Document'}
                            </small>
                          </div>
                        </div>
                        {req.doctor_prescription_doc?.file_data && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                title: 'Doctor Prescription',
                                filename: req.doctor_prescription_doc.filename,
                                data: req.doctor_prescription_doc.file_data,
                                mime: req.doctor_prescription_doc.mime_type,
                              })
                            }
                            style={{
                              border: '1px solid #d8ccc1',
                              background: '#fff',
                              padding: '3px 8px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        )}
                      </div>

                      {/* Admission Proof */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                          <ShieldCheck size={15} color="#488758" />
                          <div>
                            <strong style={{ display: 'block', fontSize: '11px' }}>Admission Proof</strong>
                            <small style={{ color: '#887d74' }}>
                              {req.admission_proof_doc?.filename || 'Admission Record / Pass'}
                            </small>
                          </div>
                        </div>
                        {req.admission_proof_doc?.file_data && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                title: 'Hospital Admission Proof',
                                filename: req.admission_proof_doc.filename,
                                data: req.admission_proof_doc.file_data,
                                mime: req.admission_proof_doc.mime_type,
                              })
                            }
                            style={{
                              border: '1px solid #d8ccc1',
                              background: '#fff',
                              padding: '3px 8px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION B: Donor Verification Requests */}
          <div className="activity-card">
            <div className="activity-card-header">
              <h3>Donor Verification Queue</h3>
            </div>
            {users.length === 0 ? (
              <p style={{ padding: '20px', color: '#81776f', fontSize: '12px' }}>No pending donor records.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {users
                  .filter((u) => u.role === 'donor')
                  .map((donor) => (
                    <div
                      key={donor.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#fffdf9',
                        border: '1px solid #e8ded3',
                        padding: '14px',
                        borderRadius: '4px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#282421' }}>{donor.full_name}</strong>
                          <span
                            style={{
                              background: '#f4dad5',
                              color: '#b13026',
                              fontWeight: 800,
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '8px',
                            }}
                          >
                            {donor.blood_group}
                          </span>
                          {donor.is_verified ? (
                            <span style={{ color: '#5c9a6d', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <ShieldCheck size={13} /> Verified
                            </span>
                          ) : (
                            <span style={{ color: '#d29c44', fontSize: '11px', fontWeight: 600 }}>
                              Pending Review
                            </span>
                          )}
                          {donor.eligibility_screening_status && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background:
                                  donor.eligibility_screening_status === 'temporarily_disqualified'
                                    ? '#fce8e6'
                                    : '#eef6f0',
                                color:
                                  donor.eligibility_screening_status === 'temporarily_disqualified'
                                    ? '#b13026'
                                    : '#3c794a',
                              }}
                            >
                              {donor.eligibility_screening_status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <small style={{ color: '#958a81', fontSize: '11px' }}>
                          {donor.location} · {donor.phone} · Tattoos: {donor.days_since_last_tattoo ?? 0} days · Alcohol:{' '}
                          {donor.last_alcohol_consumption || 'N/A'}
                        </small>
                      </div>

                      {!donor.is_verified && (
                        <button
                          className="button button-primary"
                          style={{ minHeight: '34px', padding: '0 12px', fontSize: '11px' }}
                          onClick={() => handleVerifyDonor(donor.id, donor.full_name)}
                        >
                          <Check size={14} /> Approve & Verify
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REQUEST MONITOR */}
      {!loading && activeTab === 'requests' && (
        <div className="activity-card">
          <div className="activity-card-header">
            <h3>Live Blood Request Monitor</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fffdf9',
                  border: '1px solid #e8ded3',
                  padding: '14px',
                  borderRadius: '4px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: '#f4dad5',
                        color: '#b13026',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {req.blood_group}
                    </span>
                    <strong style={{ fontSize: '13px' }}>{req.hospital}</strong>
                    <span
                      style={{
                        background:
                          req.status === 'pending_verification'
                            ? '#fef3c7'
                            : req.status === 'accepted'
                            ? '#d1fae5'
                            : '#fee2e2',
                        color:
                          req.status === 'pending_verification'
                            ? '#92400e'
                            : req.status === 'accepted'
                            ? '#065f46'
                            : '#991b1b',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {req.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <small style={{ color: '#958a81', fontSize: '11px' }}>
                    Patient: {req.patient_name} · {req.location} · {req.units_needed} units needed · Severity:{' '}
                    <b>{req.severity || req.urgency}</b>
                  </small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#a79b90', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock3 size={12} /> {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setPreviewDoc(null)}
        >
          <div className="modal" style={{ maxWidth: '620px', padding: '28px' }}>
            <button className="modal-close" onClick={() => setPreviewDoc(null)}>
              <X size={19} />
            </button>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px' }}>{previewDoc.title}</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#887d74' }}>
              Document: {previewDoc.filename} ({previewDoc.mime})
            </p>

            {previewDoc.mime.startsWith('image/') && previewDoc.data ? (
              <img
                src={previewDoc.data}
                alt={previewDoc.title}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  border: '1px solid #e5ded5',
                  borderRadius: '4px',
                }}
              />
            ) : (
              <div
                style={{
                  background: '#f7f3ec',
                  padding: '30px',
                  textAlign: 'center',
                  borderRadius: '4px',
                  border: '1px dashed #cfc2b5',
                }}
              >
                <FileText size={36} color="#b13026" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ fontSize: '13px', color: '#443c36', margin: '0 0 12px' }}>
                  PDF Document: <strong>{previewDoc.filename}</strong>
                </p>
                {previewDoc.data ? (
                  <a
                    href={previewDoc.data}
                    download={previewDoc.filename}
                    className="button button-primary"
                    style={{ fontSize: '11px', minHeight: '34px' }}
                  >
                    Download & Inspect PDF
                  </a>
                ) : (
                  <span style={{ fontSize: '11px', color: '#887d74' }}>Document content securely registered.</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
