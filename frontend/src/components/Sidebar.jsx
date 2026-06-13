import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wifi, LayoutDashboard, CreditCard, MessageSquare,
  Bell, Users, LogOut, Settings, BarChart3, X
} from 'lucide-react';

export default function Sidebar({ active, setActive, unreadCount, notifCount, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const clientNav = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'reabonnement', label: 'Réabonnement', icon: CreditCard },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifCount },
  ];

  const adminNav = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'payments', label: 'Paiements', icon: CreditCard, badge: notifCount },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  ];

  const nav = isAdmin ? adminNav : clientNav;
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <>
      <div className={`overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wifi size={18} />
          </div>
          <div>
            <div className="sidebar-logo-text">WiFi Manager</div>
            <div className="sidebar-logo-sub">{isAdmin ? 'Administration' : 'Espace client'}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
              padding: 4
            }}
            className="mobile-only"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {nav.map(item => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => { setActive(item.id); onClose(); }}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-pill" style={{ marginBottom: '0.5rem' }}>
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{user?.username}</div>
            </div>
          </div>
          <button className="nav-item" onClick={logout} style={{ color: 'var(--danger)' }}>
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
