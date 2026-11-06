import { useEffect, useRef, useState } from 'react';
import { Send, ShieldAlert, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'donor' | 'requester';
  text: string;
  timestamp: string;
}

interface RequestChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  currentRole: 'donor' | 'requester';
  currentUserName: string;
  otherPartyName: string;
}

// Client-side quick warning patterns
const PAYMENT_WARNING_REGEX =
  /\b(pay|payment|money|cash|upi|gpay|googlepay|phonepe|paytm|bhim|cred|bank\s*account|account\s*number|acct|iban|ifsc|wire\s*transfer|fee|charges?|cost|pricing|rupee|rupees|rs\.?|inr|₹|\$|dollar|पैसे|रुपये|ದುಡ್ಡು|ಹಣ)\b/i;

export function RequestChatModal({
  isOpen,
  onClose,
  requestId,
  currentRole,
  currentUserName,
  otherPartyName,
}: RequestChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedAlert, setBlockedAlert] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTypingPayment =
    inputText.trim().length > 0 &&
    PAYMENT_WARNING_REGEX.test(inputText.replace(/\bblood\s*bank[s]?\b/gi, ''));

  // Polling for new messages every 2.5 seconds
  useEffect(() => {
    if (!isOpen || !requestId) return;

    let isMounted = true;

    const fetchChat = async () => {
      try {
        const res = await api.getChatMessages(requestId);
        if (isMounted && res.success && Array.isArray(res.data)) {
          setMessages(res.data);
        }
      } catch (err) {
        // silent fail on poll
      }
    };

    fetchChat();
    const interval = setInterval(fetchChat, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, requestId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const messageText = inputText.trim();
    setBlockedAlert(null);
    setLoading(true);

    try {
      const res = await api.sendChatMessage(requestId, {
        text: messageText,
        sender_role: currentRole,
        sender_name: currentUserName || (currentRole === 'donor' ? 'Donor' : 'Requester'),
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
        setInputText('');
      }
    } catch (err: any) {
      const errorMsg =
        err.message ||
        '⚠️ Message was blocked by the safety shield. Discussions of money, fees, or payment are strictly prohibited.';
      setBlockedAlert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col h-[600px] max-h-[90vh] overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-rose-700 text-white p-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-bold text-base tracking-wide">Live Coordination Chat</h3>
            </div>
            <p className="text-xs text-rose-100 mt-0.5">
              Direct line with {otherPartyName || 'Participant'} • Voluntary & Free
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white/90 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Shield Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-start gap-2.5 shrink-0 text-amber-900 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-tight">
            <span className="font-semibold text-amber-950">Safety Shield Active:</span> Blood
            donation is voluntary & free. Discussions of money, UPI, or payments are detected and
            automatically blocked.
          </p>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-stone-600">Secure Direct Channel Ready</p>
              <p className="text-xs text-stone-400 mt-1 max-w-xs">
                Coordinate your hospital arrival, room location, or blood bank details directly with{' '}
                {otherPartyName}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_role === currentRole;
              const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-stone-600">
                      {isMe ? 'You' : msg.sender_name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                        msg.sender_role === 'donor'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {msg.sender_role === 'donor' ? 'Donor' : 'Requester'}
                    </span>
                    <span className="text-[10px] text-stone-400">{formattedTime}</span>
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                      isMe
                        ? 'bg-red-700 text-white rounded-br-xs'
                        : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Warning Alert if payment term detected client-side or rejected by server */}
        {isTypingPayment && (
          <div className="bg-red-50 border-t border-red-200 px-3.5 py-1.5 flex items-center gap-2 text-xs text-red-700 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
            <span>
              Payment terms detected. Any request or offer of money is illegal and will be blocked.
            </span>
          </div>
        )}

        {blockedAlert && (
          <div className="bg-rose-100 border-t border-rose-300 px-4 py-2 text-xs text-rose-900 font-medium flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-700 mt-0.5" />
            <span>{blockedAlert}</span>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (blockedAlert) setBlockedAlert(null);
            }}
            placeholder="Type coordination message (e.g., Arrived at Blood Bank)..."
            className="flex-1 px-4 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-medium rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

