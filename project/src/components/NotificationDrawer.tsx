import { useEffect, useState } from 'react';
import { Bell, Check, Clock3, HeartPulse, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';

interface NotificationDrawerProps {
  userId?: string;
  onClose: () => void;
  onSelectRequest?: (requestId: string) => void;
}

export function NotificationDrawer({ userId, onClose, onSelectRequest }: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.getNotifications(userId);
        if (res.data) setNotifications(res.data);
      } catch (err) {
        console.warn('Could not load notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadNotifications();
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="chat-drawer" style={{ maxWidth: '420px' }}>
        <div className="drawer-header">
          <div>
            <span className="eyebrow dark">NOTIFICATIONS</span>
            <h3>Alerts & Updates</h3>
            <small>Live emergency requests and match updates</small>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && <p style={{ fontSize: '12px', color: '#958a81', textAlign: 'center' }}>Loading alerts…</p>}

          {!loading && notifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#81776f' }}>
              <Bell size={28} color="#d9c8b7" style={{ margin: '0 auto 10px auto' }} />
              <strong style={{ display: 'block', fontSize: '13px' }}>You're all caught up</strong>
              <small style={{ fontSize: '11px', color: '#a79b90' }}>
                New emergency requests and coordination updates will appear here.
              </small>
            </div>
          )}

          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                void handleMarkRead(notif.id);
                if (notif.data?.request_id && onSelectRequest) {
                  onSelectRequest(notif.data.request_id);
                  onClose();
                }
              }}
              style={{
                background: notif.read ? '#fffdf9' : '#fef4f2',
                border: `1px solid ${notif.read ? '#e4d9ce' : '#f2c6bf'}`,
                padding: '14px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {notif.type === 'emergency' ? (
                  <span style={{ color: '#b13026' }}>
                    <HeartPulse size={16} />
                  </span>
                ) : (
                  <span style={{ color: '#5c9a6d' }}>
                    <Sparkles size={16} />
                  </span>
                )}
                <strong style={{ fontSize: '12px', color: '#282421' }}>{notif.title}</strong>
                {!notif.read && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#b13026',
                      marginLeft: 'auto',
                    }}
                  />
                )}
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#554a42', lineHeight: '1.5' }}>
                {notif.body}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', color: '#a79b90', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock3 size={11} /> {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: '10px', color: '#b13026', fontWeight: 600 }}>
                  View details →
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #eee6de' }}>
          <button
            className="button button-secondary full-width"
            onClick={() => {
              notifications.forEach((n) => void handleMarkRead(n.id));
            }}
          >
            <Check size={14} /> Mark all as read
          </button>
        </div>
      </aside>
    </div>
  );
}

