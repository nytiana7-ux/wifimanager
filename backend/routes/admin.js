const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../config/supabase');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard - Statistiques
router.get('/dashboard', async (req, res) => {
  try {
    const [users, payments, pendingPayments, messages] = await Promise.all([
      supabase.from('users').select('id, status').eq('role', 'client'),
      supabase.from('payments').select('id, status, amount, created_at'),
      supabase.from('payments').select('*', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('messages').select('id', { count: 'exact' }).eq('is_read', false).eq('receiver_id', req.user.id)
    ]);

    const stats = {
      total_clients: users.data?.length || 0,
      active_clients: users.data?.filter(u => u.status === 'active').length || 0,
      expired_clients: users.data?.filter(u => u.status === 'expired').length || 0,
      pending_clients: users.data?.filter(u => u.status === 'pending').length || 0,
      total_payments: payments.data?.length || 0,
      pending_payments: pendingPayments.count || 0,
      validated_payments: payments.data?.filter(p => p.status === 'validated').length || 0,
      unread_messages: messages.count || 0,
      total_revenue: payments.data?.filter(p => p.status === 'validated').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/clients - Liste des clients
router.get('/clients', async (req, res) => {
  const { search, status } = req.query;
  try {
    let query = supabase
      .from('users')
      .select(`
        id, username, full_name, phone, status, created_at,
        subscriptions(id, start_date, end_date, status, plan_name, plan_price)
      `)
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/clients - Créer un client
router.post('/clients', async (req, res) => {
  const { username, password, full_name, phone } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'username, password et full_name requis' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert({
      username: username.toLowerCase(),
      password_hash: hash,
      full_name,
      phone,
      role: 'client',
      status: 'pending'
    }).select('id, username, full_name, phone, status, created_at').single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username déjà utilisé' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/clients/:id - Modifier un client
router.put('/clients/:id', async (req, res) => {
  const { full_name, phone, status } = req.body;
  try {
    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (status) updates.status = status;

    const { data, error } = await supabase
      .from('users').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    if (status) {
      await supabase.from('notifications').insert({
        user_id: req.params.id,
        title: status === 'active' ? 'Abonnement activé' : 'Statut mis à jour',
        message: status === 'active' ? 'Votre abonnement est maintenant actif !' : `Votre statut a été mis à jour: ${status}`,
        type: status === 'active' ? 'success' : 'info'
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/payments - Tous les paiements
router.get('/payments', async (req, res) => {
  const { status } = req.query;
  try {
    let query = supabase
      .from('payments')
      .select(`*, user:user_id(id, username, full_name, phone)`)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/payments/:id - Valider/Refuser un paiement
router.put('/payments/:id', async (req, res) => {
  const { status, admin_note, subscription_days } = req.body;
  if (!['validated', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  try {
    const { data: payment, error } = await supabase
      .from('payments').update({ status, admin_note }).eq('id', req.params.id)
      .select('*, user:user_id(id, username, full_name)').single();
    if (error) throw error;

    if (status === 'validated') {
      const days = subscription_days || 30;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);

      await supabase.from('users').update({ status: 'active' }).eq('id', payment.user_id);
      if (payment.subscription_id) {
        await supabase.from('subscriptions').update({
          status: 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }).eq('id', payment.subscription_id);
      }

      await supabase.from('notifications').insert({
        user_id: payment.user_id,
        title: '✅ Paiement validé !',
        message: `Votre paiement a été validé. Abonnement actif jusqu'au ${endDate.toLocaleDateString('fr-FR')}.`,
        type: 'success'
      });
    } else {
      await supabase.from('notifications').insert({
        user_id: payment.user_id,
        title: '❌ Paiement refusé',
        message: admin_note || 'Votre paiement a été refusé. Contactez l\'administrateur.',
        type: 'error'
      });
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/messages - Toutes les conversations
router.get('/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, username, full_name, role),
        receiver:receiver_id(id, username, full_name, role)
      `)
      .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/export/payments - Export CSV
router.get('/export/payments', async (req, res) => {
  try {
    const { data } = await supabase
      .from('payments')
      .select('*, user:user_id(username, full_name, phone)')
      .order('created_at', { ascending: false });

    const csv = [
      'Date,Client,Username,Téléphone,Référence,Montant,Statut',
      ...(data || []).map(p =>
        `${p.payment_date},${p.user?.full_name},${p.user?.username},${p.user?.phone || ''},${p.payment_reference || ''},${p.amount},${p.status}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=paiements.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
