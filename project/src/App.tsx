import { FormEvent, useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Droplet,
  FileCheck,
  HeartPulse,
  Hospital,
  House,
  Menu,
  Moon,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Video,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { InteractiveDonorMap } from '@/components/InteractiveDonorMap';
import { VideoCallModal } from '@/components/VideoCallModal';
import { DocumentVerificationModal } from '@/components/DocumentVerificationModal';
import { LiveLocationTracker } from '@/components/LiveLocationTracker';
import { NotificationDrawer } from '@/components/NotificationDrawer';
import { AdminDashboard } from '@/components/AdminDashboard';
import { DonorRegistrationModal } from '@/components/DonorRegistrationModal';
import { BloodRequestModal } from '@/components/BloodRequestModal';
import { NearbyEmergencyNotification } from '@/components/NearbyEmergencyNotification';
import { LiveRouteTracker } from '@/components/LiveRouteTracker';

type ModalType = 'request' | 'donor' | 'ocr' | null;
type UserRole = 'donor' | 'requester' | 'admin';
type View = 'home' | 'requests' | 'donors' | 'activity' | 'auth' | 'donorDashboard' | 'requesterDashboard' | 'adminDashboard';
type AuthMode = 'login' | 'signup';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth: string;
  role: UserRole;
  blood_group: string;
  location: string;
  is_available: boolean;
  is_verified?: boolean;
  last_donation_date?: string;
  donation_count?: number;
}

const availabilityStock = [
  { group: 'O+', units: '24 units', tone: 'good' },
  { group: 'A+', units: '18 units', tone: 'good' },
  { group: 'B+', units: '12 units', tone: 'medium' },
  { group: 'AB+', units: '08 units', tone: 'medium' },
  { group: 'O−', units: '06 units', tone: 'low' },
];

function App() {
  const [intro, setIntro] = useState(true);
  const [view, setView] = useState<View>('home');
  const [modal, setModal] = useState<ModalType>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [available, setAvailable] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authRole, setAuthRole] = useState<UserRole>('donor');
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');
  const [chatOpen, setChatOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Video Call State
  const [videoCallData, setVideoCallData] = useState<{ channelName: string; recipientName: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1200);

    // Load initial authenticated profile if token exists
    void (async () => {
      try {
        const res = await api.getMe();
        if (res.data) {
          setProfile(res.data);
          setAvailable(res.data.is_available);
        }
      } catch {
        // No active session
      }
    })();

    // Poll/check unread notifications count
    void (async () => {
      try {
        const notifRes = await api.getNotifications();
        if (notifRes.data) {
          setUnreadNotifCount(notifRes.data.filter((n: any) => !n.read).length);
        }
      } catch {
        // Ignore
      }
    })();

    return () => window.clearTimeout(timer);
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.getMe();
      if (res.data) {
        setProfile(res.data);
        setAvailable(res.data.is_available);
        if (res.data.role === 'admin') setView('adminDashboard');
        else if (res.data.role === 'donor') setView('donorDashboard');
        else setView('requesterDashboard');
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const navigate = (nextView: View) => {
    setView(nextView);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (role: UserRole, mode: AuthMode = 'signup') => {
    setAuthRole(role);
    setAuthMode(mode);
    navigate('auth');
  };

  const signOut = () => {
    api.logout();
    setProfile(null);
    navigate('home');
    showNotice(language === 'EN' ? 'You have been signed out.' : 'आप साइन आउट हो गए हैं।');
  };

  if (intro) return <Intro />;

  if (view === 'auth') {
    return (
      <AuthPage
        mode={authMode}
        role={authRole}
        onModeChange={setAuthMode}
        onRoleChange={setAuthRole}
        onComplete={async (message) => {
          await loadProfile();
          showNotice(message);
        }}
        onHome={() => navigate('home')}
      />
    );
  }

  const openRequest = () => setModal('request');
  const openDonor = () => setModal('donor');
  const dashboard = profile?.role === 'admin' ? 'adminDashboard' : profile?.role === 'donor' ? 'donorDashboard' : 'requesterDashboard';

  return (
    <div className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="Go to RaktaSetu home">
          <span className="brand-mark">
            <Droplet size={19} fill="currentColor" />
          </span>
          <span>RaktaSetu</span>
          <small>रक्तसेतु</small>
        </button>

        <nav className={`desktop-nav ${menuOpen ? 'is-open' : ''}`}>
          <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>
            <House size={16} /> Overview
          </button>
          <button className={view === 'requests' ? 'active' : ''} onClick={() => navigate('requests')}>
            <HeartPulse size={16} /> Blood requests
          </button>
          <button className={view === 'donors' ? 'active' : ''} onClick={() => navigate('donors')}>
            <Users size={16} /> Find a donor
          </button>
          <button
            className={view === dashboard ? 'active' : ''}
            onClick={() => (profile ? navigate(dashboard) : openAuth('donor', 'login'))}
          >
            <Activity size={16} /> {profile?.role === 'admin' ? 'Admin Panel' : 'My dashboard'}
          </button>
        </nav>

        <div className="top-actions">
          <button
            className="icon-button notification"
            aria-label="Notifications"
            onClick={() => setNotifOpen(true)}
          >
            <Bell size={19} />
            {unreadNotifCount > 0 && <i />}
          </button>

          <button
            className="language"
            onClick={() => setLanguage(language === 'EN' ? 'HI' : 'EN')}
            aria-label="Change language"
          >
            {language === 'EN' ? 'EN' : 'हि'} <ChevronDown size={14} />
          </button>

          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className="chat-header-button" onClick={() => setChatOpen(true)} aria-label="Open chat">
            <MessageCircle size={17} />
            <span>Chat</span>
          </button>

          {profile ? (
            <button className="profile-chip" onClick={() => navigate(dashboard)}>
              <span>{profile.full_name.slice(0, 2).toUpperCase()}</span>
              <span className="profile-name">{profile.full_name}</span>
              <ChevronDown size={14} />
            </button>
          ) : (
            <button className="login-link" onClick={() => openAuth('donor', 'login')}>
              Log in
            </button>
          )}

          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            <Menu size={22} />
          </button>
        </div>
      </header>

      <main>
        {view === 'home' && (
          <Home
            onRequest={openRequest}
            onDonor={openDonor}
            onNavigate={navigate}
            available={available}
            setAvailable={setAvailable}
            showNotice={showNotice}
          />
        )}

        {view === 'requests' && (
          <Requests
            onRequest={openRequest}
            showNotice={showNotice}
            onCall={(channelName, recipientName) => setVideoCallData({ channelName, recipientName })}
          />
        )}

        {view === 'donors' && (
          <Donors
            onDonor={openDonor}
            showNotice={showNotice}
            onRequestBlood={openRequest}
            onCall={(channelName, recipientName) => setVideoCallData({ channelName, recipientName })}
          />
        )}

        {view === 'activity' && <ActivityView showNotice={showNotice} />}

        {view === 'donorDashboard' && profile && (
          <DonorDashboard
            profile={profile}
            available={available}
            onAvailability={async (value) => {
              setAvailable(value);
              try {
                await api.toggleAvailability(value);
                showNotice(value ? 'You are now available to help.' : 'You are now marked unavailable.');
              } catch (err: any) {
                showNotice(err.message || 'Error updating availability');
              }
            }}
            onVerifyClick={() => setModal('ocr')}
            onSignOut={signOut}
            showNotice={showNotice}
            onCall={(channelName, recipientName) => setVideoCallData({ channelName, recipientName })}
            onProfileRefresh={loadProfile}
          />
        )}

        {view === 'requesterDashboard' && profile && (
          <RequesterDashboard
            profile={profile}
            onRequest={() => setModal('request')}
            onSignOut={signOut}
            showNotice={showNotice}
            onCall={(channelName, recipientName) => setVideoCallData({ channelName, recipientName })}
            onProfileRefresh={loadProfile}
          />
        )}

        {view === 'adminDashboard' && profile && (
          <AdminDashboard onSignOut={signOut} showNotice={showNotice} />
        )}
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark">
            <Droplet size={17} fill="currentColor" />
          </span>
          <strong>RaktaSetu</strong>
        </div>
        <span>Every drop connects a life.</span>
        <span className="footer-copy">© 2026 RaktaSetu · Built for Bengaluru</span>
      </footer>

      {modal && (
        <FormModal
          type={modal}
          profile={profile}
          onClose={() => setModal(null)}
          onComplete={async (message) => {
            setModal(null);
            await loadProfile();
            showNotice(message);
          }}
          onOpenOcr={() => setModal('ocr')}
        />
      )}

      {videoCallData && (
        <VideoCallModal
          channelName={videoCallData.channelName}
          recipientName={videoCallData.recipientName}
          onClose={() => setVideoCallData(null)}
        />
      )}

      {notifOpen && (
        <NotificationDrawer
          userId={profile?.id}
          onClose={() => {
            setNotifOpen(false);
            setUnreadNotifCount(0);
          }}
          onSelectRequest={(_reqId) => {
            navigate('requests');
          }}
        />
      )}

      {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
      {supportOpen && <SupportBot onClose={() => setSupportOpen(false)} />}

      <button className="support-fab" onClick={() => setSupportOpen(!supportOpen)} aria-label="Open RaktaSetu supporter">
        <Sparkles size={17} /> <span>Support</span>
      </button>

      {notice && (
        <div className="toast">
          <span className="toast-icon">
            <Check size={15} />
          </span>
          {notice}
        </div>
      )}
    </div>
  );
}

function AuthPage({
  mode,
  role,
  onModeChange,
  onRoleChange,
  onComplete,
  onHome,
}: {
  mode: AuthMode;
  role: UserRole;
  onModeChange: (mode: AuthMode) => void;
  onRoleChange: (role: UserRole) => void;
  onComplete: (message: string) => void;
  onHome: () => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      if (isSignup) {
        await api.register({
          email: String(values.email),
          full_name: String(values.full_name),
          phone: String(values.phone),
          date_of_birth: String(values.date_of_birth),
          role,
          blood_group: String(values.blood_group),
          location: String(values.location),
        });
        onComplete(role === 'donor' ? 'Your donor profile is ready.' : 'Your requester profile is ready.');
      } else {
        await api.login(String(values.email));
        onComplete('Welcome back to RaktaSetu.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-side">
        <button className="brand" onClick={onHome}>
          <span className="brand-mark">
            <Droplet size={19} fill="currentColor" />
          </span>
          <span>RaktaSetu</span>
          <small>रक्तसेतु</small>
        </button>
        <div className="auth-side-copy">
          <span className="eyebrow light">A LITTLE HELP GOES A LONG WAY</span>
          <h1>
            Every drop
            <br />
            <em>connects</em> a life.
          </h1>
          <p>A trusted space for people who give, people who need, and everyone in between.</p>
        </div>
        <span className="auth-side-foot">
          <ShieldCheck size={15} /> Private by design · Always free
        </span>
      </div>

      <div className="auth-panel">
        <button className="back-link" onClick={onHome}>
          <ArrowRight size={15} style={{ transform: 'rotate(180deg)' }} /> Back to home
        </button>
        <div className="auth-panel-inner">
          <span className="eyebrow dark">{isSignup ? 'CREATE YOUR PROFILE' : 'WELCOME BACK'}</span>
          <h2>{isSignup ? 'Join RaktaSetu.' : 'Sign in to continue.'}</h2>
          <p>{isSignup ? 'A few details help us make the right connection.' : 'Access your dashboard and keep your impact moving.'}</p>

          <div className="role-switch">
            <button className={role === 'donor' ? 'active' : ''} onClick={() => onRoleChange('donor')}>
              <Droplet size={15} /> I want to donate
            </button>
            <button className={role === 'requester' ? 'active' : ''} onClick={() => onRoleChange('requester')}>
              <HeartPulse size={15} /> I need blood
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label>
                Full name
                <input name="full_name" required placeholder="e.g. Ananya Rao" />
              </label>
            )}
            <label>
              Email address
              <input name="email" required type="email" placeholder="you@example.com" />
            </label>
            {isSignup && (
              <div className="form-grid">
                <label>
                  Phone number
                  <input name="phone" required type="tel" placeholder="10-digit number" />
                </label>
                <label>
                  Date of birth
                  <input name="date_of_birth" required type="date" />
                </label>
              </div>
            )}
            <label>
              Password
              <input name="password" required type="password" minLength={6} placeholder="At least 6 characters" />
            </label>

            {isSignup && (
              <>
                <div className="form-grid">
                  <label>
                    Blood group
                    <select name="blood_group" required defaultValue="">
                      <option value="" disabled>
                        Select group
                      </option>
                      <option>O+</option>
                      <option>A+</option>
                      <option>B+</option>
                      <option>AB+</option>
                      <option>O-</option>
                      <option>A-</option>
                      <option>B-</option>
                      <option>AB-</option>
                    </select>
                  </label>
                  <label>
                    City / area
                    <input name="location" required placeholder="e.g. Indiranagar, Bengaluru" />
                  </label>
                </div>
                <label className="checkbox-label">
                  <input type="checkbox" required /> I agree to use RaktaSetu responsibly and keep other people’s information private.
                </label>
              </>
            )}

            {error && <div className="form-error">{error}</div>}

            <button className="button button-primary full-width" disabled={busy}>
              {busy ? 'Please wait…' : isSignup ? 'Create my profile' : 'Log in'} <ArrowRight size={16} />
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to RaktaSetu?'}{' '}
            <button onClick={() => onModeChange(isSignup ? 'login' : 'signup')}>
              {isSignup ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function DonorDashboard({
  profile,
  available,
  onAvailability,
  onVerifyClick,
  onSignOut,
  showNotice,
  onCall,
  onProfileRefresh,
}: {
  profile: Profile;
  available: boolean;
  onAvailability: (value: boolean) => void;
  onVerifyClick: () => void;
  onSignOut: () => void;
  showNotice: (msg: string) => void;
  onCall: (channelName: string, recipientName: string) => void;
  onProfileRefresh?: () => void;
}) {
  const [matchingRequests, setMatchingRequests] = useState<any[]>([]);
  const [activeAcceptedRequest, setActiveAcceptedRequest] = useState<any | null>(null);

  // 90-Day Cooldown Calculation
  const lastDonationTime = profile.last_donation_date ? new Date(profile.last_donation_date).getTime() : 0;
  const daysSinceDonation = lastDonationTime > 0 ? Math.floor((Date.now() - lastDonationTime) / (1000 * 60 * 60 * 24)) : 999;
  const cooldownDaysRemaining = Math.max(0, 90 - daysSinceDonation);
  const isInCooldown = cooldownDaysRemaining > 0;
  const nextEligibleDate = new Date(lastDonationTime + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    async function loadMatches() {
      // If donor is in 90-day cooldown, no requests are dispatched to them
      if (isInCooldown) {
        setMatchingRequests([]);
        return;
      }

      try {
        const res = await api.getRequests();
        if (res.data) {
          // Strictly show verified, genuine requests (no dummy fallbacks)
          const activeOnly = res.data.filter(
            (r: any) => r.status === 'matching' || r.status === 'verified' || r.status === 'accepted'
          );
          setMatchingRequests(activeOnly.slice(0, 5));

          // If there's an accepted request where this donor is assigned
          const accepted = res.data.find(
            (r: any) =>
              r.status === 'accepted' &&
              (r.accepted_donor_id === profile.id || r.accepted_donor_name === profile.full_name)
          );
          if (accepted) {
            setActiveAcceptedRequest(accepted);
          } else if (activeAcceptedRequest && activeAcceptedRequest.status === 'accepted') {
            // Check if current accepted request was terminated or completed
            const currentInDb = res.data.find((r: any) => r.id === activeAcceptedRequest.id);
            if (!currentInDb || currentInDb.status !== 'accepted') {
              setActiveAcceptedRequest(null);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load matching requests:', err);
      }
    }
    void loadMatches();
    const timer = window.setInterval(loadMatches, 3000);
    return () => window.clearInterval(timer);
  }, [profile.id, isInCooldown]);

  const handleAccept = async (requestId: string, hospital: string) => {
    if (isInCooldown) {
      showNotice(`You cannot accept requests while in your 90-day recovery cooldown until ${nextEligibleDate}.`);
      return;
    }

    try {
      const res = await api.acceptRequest(requestId);
      const reqObj = res.data || matchingRequests.find((m) => m.id === requestId);
      if (reqObj) setActiveAcceptedRequest(reqObj);
      showNotice(`You have accepted the request for ${hospital}. GPS turn-by-turn navigation active.`);
    } catch (err: any) {
      showNotice(err.message || 'Error accepting request.');
    }
  };

  return (
    <section className="page-section section-wrap">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow dark">DONOR DASHBOARD</span>
          <h1>
            Hello, <em>{profile.full_name.split(' ')[0]}.</em>
          </h1>
          <p>Your profile is ready to make a difference in Bengaluru.</p>
        </div>
        <button className="button button-secondary" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="profile-card">
          <div className="dashboard-avatar">{profile.full_name.slice(0, 2).toUpperCase()}</div>
          <h3>{profile.full_name}</h3>
          <span className="profile-role">
            {profile.is_verified ? 'Verified donor' : 'Registered donor'}
          </span>

          <div className="profile-details">
            <span>
              <strong>Blood group</strong>
              <b>{profile.blood_group}</b>
            </span>
            <span>
              <strong>Location</strong>
              <b>{profile.location}</b>
            </span>
            <span>
              <strong>Date of birth</strong>
              <b>{profile.date_of_birth}</b>
            </span>
            <span>
              <strong>Phone</strong>
              <b>{profile.phone}</b>
            </span>
            {profile.donation_count !== undefined && profile.donation_count > 0 && (
              <span>
                <strong>Total donations</strong>
                <b style={{ color: '#2e7d32' }}>{profile.donation_count}</b>
              </span>
            )}
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid #eee6de', paddingTop: '15px' }}>
            <button
              className="button button-secondary full-width"
              style={{ fontSize: '11px', minHeight: '38px' }}
              onClick={onVerifyClick}
            >
              <FileCheck size={14} /> Scan ID / Report OCR
            </button>
          </div>
        </div>

        <div className="dashboard-main">
          {/* 90-Day Mandatory Recovery Cooldown Banner */}
          {isInCooldown && (
            <div
              style={{
                background: '#fffbf9',
                border: '1.5px solid #d7a7a2',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#fce8e6',
                  color: '#b13026',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock3 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#2b2420', fontWeight: 800 }}>
                    Mandatory 90-Day Recovery Cooldown Active
                  </h4>
                  <span
                    style={{
                      background: '#b13026',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ⏳ {cooldownDaysRemaining} DAYS REMAINING
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#685d56', lineHeight: 1.5 }}>
                  Thank you for saving a life! Under clinical safety protocols, your body requires 90
                  days to fully restore hemoglobin and red blood cells. You will not receive any
                  blood requests until <strong>{nextEligibleDate}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Real-time En-Route Navigation & Live Tracking for Accepted Request */}
          {activeAcceptedRequest && (
            <LiveRouteTracker
              request={activeAcceptedRequest}
              role="donor"
              currentUserName={profile.full_name}
              onCall={onCall}
              onNotice={showNotice}
              onStatusChanged={(_newStatus) => {
                setActiveAcceptedRequest(null);
                if (onProfileRefresh) onProfileRefresh();
              }}
            />
          )}

          {/* Module 3: Prominent Nearby Emergency Request Notification Card (Suppressed during 90-day cooldown) */}
          {!isInCooldown && (
            <NearbyEmergencyNotification
              donorGroup={profile.blood_group}
              onAccepted={(acceptedReq) => {
                setActiveAcceptedRequest(acceptedReq);
                showNotice(`You have accepted the emergency blood request for ${acceptedReq.hospital}!`);
              }}
            />
          )}

          <div className="availability-card">
            <div>
              <span className="small-label">YOUR AVAILABILITY</span>
              <h3>
                {isInCooldown
                  ? 'Locked: In Recovery Cooldown'
                  : available
                  ? 'Ready to help'
                  : 'Currently unavailable'}
              </h3>
              <p>
                {isInCooldown
                  ? `Availability is temporarily paused during your 90-day cooldown until ${nextEligibleDate}.`
                  : available
                  ? 'You’ll be notified when someone nearby needs your blood group.'
                  : 'Turn this back on whenever you are ready to help.'}
              </p>
            </div>
            <button
              className={`toggle ${available && !isInCooldown ? 'on' : ''}`}
              onClick={() => {
                if (isInCooldown) {
                  showNotice(`You cannot donate during the 90-day cooldown period. Next eligible: ${nextEligibleDate}`);
                  return;
                }
                onAvailability(!available);
              }}
              disabled={isInCooldown}
              style={isInCooldown ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <span />
            </button>
          </div>

          <div className="dashboard-stat-row">
            <div>
              <span className="summary-icon">
                <Droplet size={18} fill="currentColor" />
              </span>
              <strong>{isInCooldown ? 'Resting' : profile.is_verified ? 'Verified' : 'Active'}</strong>
              <small>Status</small>
            </div>
            <div>
              <span className="summary-icon green">
                <HeartPulse size={18} />
              </span>
              <strong>{isInCooldown ? `${cooldownDaysRemaining}d Left` : 'Ready'}</strong>
              <small>Eligibility status</small>
            </div>
            <div>
              <span className="summary-icon yellow">
                <Navigation size={18} />
              </span>
              <strong>{profile.location.split(',')[0]}</strong>
              <small>Your current area</small>
            </div>
          </div>

          <div className="dashboard-request-list">
            <div className="activity-card-header">
              <h3>Matching requests nearby</h3>
              <span className="live-pill">
                <i /> Live updates
              </span>
            </div>

            {isInCooldown ? (
              <p className="empty-note">
                You are currently in your 90-day recovery cooldown. Blood requests will resume on {nextEligibleDate}.
              </p>
            ) : matchingRequests.length === 0 ? (
              <p className="empty-note">No official blood requests active right now. You’ll be alerted when someone needs blood.</p>
            ) : (
              matchingRequests.map((item) => (
                <div className="dashboard-request" key={item.id}>
                  <span className="blood-badge">{item.blood_group}</span>
                  <div>
                    <strong>{item.hospital}</strong>
                    <small>
                      {item.location} · Patient: {item.patient_name}
                    </small>
                  </div>
                  <span className="urgency">{item.urgency.toUpperCase()}</span>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="text-button"
                      onClick={() => handleAccept(item.id, item.hospital)}
                    >
                      Accept <ArrowRight size={14} />
                    </button>
                    <button
                      className="icon-button"
                      title="Audio/Video Call"
                      onClick={() => onCall(`call_${item.id.replace(/^req_/, '')}`, item.patient_name)}
                    >
                      <Video size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RequesterDashboard({
  profile,
  onRequest,
  onSignOut,
  onCall,
}: {
  profile: Profile;
  onRequest: () => void;
  onSignOut: () => void;
  showNotice: (msg: string) => void;
  onCall: (channelName: string, recipientName: string) => void;
}) {
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    async function loadMyRequests() {
      try {
        const res = await api.getRequests();
        if (res.data) {
          setMyRequests(res.data);
        }
      } catch (err) {
        console.warn('Could not load my requests:', err);
      }
    }
    void loadMyRequests();
    const interval = window.setInterval(loadMyRequests, 3000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="page-section section-wrap">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow dark">REQUESTER DASHBOARD</span>
          <h1>
            We’re here for you, <em>{profile.full_name.split(' ')[0]}.</em>
          </h1>
          <p>Create a request and let verified donors nearby know how they can help.</p>
        </div>
        <button className="button button-secondary" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="profile-card">
          <div className="dashboard-avatar requester-avatar">
            <HeartPulse size={22} />
          </div>
          <h3>{profile.full_name}</h3>
          <span className="profile-role">Requester profile</span>
          <div className="profile-details">
            <span>
              <strong>Blood group</strong>
              <b>{profile.blood_group}</b>
            </span>
            <span>
              <strong>Location</strong>
              <b>{profile.location}</b>
            </span>
            <span>
              <strong>Date of birth</strong>
              <b>{profile.date_of_birth}</b>
            </span>
            <span>
              <strong>Phone</strong>
              <b>{profile.phone}</b>
            </span>
          </div>
        </div>

        <div className="dashboard-main">
          <div className="requester-cta">
            <span className="modal-icon">
              <Droplet size={20} fill="currentColor" />
            </span>
            <div>
              <h3>Need blood for yourself or someone close?</h3>
              <p>Your request is broadcasted to verified matching donors nearby in real time.</p>
            </div>
            <button className="button button-primary" onClick={onRequest}>
              Create blood request <ArrowRight size={16} />
            </button>
          </div>

          <div className="tracking-card">
            <div className="activity-card-header">
              <h3>Active Request Tracking</h3>
              <span className="status-text">{myRequests.length} Requests Active</span>
            </div>

            {myRequests.length === 0 ? (
              <div className="tracking-empty">
                <span className="check-circle">
                  <Search size={16} />
                </span>
                <div>
                  <strong>Your next request will appear here</strong>
                  <small>Track responses, donor connections, and updates in one place.</small>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                {myRequests.map((req) => {
                  const isPending = req.status === 'pending_verification';
                  const isAccepted = req.status === 'accepted';
                  const isMatching = req.status === 'matching' || req.status === 'verified';

                  return (
                    <div
                      key={req.id}
                      style={{
                        border: '1px solid #ebdcd0',
                        background: '#fffdf9',
                        padding: '16px',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="blood-badge">{req.blood_group}</span>
                            <strong style={{ fontSize: '14px', color: '#282421' }}>{req.hospital}</strong>
                            <span
                              style={{
                                background: isPending
                                  ? '#fef3c7'
                                  : isAccepted
                                  ? '#d1fae5'
                                  : isMatching
                                  ? '#e0f2fe'
                                  : '#fee2e2',
                                color: isPending
                                  ? '#92400e'
                                  : isAccepted
                                  ? '#065f46'
                                  : isMatching
                                  ? '#0369a1'
                                  : '#991b1b',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '10px',
                              }}
                            >
                              {req.status === 'pending_verification'
                                ? 'PENDING VERIFICATION'
                                : req.status === 'accepted'
                                ? 'DONOR ACCEPTED 🩸'
                                : req.status === 'matching'
                                ? 'VERIFIED · MATCHING'
                                : req.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <small style={{ color: '#7a7068', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                            Patient: <b>{req.patient_name}</b> · {req.location} · {req.units_needed} units
                          </small>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="button button-secondary"
                            style={{ minHeight: '34px', padding: '0 12px', fontSize: '11px' }}
                            onClick={() => onCall(`call_${req.id.replace(/^req_/, '')}`, req.patient_name)}
                          >
                            <Video size={14} /> Video Call
                          </button>
                        </div>
                      </div>

                      {/* Live Real-time Route and Donor Tracking Map when Accepted */}
                      {isAccepted && (
                        <div style={{ marginTop: '12px' }}>
                          <LiveRouteTracker
                            request={req}
                            role="requester"
                            currentUserName={profile.full_name}
                            onCall={onCall}
                            onNotice={showNotice}
                            onStatusChanged={(_status) => {
                              loadMyRequests();
                            }}
                          />
                        </div>
                      )}

                      {/* Medical Proof Badge */}
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px solid #f1e9df',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: '#8c8075',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileCheck size={14} color="#4b875a" />
                          <span>
                            Medical proof:{' '}
                            {req.doctor_prescription_doc?.filename
                              ? `${req.doctor_prescription_doc.filename} & Admission Proof`
                              : 'Prescription & Admission Record attached'}
                          </span>
                        </span>
                        {isAccepted && (
                          <span style={{ color: '#065f46', fontWeight: 700 }}>
                            Donor connected · Coordinates active
                          </span>
                        )}
                        {isPending && (
                          <span style={{ color: '#92400e', fontStyle: 'italic' }}>
                            Awaiting verification before donor matching
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { from: 'them', text: 'Hello. This is a private RaktaSetu connection. How can we help today?' },
  ]);
  const [draft, setDraft] = useState('');
  const [blocked, setBlocked] = useState(false);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    if (/(pay|payment|money|cash|upi|bank|transfer|fee|charge|रुपये|पैसे)/i.test(text)) {
      setBlocked(true);
      setDraft('');
      return;
    }

    setBlocked(false);
    setMessages((current) => [
      ...current,
      { from: 'me', text },
      {
        from: 'them',
        text: 'Thanks for the update. Please keep communication focused on coordinating the blood donation safely.',
      },
    ]);
    setDraft('');
  };

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="chat-drawer">
        <div className="drawer-header">
          <div>
            <span className="eyebrow dark">SECURE CHAT</span>
            <h3>RaktaSetu connection</h3>
            <small>Donor and requester messages</small>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="chat-safety">
          <ShieldCheck size={15} />
          <span>Never share payment details. RaktaSetu is always free.</span>
        </div>
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div className={`chat-bubble ${message.from === 'me' ? 'mine' : ''}`} key={`${message.text}-${index}`}>
              {message.text}
            </div>
          ))}
          {blocked && (
            <div className="blocked-message">
              <ShieldCheck size={15} />
              <span>
                Payment-related messages are blocked for your safety. No one should ask you for money to donate blood.
              </span>
            </div>
          )}
        </div>
        <form className="chat-compose" onSubmit={send}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message…"
            aria-label="Chat message"
          />
          <button type="submit" aria-label="Send message">
            <ArrowRight size={17} />
          </button>
        </form>
      </aside>
    </div>
  );
}

function SupportBot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'Hi, I’m the RaktaSetu supporter. Ask me about donating, requesting blood, eligibility, or staying safe.',
    },
  ]);
  const [draft, setDraft] = useState('');

  const respond = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;

    const lower = question.toLowerCase();
    const answer = /(payment|money|pay|upi|cash|पैसे|रुपये)/i.test(question)
      ? 'RaktaSetu never asks for payment. Blood donation is a selfless gift. Please report anyone asking for money.'
      : lower.includes('donat')
      ? 'You can donate if you are between 18-65 years old, weigh at least 45kg, and have not donated whole blood in the last 90 days. Register as a donor to start.'
      : lower.includes('request') || lower.includes('blood')
      ? 'Choose "Request blood" from the top menu or hero button. Enter the hospital, location, units, and blood group to notify nearby compatible donors.'
      : 'I can help with donor eligibility, emergency blood requests, maps, and safety rules. What would you like to know?';

    setMessages((current) => [
      ...current,
      { from: 'me', text: question },
      { from: 'bot', text: answer },
    ]);
    setDraft('');
  };

  return (
    <div className="support-bot">
      <div className="support-header">
        <span className="support-icon">
          <Sparkles size={16} />
        </span>
        <div>
          <strong>RaktaSetu supporter</strong>
          <small>Here to help</small>
        </div>
        <button onClick={onClose} aria-label="Close supporter">
          <X size={16} />
        </button>
      </div>
      <div className="support-messages">
        {messages.map((message, index) => (
          <div className={`support-message ${message.from}`} key={`${message.text}-${index}`}>
            {message.text}
          </div>
        ))}
      </div>
      <form className="support-compose" onSubmit={respond}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask a question…" />
        <button type="submit">
          <ArrowRight size={16} />
        </button>
      </form>
      <small className="support-note">
        <ShieldCheck size={12} /> Never share passwords or payment details.
      </small>
    </div>
  );
}

function Intro() {
  return (
    <div className="intro-screen">
      <div className="intro-logo">
        <span className="intro-drop">
          <Droplet size={30} fill="currentColor" />
        </span>
        <strong>RaktaSetu</strong>
        <small>रक्तसेतु</small>
      </div>
      <div className="intro-line">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>Connecting care with kindness</p>
    </div>
  );
}

function Home({
  onRequest,
  onDonor,
  onNavigate,
  available,
  setAvailable,
  showNotice,
}: {
  onRequest: () => void;
  onDonor: () => void;
  onNavigate: (view: View) => void;
  available: boolean;
  setAvailable: (value: boolean) => void;
  showNotice: (message: string) => void;
}) {
  return (
    <>
      {/* Prominent Nearby Emergency Request Notification */}
      <div className="section-wrap" style={{ paddingTop: '16px' }}>
        <NearbyEmergencyNotification
          onAccepted={(acceptedReq) => {
            showNotice(`You accepted the emergency blood request for ${acceptedReq.hospital}!`);
            onNavigate('donorDashboard');
          }}
        />
      </div>

      <section className="hero section-wrap">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="pulse-dot" /> BLOOD DONATION NETWORK <b>·</b> BENGALURU
          </div>
          <h1>
            Every drop
            <br />
            <em>connects</em> a life.
          </h1>
          <p className="hero-description">
            RaktaSetu brings patients, hospitals, and verified donors together when every second matters.
          </p>
          <div className="hero-buttons">
            <button className="button button-primary" onClick={onRequest}>
              Request blood <ArrowRight size={17} />
            </button>
            <button className="button button-secondary" onClick={onDonor}>
              Become a donor
            </button>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={16} /> Verified donors · Private by design · Always free
          </div>
        </div>

        <div className="hero-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="connect-card">
            <div className="connect-top">
              <span className="small-label">LIVE CONNECTION</span>
              <span className="live-pill">
                <i /> Active
              </span>
            </div>
            <div className="connect-route">
              <div className="route-person">
                <span className="person-icon">
                  <Hospital size={19} />
                </span>
                <strong>Manipal Hospital</strong>
                <small>Patient request</small>
              </div>
              <div className="route-line">
                <span />
                <span />
                <ArrowRight size={15} />
              </div>
              <div className="route-person align-right">
                <span className="person-icon donor">
                  <Droplet size={19} fill="currentColor" />
                </span>
                <strong>Riya Kapoor</strong>
                <small>2.4 km away</small>
              </div>
            </div>
            <div className="connect-bottom">
              <Navigation size={14} /> Connected securely <span>Just now</span>
            </div>
          </div>
          <div className="hero-stat stat-one">
            <strong>4,280</strong>
            <span>lives connected</span>
          </div>
          <div className="hero-stat stat-two">
            <span className="mini-avatar">RK</span>
            <div>
              <strong>Riya is on her way</strong>
              <span>O+ · 8 min ago</span>
            </div>
          </div>
        </div>
      </section>

      <div className="availability-bar">
        <div className="section-wrap availability-inner">
          <div className="availability-title">
            <span className="pulse-dot" /> <strong>Live availability</strong>
            <small>Updated just now</small>
          </div>
          {availabilityStock.map((item) => (
            <button key={item.group} className="blood-stock" onClick={() => onNavigate('requests')}>
              <strong>{item.group}</strong>
              <span className={`stock-dot ${item.tone}`} />
              <small>{item.units}</small>
            </button>
          ))}
          <button className="view-all" onClick={() => onNavigate('requests')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <section className="section-wrap intro-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow dark">HOW RAKTASETU WORKS</span>
            <h2>
              Help is closer
              <br />
              <em>than you think.</em>
            </h2>
          </div>
          <p>
            A simple, thoughtful way to make blood donation more human. Whether you need help or can give it, we make the
            connection clear.
          </p>
        </div>
        <div className="steps">
          <Step
            number="01"
            icon={<Search size={20} />}
            title="Tell us what you need"
            text="Share your blood group and hospital location. Our matching engine does the rest."
          />
          <Step
            number="02"
            icon={<Users size={20} />}
            title="Find the right match"
            text="We notify verified, compatible donors nearby with real-time alerts."
          />
          <Step
            number="03"
            icon={<HeartPulse size={20} />}
            title="Make a difference"
            text="Coordinate arrival with live tracking and secure video consultation."
          />
        </div>
      </section>

      <section className="section-wrap dashboard-preview">
        <div className="preview-copy">
          <span className="eyebrow dark">FOR DONORS</span>
          <h2>
            Your kindness,
            <br />
            <em>in motion.</em>
          </h2>
          <p>
            Stay in control of your availability, see requests around you, and know exactly where your donation can help.
          </p>
          <button className="text-button" onClick={onDonor}>
            Explore donor dashboard <ArrowRight size={16} />
          </button>
        </div>

        <div className="preview-panel">
          <div className="panel-header">
            <div>
              <span className="small-label">YOUR DONOR STATUS</span>
              <h3>Ready to help</h3>
            </div>
            <button
              className={`toggle ${available ? 'on' : ''}`}
              onClick={() => {
                setAvailable(!available);
                showNotice(available ? 'You are now marked unavailable.' : 'You are now available to help.');
              }}
            >
              <span />
            </button>
          </div>
          <div className="eligibility">
            <span className="check-circle">
              <Check size={15} />
            </span>
            <div>
              <strong>Eligible to donate</strong>
              <small>Next available · Today</small>
            </div>
            <span className="status-text">Active</span>
          </div>
          <div className="preview-request">
            <div className="request-top">
              <span className="blood-badge">O+</span>
              <span className="urgency">NEEDS HELP</span>
              <span className="request-time">2 min ago</span>
            </div>
            <h4>Manipal Hospital</h4>
            <p>
              <Navigation size={13} /> 2.4 km away · Old Airport Road
            </p>
            <button onClick={() => onNavigate('requests')}>
              View request <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="emergency-band">
        <div className="section-wrap emergency-inner">
          <div className="emergency-icon">
            <HeartPulse size={27} />
          </div>
          <div>
            <span className="eyebrow light">NEED BLOOD URGENTLY?</span>
            <h2>We’re here when it matters most.</h2>
          </div>
          <button className="button button-light" onClick={onRequest}>
            Create an emergency request <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="step">
      <span className="step-number">{number}</span>
      <div className="step-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Requests({
  onRequest,
  showNotice,
  onCall,
}: {
  onRequest: () => void;
  showNotice: (message: string) => void;
  onCall: (channelName: string, recipientName: string) => void;
}) {
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await api.getRequests();
        if (res.data) setRequestsList(res.data);
      } catch (err) {
        console.warn('Could not load requests:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadRequests();
  }, []);

  const handleHelp = async (req: any) => {
    try {
      await api.acceptRequest(req.id);
      showNotice(`You’ve responded to help with the ${req.blood_group} request at ${req.hospital}. Coordinates active.`);
    } catch (err: any) {
      showNotice(err.message || `Response recorded for ${req.hospital}.`);
    }
  };

  const filtered = requestsList.filter((req) => {
    const matchesSearch =
      !searchQuery ||
      req.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || req.blood_group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <section className="page-section section-wrap">
      <PageIntro
        eyebrow="BLOOD REQUESTS"
        title={
          <>
            People who need
            <br />
            <em>a little help.</em>
          </>
        }
        description="Browse verified blood requests in Bengaluru, see urgency, and coordinate immediately."
        action={
          <button className="button button-primary" onClick={onRequest}>
            Request blood <ArrowRight size={16} />
          </button>
        }
      />

      <div className="filter-row">
        <div className="search-box">
          <Search size={17} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by hospital or location"
          />
        </div>

        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="filter-button"
          style={{ outline: 0 }}
        >
          <option value="all">All blood groups</option>
          <option value="O+">O+</option>
          <option value="A+">A+</option>
          <option value="B+">B+</option>
          <option value="AB+">AB+</option>
          <option value="O-">O-</option>
          <option value="A-">A-</option>
          <option value="B-">B-</option>
          <option value="AB-">AB-</option>
        </select>
      </div>

      {loading && <p className="rs-loading">Loading live blood requests…</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fffdfa', border: '1px solid #ebdcd0', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '15px', color: '#554a43', fontWeight: 700 }}>
            No official blood requests active right now.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#887d74' }}>
            Only officially raised requests appear here in real time.
          </p>
        </div>
      )}

      <div className="request-grid">
        {filtered.map((request) => (
          <div className="request-card" key={request.id}>
            <div className="request-top">
              <span className="blood-badge">{request.blood_group}</span>
              <span className={`urgency ${request.urgency === 'critical' ? 'critical' : ''}`}>
                {request.urgency.toUpperCase()}
              </span>
              <span className="request-time">
                {request.verification_status === 'verified' || request.status === 'matching' ? (
                  <span style={{ color: '#387847', fontWeight: 700, fontSize: '10px' }}>Verified ✓</span>
                ) : (
                  <span style={{ color: '#b45309', fontWeight: 600, fontSize: '10px' }}>Pending Review</span>
                )}
              </span>
            </div>
            <h3>{request.hospital}</h3>
            <p className="muted-line">
              <Hospital size={14} /> {request.location}
            </p>
            <p className="muted-line">
              <Navigation size={14} /> Patient: {request.patient_name} · {request.units_needed} units
            </p>
            {request.notes && <p style={{ fontSize: '11px', color: '#776e66', margin: '4px 0 10px 0' }}>"{request.notes}"</p>}
            <div className="card-divider" />
            <div className="request-card-footer">
              <span>
                <Clock3 size={14} /> Needed today
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="icon-button"
                  title="Audio/Video Call"
                  onClick={() => onCall(`call_${request.id.replace(/^req_/, '')}`, request.patient_name)}
                >
                  <Video size={16} />
                </button>
                <button className="text-button" onClick={() => handleHelp(request)}>
                  I can help <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Donors({
  onDonor,
  showNotice,
  onRequestBlood,
  onCall,
}: {
  onDonor: () => void;
  showNotice: (message: string) => void;
  onRequestBlood: () => void;
  onCall: (channelName: string, recipientName: string) => void;
}) {
  const [donorsList, setDonorsList] = useState<any[]>([]);

  useEffect(() => {
    async function loadDonors() {
      try {
        const res = await api.getDonors({ available: true });
        if (res.data) setDonorsList(res.data);
      } catch (err) {
        console.warn('Could not load donors:', err);
      }
    }
    void loadDonors();
  }, []);

  return (
    <section className="page-section section-wrap">
      <PageIntro
        eyebrow="VERIFIED DONORS"
        title={
          <>
            Good people are
            <br />
            <em>already nearby.</em>
          </>
        }
        description="RaktaSetu helps you discover willing, verified donors on Leaflet OpenStreetMap without sharing personal details too soon."
        action={
          <button className="button button-primary" onClick={onDonor}>
            Become a donor <ArrowRight size={16} />
          </button>
        }
      />

      <div className="donor-layout">
        {/* Real Interactive Leaflet OpenStreetMap */}
        <InteractiveDonorMap
          donors={donorsList}
          onRequestBlood={onRequestBlood}
          onSelectDonor={(donor) => {
            showNotice(`Selected ${donor.full_name} (${donor.blood_group}) in ${donor.location}.`);
          }}
        />

        <div className="donor-list">
          <div className="list-heading">
            <span>Available nearby</span>
            <small>{donorsList.length} verified donors</small>
          </div>

          {donorsList.map((donor) => (
            <div className="donor-row" key={donor.id}>
              <span className="avatar">{donor.full_name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{donor.full_name}</strong>
                <small>
                  <span className="mini-blood">{donor.blood_group}</span> · {donor.location}
                </small>
              </div>
              <span className="donor-available">
                <i /> Available
              </span>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="icon-button"
                  title="Audio/Video Call"
                  onClick={() => onCall(`donor_${donor.id}`, donor.full_name)}
                >
                  <Phone size={15} />
                </button>
                <button
                  className="icon-button"
                  title="Chat"
                  onClick={() => showNotice(`Secure conversation with ${donor.full_name} is active.`)}
                >
                  <MessageCircle size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ActivityView({ showNotice }: { showNotice: (message: string) => void }) {
  return (
    <section className="page-section section-wrap">
      <PageIntro
        eyebrow="MY ACTIVITY"
        title={
          <>
            Your impact,
            <br />
            <em>beautifully tracked.</em>
          </>
        }
        description="A quiet record of the moments you showed up for someone else."
      />

      <div className="activity-summary">
        <div>
          <span className="summary-icon">
            <Droplet size={19} fill="currentColor" />
          </span>
          <strong>3</strong>
          <small>Donations made</small>
        </div>
        <div>
          <span className="summary-icon green">
            <HeartPulse size={19} />
          </span>
          <strong>3</strong>
          <small>Lives touched</small>
        </div>
        <div>
          <span className="summary-icon yellow">
            <CalendarDays size={19} />
          </span>
          <strong>Today</strong>
          <small>Next eligible date</small>
        </div>
      </div>

      <div className="activity-card">
        <div className="activity-card-header">
          <h3>Recent activity</h3>
          <button className="filter-button">
            This year <ChevronDown size={14} />
          </button>
        </div>
        {[
          { title: 'Donation completed', place: 'Manipal Hospital · Bengaluru', date: '18 Mar 2026', status: 'Completed' },
          { title: 'Responded to emergency request', place: 'Apollo Hospitals · Bengaluru', date: '06 Jan 2026', status: 'Connected' },
          { title: 'Joined RaktaSetu', place: 'Profile created', date: '12 Nov 2025', status: 'Welcome' },
        ].map((item, index) => (
          <div className="activity-row" key={item.title}>
            <span className={`timeline-icon ${index === 0 ? 'filled' : ''}`}>
              <Check size={15} />
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.place}</small>
            </div>
            <span className="activity-date">{item.date}</span>
            <span className="activity-status">{item.status}</span>
          </div>
        ))}
      </div>

      <div className="quote-card">
        <Sparkles size={19} />
        <p>“A single donation can be the most important thing you do for someone today.”</p>
        <button className="text-button" onClick={() => showNotice('Thank you for making a difference.')}>
          Share your impact <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow dark">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function FormModal({
  type,
  profile,
  onClose,
  onComplete,
  onOpenOcr,
}: {
  type: ModalType;
  profile: Profile | null;
  onClose: () => void;
  onComplete: (message: string) => void;
  onOpenOcr?: () => void;
}) {
  if (type === 'ocr') {
    return (
      <DocumentVerificationModal
        onClose={onClose}
        onSuccess={(group) => {
          onComplete(`Blood group ${group} verified successfully via document scan.`);
        }}
      />
    );
  }

  if (type === 'donor') {
    return (
      <DonorRegistrationModal
        onClose={onClose}
        onSuccess={onComplete}
        initialValues={
          profile
            ? {
                full_name: profile.full_name,
                blood_group: profile.blood_group,
                email: profile.email,
                phone: profile.phone,
              }
            : undefined
        }
      />
    );
  }

  if (type === 'request') {
    return <BloodRequestModal onClose={onClose} onSuccess={onComplete} />;
  }

  return null;
}

export default App;
