const express = require('express');
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

const router = express.Router();

// GET /api/messages - Mes messages
router.get('/', authenticate, async (req, res) => {
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

// POST /api/messages - Envoyer un message
router.post('/', authenticate, async (req, res) => {
  const { content, receiver_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });

  try {
    let targetId = receiver_id;

    // Si client, envoyer à l'admin
    if (req.user.role === 'client') {
      const { data: admin } = await supabase.from('users').select('id').eq('role', 'admin').single();
      if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });
      targetId = admin.id;
    }

    const { data, error } = await supabase.from('messages').insert({
      sender_id: req.user.id,
      receiver_id: targetId,
      content: content.trim()
    }).select(`
      *,
      sender:sender_id(id, username, full_name, role),
      receiver:receiver_id(id, username, full_name, role)
    `).single();

    if (error) throw error;

    // Notifier le destinataire
    await supabase.from('notifications').insert({
      user_id: targetId,
      title: 'Nouveau message',
      message: `${req.user.name} vous a envoyé un message.`,
      type: 'info'
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/messages/read - Marquer comme lu
router.put('/read', authenticate, async (req, res) => {
  try {
    await supabase.from('messages').update({ is_read: true }).eq('receiver_id', req.user.id).eq('is_read', false);
    res.json({ message: 'Messages marqués comme lus' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
