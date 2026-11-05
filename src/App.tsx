import { FormEvent, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Droplet,
  HeartPulse,
  Hospital,
  House,
  Menu,
  Moon,
  MessageCircle,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';

type ModalType = 'request' | 'donor' | null;
type UserRole = 'donor' | 'requester';
type View = 'home' | 'requests' | 'donors' | 'activity' | 'auth' | 'donorDashboard' | 'requesterDashboard';
type AuthMode = 'login' | 'signup';
type Profile = { id: string; full_name: string; phone: string; date_of_birth: string; role: UserRole; blood_group: string; location: string; is_available: boolean; };

const availability = [
  { group: 'O+', units: '24 units', tone: 'good' },
  { group: 'A+', units: '18 units', tone: 'good' },
  { group: 'B+', units: '12 units', tone: 'medium' },
  { group: 'AB+', units: '08 units', tone: 'medium' },
  { group: 'O−', units: '06 units', tone: 'low' },
];

const requests = [
  { group: 'O+', hospital: 'Manipal Hospital', location: 'Old Airport Road', time: '2 min ago', urgency: 'Urgent', distance: '2.4 km' },
  { group: 'B+', hospital: 'Apollo Hospitals', location: 'Sheshadripuram', time: '5 min ago', urgency: 'Today', distance: '4.1 km' },
  { group: 'A−', hospital: 'Fortis Hospital', location: 'Bannerghatta Road', time: '8 min ago', urgency: 'Critical', distance: '6.8 km' },
];

function App() {
  const [intro, setIntro] = useState(true);
  const [view, setView] = useState<View>('home');
  const [modal, setModal] = useState<ModalType>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [available, setAvailable] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authRole, setAuthRole] = useState<UserRole>('donor');
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');
  const [chatOpen, setChatOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1350);
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void loadProfile(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        (async () => { await loadProfile(nextSession.user.id); })();
      }
    });
    return () => { window.clearTimeout(timer); listener.subscription.unsubscribe(); };
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) { setProfile(data as Profile); setAvailable(data.is_available); setView(data.role === 'donor' ? 'donorDashboard' : 'requesterDashboard'); }
  };
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200); };
  const navigate = (nextView: View) => { setView(nextView); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openAuth = (role: UserRole, mode: AuthMode = 'signup') => { setAuthRole(role); setAuthMode(mode); navigate('auth'); };
  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); navigate('home'); showNotice('You have been signed out.'); };

  if (intro) return <Intro />;
  if (view === 'auth') return <AuthPage mode={authMode} role={authRole} onModeChange={setAuthMode} onRoleChange={setAuthRole} onComplete={async (message) => { if (session) await loadProfile(session.user.id); showNotice(message); }} onHome={() => navigate('home')} />;

  const openRequest = () => session ? setModal('request') : openAuth('requester');
  const openDonor = () => session ? setModal('donor') : openAuth('donor');
  const dashboard = profile?.role === 'donor' ? 'donorDashboard' : 'requesterDashboard';

  return <div className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
    <header className="topbar">
      <button className="brand" onClick={() => navigate('home')} aria-label="Go to RaktaSetu home"><span className="brand-mark"><Droplet size={19} fill="currentColor" /></span><span>RaktaSetu</span><small>रक्तसेतु</small></button>
      <nav className={`desktop-nav ${menuOpen ? 'is-open' : ''}`}>
        <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}><House size={16} /> Overview</button>
        <button className={view === 'requests' ? 'active' : ''} onClick={() => navigate('requests')}><HeartPulse size={16} /> Blood requests</button>
        <button className={view === 'donors' ? 'active' : ''} onClick={() => navigate('donors')}><Users size={16} /> Find a donor</button>
        <button className={view === dashboard ? 'active' : ''} onClick={() => profile ? navigate(dashboard) : openAuth('donor', 'login')}><Activity size={16} /> My dashboard</button>
      </nav>
      <div className="top-actions"><button className="icon-button notification" aria-label="Notifications" onClick={() => showNotice(language === 'EN' ? 'You are all caught up.' : 'आप पूरी तरह अपडेट हैं।')}><Bell size={19} /><i /></button><button className="language" onClick={() => setLanguage(language === 'EN' ? 'HI' : 'EN')} aria-label="Change language">{language === 'EN' ? 'EN' : 'हि'} <ChevronDown size={14} /></button><button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle dark mode">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button><button className="chat-header-button" onClick={() => setChatOpen(true)} aria-label="Open chat"><MessageCircle size={17} /><span>Chat</span></button>{session && profile ? <button className="profile-chip" onClick={() => navigate(dashboard)}><span>{profile.full_name.slice(0, 2).toUpperCase()}</span><span className="profile-name">{profile.full_name}</span><ChevronDown size={14} /></button> : <button className="login-link" onClick={() => openAuth('donor', 'login')}>Log in</button>}<button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu size={22} /></button></div>
    </header>
    <main>
      {view === 'home' && <Home onRequest={openRequest} onDonor={openDonor} onNavigate={navigate} available={available} setAvailable={setAvailable} showNotice={showNotice} />}
      {view === 'requests' && <Requests onRequest={openRequest} showNotice={showNotice} />}
      {view === 'donors' && <Donors onDonor={openDonor} showNotice={showNotice} />}
      {view === 'activity' && <ActivityView showNotice={showNotice} />}
      {view === 'donorDashboard' && profile && <DonorDashboard profile={profile} available={available} onAvailability={async (value) => { setAvailable(value); await supabase.from('profiles').update({ is_available: value }).eq('id', profile.id); showNotice(value ? 'You are now available to help.' : 'You are now marked unavailable.'); }} onSignOut={signOut} />}
      {view === 'requesterDashboard' && profile && <RequesterDashboard profile={profile} onRequest={() => setModal('request')} onSignOut={signOut} />}
    </main>
    <footer className="footer"><div className="footer-brand"><span className="brand-mark"><Droplet size={17} fill="currentColor" /></span><strong>RaktaSetu</strong></div><span>Every drop connects a life.</span><span className="footer-copy">© 2024 RaktaSetu · Built for Bengaluru</span></footer>
    {modal && <FormModal type={modal} profile={profile} onClose={() => setModal(null)} onComplete={async (message) => { setModal(null); if (session?.user.id) await loadProfile(session.user.id); showNotice(message); }} />}
    {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
    {supportOpen && <SupportBot onClose={() => setSupportOpen(false)} />}
    <button className="support-fab" onClick={() => setSupportOpen(!supportOpen)} aria-label="Open RaktaSetu supporter"><Sparkles size={17} /> <span>Support</span></button>
    {notice && <div className="toast"><span className="toast-icon"><Check size={15} /></span>{notice}</div>}
  </div>;
}

function AuthPage({ mode, role, onModeChange, onRoleChange, onComplete, onHome }: { mode: AuthMode; role: UserRole; onModeChange: (mode: AuthMode) => void; onRoleChange: (role: UserRole) => void; onComplete: (message: string) => void; onHome: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: String(values.email), password: String(values.password), options: { data: { full_name: String(values.full_name) } } });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('We could not create your account.');
        const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, full_name: String(values.full_name), phone: String(values.phone), date_of_birth: String(values.date_of_birth), role, blood_group: String(values.blood_group), location: String(values.location), is_available: role === 'donor' });
        if (profileError) throw profileError;
        onComplete(role === 'donor' ? 'Your donor profile is ready.' : 'Your requester profile is ready.');
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: String(values.email), password: String(values.password) });
        if (loginError) throw loginError;
        if (data.user) onComplete('Welcome back to RaktaSetu.');
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="auth-screen"><div className="auth-side"><button className="brand" onClick={onHome}><span className="brand-mark"><Droplet size={19} fill="currentColor" /></span><span>RaktaSetu</span><small>रक्तसेतु</small></button><div className="auth-side-copy"><span className="eyebrow light">A LITTLE HELP GOES A LONG WAY</span><h1>Every drop<br /><em>connects</em> a life.</h1><p>A trusted space for people who give, people who need, and everyone in between.</p></div><span className="auth-side-foot"><ShieldCheck size={15} /> Private by design · Always free</span></div><div className="auth-panel"><button className="back-link" onClick={onHome}><ArrowRight size={15} style={{ transform: 'rotate(180deg)' }} /> Back to home</button><div className="auth-panel-inner"><span className="eyebrow dark">{isSignup ? 'CREATE YOUR PROFILE' : 'WELCOME BACK'}</span><h2>{isSignup ? 'Join RaktaSetu.' : 'Sign in to continue.'}</h2><p>{isSignup ? 'A few details help us make the right connection.' : 'Access your dashboard and keep your impact moving.'}</p><div className="role-switch"><button className={role === 'donor' ? 'active' : ''} onClick={() => onRoleChange('donor')}><Droplet size={15} /> I want to donate</button><button className={role === 'requester' ? 'active' : ''} onClick={() => onRoleChange('requester')}><HeartPulse size={15} /> I need blood</button></div><form className="auth-form" onSubmit={submit}>{isSignup && <label>Full name<input name="full_name" required placeholder="e.g. Ananya Rao" /></label>}<label>Email address<input name="email" required type="email" placeholder="you@example.com" /></label>{isSignup && <div className="form-grid"><label>Phone number<input name="phone" required type="tel" placeholder="10-digit number" /></label><label>Date of birth<input name="date_of_birth" required type="date" /></label></div>}<label>Password<input name="password" required type="password" minLength={6} placeholder="At least 6 characters" /></label>{isSignup && <><div className="form-grid"><label>Blood group<select name="blood_group" required defaultValue=""><option value="" disabled>Select group</option><option>O+</option><option>A+</option><option>B+</option><option>AB+</option><option>O-</option><option>A-</option><option>B-</option><option>AB-</option></select></label><label>City / area<input name="location" required placeholder="e.g. Indiranagar" /></label></div><label className="checkbox-label"><input type="checkbox" required /> I agree to use RaktaSetu responsibly and keep other people’s information private.</label></>}{error && <div className="form-error">{error}</div>}<button className="button button-primary full-width" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create my profile' : 'Log in'} <ArrowRight size={16} /></button></form><p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to RaktaSetu?'} <button onClick={() => onModeChange(isSignup ? 'login' : 'signup')}>{isSignup ? 'Log in' : 'Create an account'}</button></p></div></div></div>;
}

function DonorDashboard({ profile, available, onAvailability, onSignOut }: { profile: Profile; available: boolean; onAvailability: (value: boolean) => void; onSignOut: () => void }) { return <section className="page-section section-wrap"><div className="dashboard-welcome"><div><span className="eyebrow dark">DONOR DASHBOARD</span><h1>Hello, <em>{profile.full_name.split(' ')[0]}.</em></h1><p>Your profile is ready to make a difference in Bengaluru.</p></div><button className="button button-secondary" onClick={onSignOut}>Sign out</button></div><div className="dashboard-grid"><div className="profile-card"><div className="dashboard-avatar">{profile.full_name.slice(0, 2).toUpperCase()}</div><h3>{profile.full_name}</h3><span className="profile-role">Verified donor</span><div className="profile-details"><span><strong>Blood group</strong><b>{profile.blood_group}</b></span><span><strong>Location</strong><b>{profile.location}</b></span><span><strong>Date of birth</strong><b>{profile.date_of_birth}</b></span><span><strong>Phone</strong><b>{profile.phone}</b></span></div></div><div className="dashboard-main"><div className="availability-card"><div><span className="small-label">YOUR AVAILABILITY</span><h3>{available ? 'Ready to help' : 'Currently unavailable'}</h3><p>{available ? 'You’ll be notified when someone nearby needs your blood group.' : 'Turn this back on whenever you are ready to help.'}</p></div><button className={`toggle ${available ? 'on' : ''}`} onClick={() => onAvailability(!available)}><span /></button></div><div className="dashboard-stat-row"><div><span className="summary-icon"><Droplet size={18} fill="currentColor" /></span><strong>0</strong><small>Donations this year</small></div><div><span className="summary-icon green"><HeartPulse size={18} /></span><strong>Ready</strong><small>Eligibility status</small></div><div><span className="summary-icon yellow"><Navigation size={18} /></span><strong>{profile.location}</strong><small>Your current area</small></div></div><div className="dashboard-request-list"><div className="activity-card-header"><h3>Matching requests nearby</h3><span className="live-pill"><i /> Live updates</span></div>{requests.filter((item) => item.group === profile.blood_group || profile.blood_group === 'O+').slice(0, 2).map((item) => <div className="dashboard-request" key={item.hospital}><span className="blood-badge">{item.group}</span><div><strong>{item.hospital}</strong><small>{item.location} · {item.distance}</small></div><span className="urgency">{item.urgency}</span><button className="text-button">View <ArrowRight size={14} /></button></div>)}<p className="empty-note">You’ll see new matching requests here as they arrive.</p></div></div></div></section>; }

function RequesterDashboard({ profile, onRequest, onSignOut }: { profile: Profile; onRequest: () => void; onSignOut: () => void }) { return <section className="page-section section-wrap"><div className="dashboard-welcome"><div><span className="eyebrow dark">REQUESTER DASHBOARD</span><h1>We’re here for you, <em>{profile.full_name.split(' ')[0]}.</em></h1><p>Create a request and let verified donors nearby know how they can help.</p></div><button className="button button-secondary" onClick={onSignOut}>Sign out</button></div><div className="dashboard-grid"><div className="profile-card"><div className="dashboard-avatar requester-avatar"><HeartPulse size={22} /></div><h3>{profile.full_name}</h3><span className="profile-role">Requester profile</span><div className="profile-details"><span><strong>Blood group</strong><b>{profile.blood_group}</b></span><span><strong>Location</strong><b>{profile.location}</b></span><span><strong>Date of birth</strong><b>{profile.date_of_birth}</b></span><span><strong>Phone</strong><b>{profile.phone}</b></span></div></div><div className="dashboard-main"><div className="requester-cta"><span className="modal-icon"><Droplet size={20} fill="currentColor" /></span><div><h3>Need blood for yourself or someone close?</h3><p>Your request is shared only with relevant verified donors nearby.</p></div><button className="button button-primary" onClick={onRequest}>Create blood request <ArrowRight size={16} /></button></div><div className="tracking-card"><div className="activity-card-header"><h3>Request tracking</h3><span className="status-text">No active request</span></div><div className="tracking-empty"><span className="check-circle"><Search size={16} /></span><div><strong>Your next request will appear here</strong><small>Track responses, donor connections, and updates in one place.</small></div></div></div></div></div></section>; }

function ChatDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([{ from: 'them', text: 'Hello. This is a private RaktaSetu conversation. How can we help today?' }]);
  const [draft, setDraft] = useState('');
  const [blocked, setBlocked] = useState(false);
  const send = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const text = draft.trim(); if (!text) return; if (/(pay|payment|money|cash|upi|bank|transfer|fee|charge|रुपये|पैसे)/i.test(text)) { setBlocked(true); setDraft(''); return; } setBlocked(false); setMessages((current) => [...current, { from: 'me', text }, { from: 'them', text: 'Thanks for the update. Please keep communication focused on coordinating the blood donation.' }]); setDraft(''); };
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="chat-drawer"><div className="drawer-header"><div><span className="eyebrow dark">SECURE CHAT</span><h3>RaktaSetu connection</h3><small>Donor and requester messages</small></div><button className="modal-close" onClick={onClose}><X size={19} /></button></div><div className="chat-safety"><ShieldCheck size={15} /><span>Never share payment details. RaktaSetu is always free.</span></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-bubble ${message.from === 'me' ? 'mine' : ''}`} key={`${message.text}-${index}`}>{message.text}</div>)}{blocked && <div className="blocked-message"><ShieldCheck size={15} /><span>Payment-related messages are blocked for your safety. No one should ask you for money to donate blood.</span></div>}</div><form className="chat-compose" onSubmit={send}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" aria-label="Chat message" /><button type="submit" aria-label="Send message"><ArrowRight size={17} /></button></form></aside></div>;
}

function SupportBot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hi, I’m the RaktaSetu supporter. Ask me about donating, requesting blood, or staying safe.' }]);
  const [draft, setDraft] = useState('');
  const respond = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const question = draft.trim(); if (!question) return; const lower = question.toLowerCase(); const answer = /(payment|money|pay|upi|cash|पैसे|रुपये)/i.test(question) ? 'RaktaSetu never asks for payment. Please report anyone requesting money and do not share financial details.' : lower.includes('donat') ? 'You can become a donor by creating a profile, choosing your blood group, and turning on your availability.' : lower.includes('request') || lower.includes('blood') ? 'Choose Request blood from the home page. Add the hospital, location, blood group, and urgency so nearby donors can respond.' : 'I can help with donor registration, blood requests, privacy, and safe communication. What would you like to know?'; setMessages((current) => [...current, { from: 'me', text: question }, { from: 'bot', text: answer }]); setDraft(''); };
  return <div className="support-bot"><div className="support-header"><span className="support-icon"><Sparkles size={16} /></span><div><strong>RaktaSetu supporter</strong><small>Here to help</small></div><button onClick={onClose} aria-label="Close supporter"><X size={16} /></button></div><div className="support-messages">{messages.map((message, index) => <div className={`support-message ${message.from}`} key={`${message.text}-${index}`}>{message.text}</div>)}</div><form className="support-compose" onSubmit={respond}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask a question…" /><button type="submit"><ArrowRight size={16} /></button></form><small className="support-note"><ShieldCheck size={12} /> Never share passwords or payment details.</small></div>;
}

function Intro() {
  return <div className="intro-screen"><div className="intro-logo"><span className="intro-drop"><Droplet size={30} fill="currentColor" /></span><strong>RaktaSetu</strong><small>रक्तसेतु</small></div><div className="intro-line"><span /><span /><span /><span /></div><p>Connecting care with kindness</p></div>;
}

function Home({ onRequest, onDonor, onNavigate, available, setAvailable, showNotice }: { onRequest: () => void; onDonor: () => void; onNavigate: (view: View) => void; available: boolean; setAvailable: (value: boolean) => void; showNotice: (message: string) => void }) {
  return <>
    <section className="hero section-wrap">
      <div className="hero-copy"><div className="eyebrow"><span className="pulse-dot" /> BLOOD DONATION NETWORK <b>·</b> BENGALURU</div><h1>Every drop<br /><em>connects</em> a life.</h1><p className="hero-description">RaktaSetu brings patients, hospitals, and verified donors together when every second matters.</p><div className="hero-buttons"><button className="button button-primary" onClick={onRequest}>Request blood <ArrowRight size={17} /></button><button className="button button-secondary" onClick={onDonor}>Become a donor</button></div><div className="hero-trust"><ShieldCheck size={16} /> Verified donors · Private by design · Always free</div></div>
      <div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="connect-card"><div className="connect-top"><span className="small-label">LIVE CONNECTION</span><span className="live-pill"><i /> Active</span></div><div className="connect-route"><div className="route-person"><span className="person-icon"><Hospital size={19} /></span><strong>St. Martha's</strong><small>Patient request</small></div><div className="route-line"><span /><span /><ArrowRight size={15} /></div><div className="route-person align-right"><span className="person-icon donor"><Droplet size={19} fill="currentColor" /></span><strong>Verified donor</strong><small>2.4 km away</small></div></div><div className="connect-bottom"><Navigation size={14} /> Connected securely <span>Just now</span></div></div><div className="hero-stat stat-one"><strong>4,280</strong><span>lives connected</span></div><div className="hero-stat stat-two"><span className="mini-avatar">RK</span><div><strong>Riya is on her way</strong><span>O+ · 8 min ago</span></div></div></div>
    </section>
    <div className="availability-bar"><div className="section-wrap availability-inner"><div className="availability-title"><span className="pulse-dot" /> <strong>Live availability</strong><small>Updated just now</small></div>{availability.map((item) => <button key={item.group} className="blood-stock" onClick={() => onNavigate('requests')}><strong>{item.group}</strong><span className={`stock-dot ${item.tone}`} /><small>{item.units}</small></button>)}<button className="view-all" onClick={() => onNavigate('requests')}>View all <ArrowRight size={14} /></button></div></div>
    <section className="section-wrap intro-section"><div className="section-heading"><div><span className="eyebrow dark">HOW RAKTASETU WORKS</span><h2>Help is closer<br /><em>than you think.</em></h2></div><p>A simple, thoughtful way to make blood donation more human. Whether you need help or can give it, we make the connection clear.</p></div><div className="steps"><Step number="01" icon={<Search size={20} />} title="Tell us what you need" text="Share your blood group and location. We’ll take care of the rest." /><Step number="02" icon={<Users size={20} />} title="Find the right match" text="We notify verified donors nearby who are ready to help." /><Step number="03" icon={<HeartPulse size={20} />} title="Make a difference" text="Connect safely and get the support you need, right on time." /></div></section>
    <section className="section-wrap dashboard-preview"><div className="preview-copy"><span className="eyebrow dark">FOR DONORS</span><h2>Your kindness,<br /><em>in motion.</em></h2><p>Stay in control of your availability, see requests around you, and know exactly where your donation can help.</p><button className="text-button" onClick={onDonor}>Explore donor dashboard <ArrowRight size={16} /></button></div><div className="preview-panel"><div className="panel-header"><div><span className="small-label">YOUR DONOR STATUS</span><h3>Ready to help</h3></div><button className={`toggle ${available ? 'on' : ''}`} onClick={() => { setAvailable(!available); showNotice(available ? 'You are now marked unavailable.' : 'You are now available to help.'); }}><span /></button></div><div className="eligibility"><span className="check-circle"><Check size={15} /></span><div><strong>Eligible to donate</strong><small>Next available · Today</small></div><span className="status-text">Active</span></div><div className="preview-request"><div className="request-top"><span className="blood-badge">O+</span><span className="urgency">NEEDS HELP</span><span className="request-time">2 min ago</span></div><h4>Manipal Hospital</h4><p><Navigation size={13} /> 2.4 km away · Old Airport Road</p><button onClick={() => onNavigate('requests')}>View request <ArrowRight size={14} /></button></div></div></section>
    <section className="emergency-band"><div className="section-wrap emergency-inner"><div className="emergency-icon"><HeartPulse size={27} /></div><div><span className="eyebrow light">NEED BLOOD URGENTLY?</span><h2>We’re here when it matters most.</h2></div><button className="button button-light" onClick={onRequest}>Create an emergency request <ArrowRight size={16} /></button></div></section>
  </>;
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) { return <div className="step"><span className="step-number">{number}</span><div className="step-icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>; }

function Requests({ onRequest, showNotice }: { onRequest: () => void; showNotice: (message: string) => void }) { return <section className="page-section section-wrap"><PageIntro eyebrow="BLOOD REQUESTS" title={<>People who need<br /><em>a little help.</em></>} description="Browse verified blood requests in your area and respond when you’re ready." action={<button className="button button-primary" onClick={onRequest}>Request blood <ArrowRight size={16} /></button>} /><div className="filter-row"><div className="search-box"><Search size={17} /><input placeholder="Search by hospital or location" /></div><button className="filter-button">All blood groups <ChevronDown size={15} /></button><button className="filter-button">Nearby first <ChevronDown size={15} /></button></div><div className="request-grid">{requests.map((request) => <div className="request-card" key={request.hospital}><div className="request-top"><span className="blood-badge">{request.group}</span><span className={`urgency ${request.urgency === 'Critical' ? 'critical' : ''}`}>{request.urgency}</span><span className="request-time">{request.time}</span></div><h3>{request.hospital}</h3><p className="muted-line"><Hospital size={14} /> {request.location}</p><p className="muted-line"><Navigation size={14} /> {request.distance} from you</p><div className="card-divider" /><div className="request-card-footer"><span><Clock3 size={14} /> Needed today</span><button className="text-button" onClick={() => showNotice(`You've responded to the ${request.group} request.`)}>I can help <ArrowRight size={15} /></button></div></div>)}</div></section>; }

function Donors({ onDonor, showNotice }: { onDonor: () => void; showNotice: (message: string) => void }) { return <section className="page-section section-wrap"><PageIntro eyebrow="VERIFIED DONORS" title={<>Good people are<br /><em>already nearby.</em></>} description="RaktaSetu helps you find willing, verified donors without sharing personal details too soon." action={<button className="button button-primary" onClick={onDonor}>Become a donor <ArrowRight size={16} /></button>} /><div className="donor-layout"><div className="map-card"><div className="map-controls"><button className="map-control active">Nearby</button><button className="map-control">All Bengaluru</button></div><div className="map-grid"><span className="map-road road-a" /><span className="map-road road-b" /><span className="map-road road-c" /><div className="map-pin pin-one"><span>O+</span></div><div className="map-pin pin-two"><span>A+</span></div><div className="map-pin pin-three"><span>B+</span></div><div className="map-center"><Navigation size={17} /></div></div><div className="map-legend"><span><i className="legend-red" /> Available now</span><span><i className="legend-cream" /> Your location</span></div></div><div className="donor-list"><div className="list-heading"><span>Available nearby</span><small>12 donors</small></div>{[{ initials: 'RK', name: 'Riya Kapoor', group: 'O+', distance: '1.2 km', time: 'Available now' }, { initials: 'AM', name: 'Arjun Mehta', group: 'A+', distance: '2.8 km', time: 'Available now' }, { initials: 'NS', name: 'Nisha S.', group: 'B+', distance: '4.1 km', time: 'Available today' }].map((donor) => <div className="donor-row" key={donor.name}><span className="avatar">{donor.initials}</span><div><strong>{donor.name}</strong><small><span className="mini-blood">{donor.group}</span> {donor.distance} away</small></div><span className="donor-available"><i /> {donor.time}</span><button className="icon-button" onClick={() => showNotice(`A secure conversation with ${donor.name} is ready.`)}><MessageCircle size={18} /></button></div>)}</div></div></section>; }

function ActivityView({ showNotice }: { showNotice: (message: string) => void }) { return <section className="page-section section-wrap"><PageIntro eyebrow="MY ACTIVITY" title={<>Your impact,<br /><em>beautifully tracked.</em></>} description="A quiet record of the moments you showed up for someone else." /><div className="activity-summary"><div><span className="summary-icon"><Droplet size={19} fill="currentColor" /></span><strong>3</strong><small>Donations made</small></div><div><span className="summary-icon green"><HeartPulse size={19} /></span><strong>3</strong><small>Lives touched</small></div><div><span className="summary-icon yellow"><CalendarDays size={19} /></span><strong>Today</strong><small>Next eligible date</small></div></div><div className="activity-card"><div className="activity-card-header"><h3>Recent activity</h3><button className="filter-button">This year <ChevronDown size={14} /></button></div>{[{ title: 'Donation completed', place: 'Manipal Hospital · Bengaluru', date: '18 Mar 2024', status: 'Completed' }, { title: 'Responded to emergency request', place: 'Apollo Hospitals · Bengaluru', date: '06 Jan 2024', status: 'Connected' }, { title: 'Joined RaktaSetu', place: 'Profile created', date: '12 Nov 2023', status: 'Welcome' }].map((item, index) => <div className="activity-row" key={item.title}><span className={`timeline-icon ${index === 0 ? 'filled' : ''}`}><Check size={15} /></span><div><strong>{item.title}</strong><small>{item.place}</small></div><span className="activity-date">{item.date}</span><span className="activity-status">{item.status}</span></div>)}</div><div className="quote-card"><Sparkles size={19} /><p>“A single donation can be the most important thing you do for someone today.”</p><button className="text-button" onClick={() => showNotice('Thank you for making a difference.')}>Share your impact <ArrowRight size={15} /></button></div></section>; }

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description: string; action?: React.ReactNode }) { return <div className="page-intro"><div><span className="eyebrow dark">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>; }

function FormModal({ type, profile, onClose, onComplete }: { type: ModalType; profile: Profile | null; onClose: () => void; onComplete: (message: string) => void }) { const isRequest = type === 'request'; const [error, setError] = useState(''); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!profile) return; const values = Object.fromEntries(new FormData(event.currentTarget).entries()); const { error: requestError } = await supabase.from('blood_requests').insert({ patient_name: String(values.patient_name), blood_group: String(values.blood_group), hospital: String(values.hospital), location: String(values.location), urgency: String(values.urgency), notes: String(values.notes || '') }); if (requestError) setError(requestError.message); else onComplete('Your blood request is now visible to matching donors.'); }; return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><span className="modal-icon"><Droplet size={21} fill="currentColor" /></span><span className="eyebrow dark">{isRequest ? 'REQUEST BLOOD' : 'DONOR PROFILE READY'}</span><h2>{isRequest ? 'Tell us what you need.' : 'Your donor profile is active.'}</h2><p>{isRequest ? 'Share the request details and matching donors will be able to respond.' : 'Your profile is already set up. You can manage your availability from your dashboard.'}</p>{isRequest ? <form onSubmit={submit}><label>Patient name<input name="patient_name" required placeholder="e.g. Ananya Rao" /></label><div className="form-grid"><label>Blood group<select name="blood_group" required defaultValue=""><option value="" disabled>Select group</option><option>O+</option><option>A+</option><option>B+</option><option>AB+</option><option>O-</option><option>A-</option><option>B-</option><option>AB-</option></select></label><label>Urgency<select name="urgency" required defaultValue="today"><option value="today">Needed today</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></label></div><label>Hospital name<input name="hospital" required placeholder="e.g. Manipal Hospital" /></label><label>Hospital area or location<input name="location" required placeholder="e.g. Old Airport Road" /></label><label>Additional notes<textarea name="notes" placeholder="Anything donors should know?" rows={3} /></label>{error && <div className="form-error">{error}</div>}<button className="button button-primary full-width" type="submit">Share blood request <ArrowRight size={16} /></button><small className="form-note"><ShieldCheck size={13} /> Only relevant request details are shared with donors.</small></form> : <button className="button button-primary full-width" onClick={onClose}>Go to my donor dashboard <ArrowRight size={16} /></button>}</div></div>; }

export default App;
