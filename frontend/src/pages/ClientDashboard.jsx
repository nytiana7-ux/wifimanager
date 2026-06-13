import React, { useState, useEffect } from 'react';
import { Menu, Wifi, CreditCard, Bell, MessageSquare, RefreshCw, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import ReabonnementModal from '../components/ReabonnementModal';
import StatusBadge from '../components/StatusBadge';
import api from '../utils/api';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ClientDashboard() {
  const { user, refreshUser } = useAuth();
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReabo, setShowReabo] = useState(false);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const unreadMessages = messages.filter(m => !m.is_read && m.receiver_id === user?.id).length;
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const loadData = async () => {
    try {
      const [pRes, nRes, mRes] = await Promise.all([
        api.get('/payments/my'),
        api.get('/notifications'),
        api.get('/messages')
      ]);
      setPayments(pRes.data);
      setNotifications(nRes.data);
      setMessages(mRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const markNotifsRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const sub = user?.subscription;
  const daysLeft = sub?.end_date ? differenceInDays(new Date(sub.end_date), new Date()) : null;

  const renderMain = () => {
    if (loading) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader size={24} className="spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );

    switch (active) {
      case 'dashboard': return <DashboardView user={user} sub={sub} daysLeft={daysLeft} payments={payments} onReabo={() => setShowReabo(true)} />;
      case 'reabonnement': return <ReabonnementView onOpen={() => setShowReabo(true)} payments={payments} />;
      case 'messages': return (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>
            <MessageSquare size={16} style={{ marginRight: 8, verticalAlign: -2 }} />
            Conversation avec l'administrateur
          </h3>
          <Chat />
        </div>
      );
      case 'notifications': return <NotificationsView notifications={notifications} onMarkRead={markNotifsRead} />;
      default: return null;
    }
  };

  const pageTitle = {
    dashboard: 'Tableau de bord',
    reabonnement: 'Réabonnement',
    messages: 'Messages',
    notifications: 'Notifications'
  };

  return (
    <div className="app-layout">
      <Sidebar
        active={active} setActive={setActive}
        unreadCount={unreadMessages} notifCount={unreadNotifs}
        isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        {/* Mobile topbar */}
        <div className="topbar">
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}>
            <Menu size={22} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            WiFi Manager
          </span>
        </div>

        <div className="page-header">
          <h1 className="page-title">{pageTitle[active]}</h1>
          <p className="page-sub">Bonjour, {user?.full_name} 👋</p>
        </div>

        <div className="page-body fade-in">
          {renderMain()}
        </div>
      </main>

      {showReabo && (
        <ReabonnementModal
          onClose={() => setShowReabo(false)}
          onSuccess={() => { loadData(); refreshUser(); }}
        />
      )}
    </div>
  );
}

function DashboardView({ user, sub, daysLeft, payments, onReabo }) {
  const lastPayment = payments.find(p => p.status === 'validated');

  return (
    <>
      {/* Alerte expiration */}
      {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem',
          display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.25rem',
          fontSize: 14, color: 'var(--warning)'
        }}>
          <Clock size={16} />
          Votre abonnement expire dans <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong>. Pensez à renouveler !
        </div>
      )}

      {/* Statut principal */}
      <div className="card" style={{ marginBottom: '1rem', borderColor: user?.status === 'active' ? 'rgba(16,185,129,0.25)' : 'rgba(56,139,253,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: user?.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wifi size={24} color={user?.status === 'active' ? '#10b981' : '#60a5fa'} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{user?.username}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <StatusBadge status={user?.status || 'pending'} />
            <button className="btn btn-primary btn-sm" onClick={onReabo}>
              <RefreshCw size={14} /> Réabonnement
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card success">
          <div className="stat-label">Date fin abonnement</div>
          <div className="stat-value" style={{ fontSize: sub?.end_date ? 18 : 20 }}>
            {sub?.end_date ? format(new Date(sub.end_date), 'dd MMM yyyy', { locale: fr }) : '—'}
          </div>
          {daysLeft !== null && <div className="stat-sub">{daysLeft > 0 ? `${daysLeft} jours restants` : 'Expiré'}</div>}
        </div>

        <div className="stat-card warning">
          <div className="stat-label">Dernier paiement</div>
          <div className="stat-value" style={{ fontSize: lastPayment ? 18 : 20 }}>
            {lastPayment ? format(new Date(lastPayment.payment_date), 'dd MMM yyyy', { locale: fr }) : '—'}
          </div>
          {lastPayment && <div className="stat-sub">{lastPayment.amount?.toLocaleString('fr') || '—'} Ar</div>}
        </div>

        <div className="stat-card">
          <div className="stat-label">Plan</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{sub?.plan_name || 'Mensuel'}</div>
          <div className="stat-sub">{sub?.plan_price?.toLocaleString('fr') || '—'} Ar / mois</div>
        </div>
      </div>

      {/* Historique paiements */}
      <div className="card">
        <h3 className="section-title">Historique des paiements</h3>
        {payments.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>Aucun paiement enregistré.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {payments.slice(0, 5).map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.65rem 0.75rem', background: 'var(--bg-dark)',
                borderRadius: 'var(--radius-md)', flexWrap: 'wrap', gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.status === 'validated' ? <CheckCircle size={16} color="var(--success)" /> :
                   p.status === 'rejected' ? <XCircle size={16} color="var(--danger)" /> :
                   <Clock size={16} color="var(--warning)" />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {format(new Date(p.payment_date), 'dd MMM yyyy', { locale: fr })}
                    </div>
                    {p.payment_reference && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Réf: {p.payment_reference}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.amount && <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{p.amount.toLocaleString('fr')} Ar</span>}
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ReabonnementView({ onOpen, payments }) {
  return (
    <>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>
          <RefreshCw size={16} style={{ marginRight: 8, verticalAlign: -2 }} />
          Faire un réabonnement
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: '1.25rem', lineHeight: 1.7 }}>
          Pour renouveler votre abonnement WiFi, envoyez d'abord le paiement via Mobile Money, puis soumettez votre preuve de paiement.
        </p>
        <button className="btn btn-primary btn-lg btn-full" onClick={onOpen}>
          <CreditCard size={16} /> Soumettre un paiement
        </button>
      </div>

      <div className="card">
        <h3 className="section-title">Mes demandes de paiement</h3>
        {payments.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>Aucune demande pour le moment.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Référence</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {format(new Date(p.payment_date), 'dd/MM/yyyy')}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.payment_reference || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.amount ? `${p.amount.toLocaleString('fr')} Ar` : '—'}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function NotificationsView({ notifications, onMarkRead }) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: '📢' };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>
          <Bell size={16} style={{ marginRight: 8, verticalAlign: -2 }} />
          Notifications
        </h3>
        {notifications.some(n => !n.is_read) && (
          <button className="btn btn-ghost btn-sm" onClick={onMarkRead}>Tout marquer lu</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <p>Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              display: 'flex', gap: 12, padding: '0.85rem',
              background: n.is_read ? 'transparent' : 'rgba(59,130,246,0.05)',
              border: `1px solid ${n.is_read ? 'var(--border-subtle)' : 'rgba(59,130,246,0.15)'}`,
              borderRadius: 'var(--radius-md)'
            }}>
              <span style={{ fontSize: 18 }}>{icons[n.type] || '📢'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {format(new Date(n.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </div>
              </div>
              {!n.is_read && <div className="notif-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
