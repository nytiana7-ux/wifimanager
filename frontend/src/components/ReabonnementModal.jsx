import React, { useState, useRef } from 'react';
import { X, Upload, Send, Loader, ImageIcon } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PAYMENT_NUMBER = import.meta.env.VITE_PAYMENT_NUMBER || '034 XX XXX XX';

export default function ReabonnementModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ payment_date: '', payment_reference: '', amount: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = f => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Image trop grande (max 5 Mo).');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!form.payment_date) return toast.error('Veuillez indiquer la date du paiement.');
    if (!form.payment_reference && !file) return toast.error('Veuillez fournir une référence ou une preuve de paiement.');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('payment_date', form.payment_date);
      if (form.payment_reference) fd.append('payment_reference', form.payment_reference);
      if (form.amount) fd.append('amount', form.amount);
      if (file) fd.append('proof_image', file);

      await api.post('/payments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Paiement soumis ! En attente de validation.');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la soumission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Demande de réabonnement</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="info-box" style={{ marginBottom: '1.25rem' }}>
          <p>📲 Envoyez votre paiement sur :</p>
          <span className="phone-num">{PAYMENT_NUMBER}</span>
          <p>Puis remplissez le formulaire ci-dessous avec votre référence de paiement ou une capture d'écran.</p>
        </div>

        {/* Formulaire */}
        <div className="form-group">
          <label className="form-label">Date du paiement *</label>
          <input className="form-input" type="date" value={form.payment_date}
            onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Référence du paiement</label>
          <input className="form-input" type="text" placeholder="Ex: TXN123456789"
            value={form.payment_reference}
            onChange={e => setForm(p => ({ ...p, payment_reference: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Montant payé (Ar)</label>
          <input className="form-input" type="number" placeholder="Ex: 5000"
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
          />
        </div>

        {/* Upload zone */}
        <div className="form-group">
          <label className="form-label">Capture d'écran de la preuve</label>
          <div
            className={`upload-zone ${drag ? 'drag-over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          >
            {preview ? (
              <div>
                <img src={preview} alt="Preuve" style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
                <p style={{ fontSize: 12, color: 'var(--text-accent)' }}>{file?.name}</p>
              </div>
            ) : (
              <>
                <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Cliquez ou déposez votre image ici
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>JPG, PNG, WEBP — max 5 Mo</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ flex: 2 }}>
            {loading ? <><Loader size={16} className="spin" /> Envoi...</> : <><Send size={15} /> Envoyer</>}
          </button>
        </div>
      </div>
    </div>
  );
}
