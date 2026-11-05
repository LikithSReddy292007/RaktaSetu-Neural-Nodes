import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, MapPin, Phone, Search, Tent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDayParts, formatTimeRange, toTelHref } from '@/lib/donation';

type Camp = {
  id: string;
  title: string;
  organizer: string;
  organizer_phone: string;
  venue: string;
  area: string;
  description: string;
  starts_at: string;
  ends_at: string;
};

type DonationCampFinderProps = {
  userId: string | null;
  onSignIn: () => void;
  showNotice: (message: string) => void;
};

export function DonationCampFinder({ userId, onSignIn, showNotice }: DonationCampFinderProps) {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCamps = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('donation_camps')
      .select('id, title, organizer, organizer_phone, venue, area, description, starts_at, ends_at')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true });
    setLoading(false);
    if (error || !Array.isArray(data)) {
      setLoadError('We could not load upcoming camps. Please try again.');
      return;
    }
    setLoadError('');
    setCamps(data as Camp[]);
  }, []);

  const loadRegistrations = useCallback(async () => {
    const { data, error } = await supabase.from('camp_registrations').select('camp_id');
    if (error || !Array.isArray(data)) return;
    setRegisteredIds(new Set(data.map((row) => String(row.camp_id))));
  }, []);

  useEffect(() => {
    void loadCamps();
  }, [loadCamps]);

  useEffect(() => {
    if (userId) void loadRegistrations();
    else setRegisteredIds(new Set());
  }, [userId, loadRegistrations]);

  const register = async (camp: Camp) => {
    if (!userId) { onSignIn(); return; }
    setBusyId(camp.id);
    const { error } = await supabase.from('camp_registrations').insert({ camp_id: camp.id });
    setBusyId(null);
    if (error && error.code !== '23505') {
      showNotice('We could not register you for this camp. Please try again.');
      return;
    }
    setRegisteredIds((previous) => new Set(previous).add(camp.id));
    showNotice(`You're registered for ${camp.title}.`);
  };

  const cancelRegistration = async (camp: Camp) => {
    setBusyId(camp.id);
    const { error } = await supabase.from('camp_registrations').delete().eq('camp_id', camp.id);
    setBusyId(null);
    if (error) {
      showNotice('We could not cancel your registration. Please try again.');
      return;
    }
    setRegisteredIds((previous) => {
      const next = new Set(previous);
      next.delete(camp.id);
      return next;
    });
    showNotice(`Your registration for ${camp.title} was cancelled.`);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visible = camps.filter((camp) =>
    normalizedQuery === ''
    || [camp.title, camp.organizer, camp.venue, camp.area].some((value) => value.toLowerCase().includes(normalizedQuery))
  );

  return (
    <section className="page-section section-wrap">
      <div className="page-intro">
        <div>
          <span className="eyebrow dark">DONATION CAMP FINDER</span>
          <h1>Upcoming camps <em>near you.</em></h1>
          <p>Find blood donation camps in Bengaluru, see who is organising them, and register in one tap.</p>
        </div>
      </div>

      <div className="filter-row">
        <div className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, organiser or area"
            aria-label="Search camps"
          />
        </div>
      </div>

      {loadError && <div className="form-error rs-spaced">{loadError}</div>}
      {loading && camps.length === 0 && <p className="rs-loading">Loading upcoming camps…</p>}

      {!loading && !loadError && visible.length === 0 && (
        <div className="rs-empty rs-spaced">
          <span className="modal-icon"><Tent size={20} /></span>
          <h2>{camps.length === 0 ? 'No camps scheduled yet.' : 'No camps match your search.'}</h2>
          <p>{camps.length === 0 ? 'New donation camps will appear here as they are announced.' : 'Try a different area or organiser name.'}</p>
        </div>
      )}

      <div className="camp-grid">
        {visible.map((camp) => {
          const parts = getDayParts(new Date(camp.starts_at));
          const isRegistered = registeredIds.has(camp.id);
          const isBusy = busyId === camp.id;
          return (
            <article key={camp.id} className="rs-card camp-card">
              <div className="rs-date-block">
                <span className="rs-date-day">{parts.day}</span>
                <span className="rs-date-month">{parts.month}</span>
              </div>
              <div className="camp-body">
                <h3>{camp.title}</h3>
                <p className="rs-meta">Organised by {camp.organizer}</p>
                <p className="rs-meta"><Clock3 size={14} /> {parts.full} · {formatTimeRange(camp.starts_at, camp.ends_at)}</p>
                <p className="rs-meta"><MapPin size={14} /> {camp.venue}, {camp.area}</p>
                {camp.description && <p className="camp-desc">{camp.description}</p>}
                <div className="camp-footer">
                  <a className="rs-link" href={toTelHref(camp.organizer_phone)}>
                    <Phone size={14} /> {camp.organizer_phone}
                  </a>
                  <div className="camp-actions">
                    {isRegistered ? (
                      <>
                        <span className="rs-status rs-status--scheduled"><Check size={13} /> Registered</span>
                        <button className="text-button rs-text-danger" onClick={() => void cancelRegistration(camp)} disabled={isBusy}>
                          {isBusy ? 'Updating…' : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <button className="button button-primary rs-button-compact" onClick={() => void register(camp)} disabled={isBusy}>
                        {isBusy ? 'Saving…' : userId ? 'Register' : 'Log in to register'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
