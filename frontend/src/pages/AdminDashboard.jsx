import React, { useState, useEffect } from 'react';
import {
  Menu, Users, CreditCard, MessageSquare, BarChart3, Search,
  Plus, Check, X, Eye, Download, ChevronDown, Loader,
  UserPlus, Send, RefreshCw, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import StatusBadge from '../components/StatusBadge';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const renderMain = () => {
    switch (active) {
      case 'dashboard': return <AdminOverview stats={stats} loading={loading} />;
      case 'clients': return <ClientsView onRefreshStats={loadStats} />;
      case 'payments': return <PaymentsView onRefreshStats={loadStats} />;
      case 'messages': return <MessagesView />;
      case 'stats': return <StatsView stats={stats} />;
      default: return null;
    }
  };

  const pageTitle = {
    dashboard: 'Vue d\'ensemble',
    clients: 'Gestion des clients',
    payments: 'Paiements',
    messages: 'Messages',
    stats: 'Statistiques'
  };

  return (
    <div className="app-layout">
      <Sidebar
        active={active} setActive={setActive}
        unreadCount={stats?.unread_messages || 0}
        notifCount={stats?.pending_payments || 0}
        isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        <div className="topbar">
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}>
            <Menu size={22} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>Administration</span>
        </div>

        <div className="page-header">
          <h1 className="page-title">{pageTitle[active]}</h1>
          <p className="page-sub">Panneau de gestion WiFi Manager</p>
        </div>

        <div className="page-body fade-in">
          {renderMain()}
        </div>
      </main>
    </div>
  );
}

/* ---- Vue d'ensemble ---- */
function AdminOverview({ stats, loading }) {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader size={24} className="spin" style={{ color: 'var(--text-muted)' }} /></div>;
  if (!stats) return null;

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total clients</div>
          <div className="stat-value">{stats.total_clients}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Clients actifs</div>
          <div className="stat-value">{stats.active_clients}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">En attente</div>
          <div className="stat-value">{stats.pending_clients + stats.pending_payments}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Expirés</div>
          <div className="stat-value">{stats.expired_clients}</div>
        </div>
      </div>
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card info">
          <div className="stat-label">Paiements validés</div>
          <div className="stat-value">{stats.validated_payments}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Paiements en attente</div>
          <div className="stat-value">{stats.pending_payments}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Revenus totaux</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{stats.total_revenue.toLocaleString('fr')}</div>
          <div className="stat-sub">Ariary</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Messages non lus</div>
          <div className="stat-value">{stats.unread_messages}</div>
        </div>
      </div>
    </>
  );
}

/* ---- Clients ---- */
function ClientsView({ onRefreshStats }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await api.get(`/admin/clients?${params}`);
      setClients(res.data);
    } catch (err) {
      toast.error('Erreur chargement clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, filterStatus]);

  const changeStatus = async (id, status) => {
    try {
      await api.put(`/admin/clients/${id}`, { status });
      toast.success('Statut mis à jour');
      load(); onRefreshStats();
    } catch (err) {
      toast.error('Erreur');
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} />
          <input placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="expired">Expirés</option>
          <option value="pending">En attente</option>
        </select>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <UserPlus size={15} /> Ajouter
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader size={20} className="spin" style={{ color: 'var(--text-muted)' }} /></div>
        ) : clients.length === 0 ? (
          <div className="empty-state"><p>Aucun client trouvé.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Username</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Fin abonnement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const latestSub = c.subscriptions?.[0];
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.full_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>@{c.username}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone || '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ fontSize: 13 }}>
                      {latestSub?.end_date ? format(new Date(latestSub.end_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(c); setShowEdit(true); }}>
                          Modifier
                        </button>
                        {c.status !== 'active' && (
                          <button className="btn btn-success btn-sm" onClick={() => changeStatus(c.id, 'active')}>Activer</button>
                        )}
                        {c.status !== 'expired' && (
                          <button className="btn btn-danger btn-sm" onClick={() => changeStatus(c.id, 'expired')}>Expirer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onSuccess={() => { load(); onRefreshStats(); }} />}
      {showEdit && selected && <EditClientModal client={selected} onClose={() => { setShowEdit(false); setSelected(null); }} onSuccess={() => { load(); onRefreshStats(); }} />}
    </>
  );
}

/* ---- Paiements ---- */
function PaymentsView({ onRefreshStats }) {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await api.get(`/admin/payments${params}`);
      setPayments(res.data);
    } catch (err) {
      toast.error('Erreur chargement paiements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const validate = async (id, status, note = '') => {
    try {
      await api.put(`/admin/payments/${id}`, { status, admin_note: note });
      toast.success(status === 'validated' ? 'Paiement validé !' : 'Paiement refusé');
      setSelected(null);
      load(); onRefreshStats();
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get('/admin/export/payments', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'paiements.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Erreur export');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Tous</option>
          <option value="pending">En attente</option>
          <option value="validated">Validés</option>
          <option value="rejected">Refusés</option>
        </select>
        <button className="btn btn-ghost" onClick={exportCSV}>
          <Download size={15} /> Exporter CSV
        </button>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><Loader size={20} className="spin" style={{ color: 'var(--text-muted)' }} /></div>
        ) : payments.length === 0 ? (
          <div className="empty-state"><p>Aucun paiement trouvé.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Date paiement</th>
                <th>Référence</th>
                <th>Montant</th>
                <th>Preuve</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.user?.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>@{p.user?.username}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{format(new Date(p.payment_date), 'dd/MM/yyyy')}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{p.payment_reference || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.amount ? `${p.amount.toLocaleString('fr')} Ar` : '—'}</td>
                  <td>
                    {p.proof_image_url ? (
                      <a href={p.proof_image_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                        <Eye size={13} /> Voir
                      </a>
                    ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-success btn-sm" onClick={() => validate(p.id, 'validated')}>
                          <Check size={13} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => validate(p.id, 'rejected', 'Paiement non conforme')}>
                          <X size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(p)}>
                          Détails
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} onAction={validate} />}
    </>
  );
}

/* ---- Messages Admin ---- */
function MessagesView() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/clients').then(res => {
      setClients(res.data);
      if (res.data.length > 0) setSelectedClient(res.data[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '600px' }}>
      {/* Liste clients */}
      <div className="card" style={{ width: 220, flexShrink: 0, padding: '1rem', overflowY: 'auto' }}>
        <p className="section-title">Clients</p>
        {loading ? <Loader size={16} className="spin" style={{ color: 'var(--text-muted)' }} /> :
          clients.map(c => (
            <button key={c.id} className={`nav-item ${selectedClient?.id === c.id ? 'active' : ''}`}
              onClick={() => setSelectedClient(c)} style={{ width: '100%' }}>
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                {c.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.full_name}
              </div>
            </button>
          ))
        }
      </div>

      {/* Chat */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
        {selectedClient ? (
          <>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar">{selectedClient.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedClient.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{selectedClient.username}</div>
              </div>
              <StatusBadge status={selectedClient.status} />
            </div>
            <Chat clientId={selectedClient.id} />
          </>
        ) : (
          <div className="empty-state"><p>Sélectionnez un client</p></div>
        )}
      </div>
    </div>
  );
}

/* ---- Stats ---- */
function StatsView({ stats }) {
  if (!stats) return null;
  const total = stats.total_clients || 1;
  const bars = [
    { label: 'Actifs', value: stats.active_clients, color: 'var(--success)', pct: Math.round(stats.active_clients / total * 100) },
    { label: 'Expirés', value: stats.expired_clients, color: 'var(--danger)', pct: Math.round(stats.expired_clients / total * 100) },
    { label: 'En attente', value: stats.pending_clients, color: 'var(--warning)', pct: Math.round(stats.pending_clients / total * 100) },
  ];

  return (
    <>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1.25rem' }}>Répartition des clients</h3>
        {bars.map(b => (
          <div key={b.label} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{b.label}</span>
              <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{b.value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({b.pct}%)</span></span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-dark)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-card success">
          <div className="stat-label">Revenus validés</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{(stats.total_revenue || 0).toLocaleString('fr')}</div>
          <div className="stat-sub">Ariary</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Taux d'activation</div>
          <div className="stat-value">{Math.round(stats.active_clients / total * 100)}%</div>
          <div className="stat-sub">des clients</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">Total paiements</div>
          <div className="stat-value">{stats.total_payments}</div>
          <div className="stat-sub">{stats.validated_payments} validés</div>
        </div>
      </div>
    </>
  );
}

/* ---- Modals ---- */
function AddClientModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '', full_name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.username || !form.password || !form.full_name) return toast.error('Champs requis manquants');
    setLoading(true);
    try {
      await api.post('/admin/clients', form);
      toast.success('Client créé avec succès');
      onSuccess(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Nouveau client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="form-group"><label className="form-label">Nom complet *</label><input className="form-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Mot de passe *</label><input className="form-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ flex: 2 }}>
            {loading ? <Loader size={15} className="spin" /> : <><Plus size={15} /> Créer</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditClientModal({ client, onClose, onSuccess }) {
  const [form, setForm] = useState({ full_name: client.full_name, phone: client.phone || '', status: client.status });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.put(`/admin/clients/${client.id}`, form);
      toast.success('Client modifié');
      onSuccess(); onClose();
    } catch (err) {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Modifier @{client.username}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="form-group"><label className="form-label">Nom complet</label><input className="form-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
        <div className="form-group">
          <label className="form-label">Statut</label>
          <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="active">Actif</option>
            <option value="expired">Expiré</option>
            <option value="pending">En attente</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ flex: 2 }}>
            {loading ? <Loader size={15} className="spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentDetailModal({ payment, onClose, onAction }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (status) => {
    setLoading(true);
    await onAction(payment.id, status, note);
    setLoading(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Détail du paiement</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {[
            ['Client', `${payment.user?.full_name} (@${payment.user?.username})`],
            ['Téléphone', payment.user?.phone || '—'],
            ['Date paiement', format(new Date(payment.payment_date), 'dd MMMM yyyy', { locale: fr })],
            ['Référence', payment.payment_reference || '—'],
            ['Montant', payment.amount ? `${payment.amount.toLocaleString('fr')} Ar` : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {payment.proof_image_url && (
          <div style={{ marginBottom: '1rem' }}>
            <p className="form-label">Preuve de paiement</p>
            <img src={payment.proof_image_url} alt="Preuve" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Note (optionnelle)</label>
          <textarea className="form-textarea" placeholder="Motif de refus ou commentaire..." value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 70 }} />
        </div>

        {payment.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-danger" onClick={() => handle('rejected')} disabled={loading} style={{ flex: 1 }}>
              <X size={15} /> Refuser
            </button>
            <button className="btn btn-success" onClick={() => handle('validated')} disabled={loading} style={{ flex: 2 }}>
              {loading ? <Loader size={15} className="spin" /> : <><Check size={15} /> Valider</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
