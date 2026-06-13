const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images JPG/PNG/WEBP sont acceptées'));
  }
});

// POST /api/payments - Soumettre un paiement
router.post('/', authenticate, upload.single('proof_image'), async (req, res) => {
  const { payment_date, payment_reference, amount } = req.body;
  if (!payment_date) return res.status(400).json({ error: 'Date de paiement requise' });
  if (!payment_reference && !req.file) return res.status(400).json({ error: 'Référence ou preuve requise' });

  try {
    let proof_image_url = null;

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'wifi-payments', resource_type: 'image' },
          (error, result) => error ? reject(error) : resolve(result)
        ).end(req.file.buffer);
      });
      proof_image_url = result.secure_url;
    }

    // Créer abonnement en attente
    const { data: subscription } = await supabase.from('subscriptions').insert({
      user_id: req.user.id,
      status: 'pending',
      plan_name: 'Mensuel',
      plan_price: amount || 5000
    }).select().single();

    // Créer paiement
    const { data: payment, error } = await supabase.from('payments').insert({
      user_id: req.user.id,
      subscription_id: subscription?.id,
      payment_date,
      payment_reference,
      proof_image_url,
      amount: amount || 5000,
      status: 'pending'
    }).select().single();

    if (error) throw error;

    // Mettre à jour statut utilisateur
    await supabase.from('users').update({ status: 'pending' }).eq('id', req.user.id);

    // Notifier l'admin
    const { data: admin } = await supabase.from('users').select('id').eq('role', 'admin').single();
    if (admin) {
      await supabase.from('notifications').insert({
        user_id: admin.id,
        title: 'Nouveau paiement reçu',
        message: `${req.user.name} a soumis un paiement pour validation.`,
        type: 'info'
      });
    }

    res.status(201).json({ message: 'Paiement soumis avec succès', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la soumission du paiement' });
  }
});

// GET /api/payments/my - Mes paiements
router.get('/my', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
