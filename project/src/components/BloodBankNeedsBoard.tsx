import { useCallback, useEffect, useState } from 'react';
import { Building2, Clock3, MapPin, Phone, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  BLOOD_GROUPS,
  BloodBankSummary,
  BloodGroup,
  Urgency,
  URGENCY_LABELS,
  URGENCY_ORDER,
  formatRelativeTime,
  toTelHref,
} from '@/lib/donation';

type NeedWithBank = {
  id: string;
  blood_group: BloodGroup;
  urgency: Urgency;
  units_needed: number;
  updated_at: string;
  blood_banks: BloodBankSummary;
};

export function BloodBankNeedsBoard() {
  const [needs, setNeeds] = useState<NeedWithBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [groupFilter, setGroupFilter] = useState<BloodGroup | 'all'>('all');

  const loadNeeds = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blood_bank_needs')
      .select('id, blood_group, urgency, units_needed, updated_at, blood_banks(id, name, area, address, phone)')
      .order('updated_at', { ascending: false });
    setLoading(false);
    if (error || !Array.isArray(data)) {
      setLoadError('We could not load the needs board. Please try again.');
      return;
    }
    setLoadError('');
    setNeeds(
      (data as (Omit<NeedWithBank, 'blood_banks'> & { blood_banks: BloodBankSummary | null })[])
        .filter((need): need is NeedWithBank => need.blood_banks !== null)
    );
  }, []);

  useEffect(() => {
    void loadNeeds();
  }, [loadNeeds]);

  const visible = needs
    .filter((need) => groupFilter === 'all' || need.blood_group === groupFilter)
    .sort((a, b) =>
      URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency)
      || Date.parse(b.updated_at) - Date.parse(a.updated_at)
    );

  const criticalCount = needs.filter((need) => need.urgency === 'critical').length;
  const lastUpdated = needs.reduce<string | null>(
    (latest, need) => (!latest || Date.parse(need.updated_at) > Date.parse(latest) ? need.updated_at : latest),
    null
  );
  const countFor = (group: BloodGroup) => needs.filter((need) => need.blood_group === group).length;

  return (
    <section className="page-section section-wrap">
      <div className="page-intro">
        <div>
          <span className="eyebrow dark">BLOOD BANK NEEDS BOARD</span>
          <h1>Where blood is <em>needed now.</em></h1>
          <p>Live requirements from partner blood banks across Bengaluru, sorted so the most urgent appear first.</p>
        </div>
        <button className="button button-secondary" onClick={() => void loadNeeds()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'rs-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh board'}
        </button>
      </div>

      <div className="needs-summary">
        <div className="rs-card needs-stat">
          <strong>{needs.length}</strong>
          <span>Open requirements</span>
        </div>
        <div className="rs-card needs-stat">
          <strong className="needs-stat-critical">{criticalCount}</strong>
          <span>Critical right now</span>
        </div>
        <div className="rs-card needs-stat">
          <strong>{lastUpdated ? formatRelativeTime(lastUpdated) : '-'}</strong>
          <span>Last board update</span>
        </div>
      </div>

      <div className="rs-chip-row" role="group" aria-label="Filter by blood group">
        <button className={`rs-chip ${groupFilter === 'all' ? 'active' : ''}`} onClick={() => setGroupFilter('all')}>
          All groups
        </button>
        {BLOOD_GROUPS.map((group) => (
          <button
            key={group}
            className={`rs-chip ${groupFilter === group ? 'active' : ''}`}
            onClick={() => setGroupFilter(group)}
            aria-pressed={groupFilter === group}
          >
            {group} <span className="rs-chip-count">{countFor(group)}</span>
          </button>
        ))}
      </div>

      {loadError && <div className="form-error rs-spaced">{loadError}</div>}
      {loading && needs.length === 0 && <p className="rs-loading">Loading the latest requirements…</p>}

      {!loading && !loadError && visible.length === 0 && (
        <div className="rs-empty rs-spaced">
          <span className="modal-icon"><Building2 size={20} /></span>
          <h2>No open requirements here.</h2>
          <p>There are no current requests for this blood group. Check back soon or choose all groups.</p>
        </div>
      )}

      <div className="rs-stack">
        {visible.map((need) => (
          <article key={need.id} className="rs-card need-row">
            <span className="need-group" aria-label={`Blood group ${need.blood_group}`}>{need.blood_group}</span>
            <div className="need-body">
              <h3>{need.blood_banks.name}</h3>
              <p className="rs-meta"><MapPin size={14} /> {need.blood_banks.area} · {need.blood_banks.address}</p>
              <p className="rs-meta"><Clock3 size={14} /> Updated {formatRelativeTime(need.updated_at)}</p>
            </div>
            <div className="need-side">
              <span className={`urgency-pill urgency-pill--${need.urgency}`}>{URGENCY_LABELS[need.urgency]}</span>
              <strong className="need-units">{need.units_needed} {need.units_needed === 1 ? 'unit' : 'units'}</strong>
              <a className="rs-link" href={toTelHref(need.blood_banks.phone)}>
                <Phone size={14} /> Call bank
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
