import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Chat({ clientId = null }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const route = user.role === 'admin' && clientId ? `/admin/messages?client_id=${clientId}` : '/messages';
      const res = await api.get(route);
      // Filter to this conversation if admin
      let msgs = res.data;
      if (user.role === 'admin' && clientId) {
        msgs = res.data.filter(m =>
          (m.sender_id === clientId || m.receiver_id === clientId)
        );
      }
      setMessages(msgs);
      await api.put('/messages/read');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 10000);
    return () => clearInterval(iv);
  }, [clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const body = { content: text.trim() };
      if (user.role === 'admin' && clientId) body.receiver_id = clientId;
      const res = await api.post('/messages', body);
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <Loader size={20} className="spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  );

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <p>Pas encore de messages.<br />Commencez la conversation !</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === user.id || msg.sender?.id === user.id;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              {!isMine && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, marginLeft: 4 }}>
                  {msg.sender?.full_name}
                </span>
              )}
              <div className={`chat-bubble ${isMine ? 'sent' : 'received'}`}>
                {msg.content}
              </div>
              <span className="chat-time" style={{ textAlign: isMine ? 'right' : 'left', marginLeft: isMine ? 0 : 4 }}>
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Écrire un message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={sending}
        />
        <button className="btn btn-primary btn-sm" onClick={send} disabled={sending || !text.trim()}>
          {sending ? <Loader size={14} className="spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
