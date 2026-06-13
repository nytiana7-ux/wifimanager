const express = require('express');
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');
const router = express.Router();

router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('id, username, full_name, phone, status, created_at')
      .eq('id', req.user.id).single();

    const { data: subscription } = await supabase
      .from('subscriptions').select('*').eq('user_id', req.user.id)
      .order('created_at', { ascending: false }).limit(1).single();

    const { data: payments } = await supabase
      .from('payments').select('*').eq('user_id', req.user.id)
      .order('created_at', { ascending: false }).limit(10);

    res.json({ ...user, subscription, payments: payments || [] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
