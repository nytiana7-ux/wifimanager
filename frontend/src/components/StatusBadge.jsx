import React from 'react';

const labels = {
  active: 'Actif',
  expired: 'Expiré',
  pending: 'En attente',
  validated: 'Validé',
  rejected: 'Refusé',
  info: 'Info',
};

export default function StatusBadge({ status }) {
  const label = labels[status] || status;
  return <span className={`badge badge-${status}`}>{label}</span>;
}
