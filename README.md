# 📡 WiFi Manager — Guide complet

Application web pour gérer les abonnements WiFi de vos clients.

---

## 🗂️ Structure du projet

```
wifimanager/
├── frontend/          → React + Vite (déployer sur Vercel)
├── backend/           → Node.js + Express (déployer sur Render)
└── database/
    └── schema.sql     → À exécuter dans Supabase
```

---

## ⚡ Installation locale (développement)

### Prérequis
- Node.js 18+
- Compte Supabase (gratuit) : https://supabase.com
- Compte Cloudinary (gratuit) : https://cloudinary.com

---

## 🗄️ Étape 1 : Base de données Supabase

1. Créer un projet sur https://supabase.com
2. Aller dans **SQL Editor**
3. Copier-coller le contenu de `database/schema.sql`
4. Cliquer **Run**

Récupérer dans **Settings > API** :
- `Project URL` → SUPABASE_URL
- `service_role key` → SUPABASE_SERVICE_KEY

---

## 🖼️ Étape 2 : Cloudinary (images de paiement)

1. Créer un compte gratuit sur https://cloudinary.com
2. Récupérer dans le dashboard :
   - Cloud name → CLOUDINARY_CLOUD_NAME
   - API Key → CLOUDINARY_API_KEY
   - API Secret → CLOUDINARY_API_SECRET

---

## 🔧 Étape 3 : Backend

```bash
cd backend
cp .env.example .env
# Remplir les valeurs dans .env
npm install
npm run dev
# Démarre sur http://localhost:5000
```

---

## 🎨 Étape 4 : Frontend

```bash
cd frontend
cp .env.example .env
# Mettre VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
# Ouvre http://localhost:5173
```

---

## 🚀 Déploiement gratuit

### Backend → Render.com

1. Créer un compte sur https://render.com
2. **New > Web Service** → connecter votre dépôt GitHub
3. Racine du service : `backend/`
4. Build Command : `npm install`
5. Start Command : `npm start`
6. Ajouter toutes les variables d'environnement (copier depuis .env)
7. Déployer → noter l'URL (ex: `https://wifimanager-api.onrender.com`)

### Frontend → Vercel

1. Créer un compte sur https://vercel.com
2. **New Project** → connecter votre dépôt GitHub
3. Racine du projet : `frontend/`
4. Framework Preset : Vite
5. Ajouter les variables d'environnement :
   - `VITE_API_URL` = URL Render + `/api`
   - `VITE_PAYMENT_NUMBER` = votre numéro Mobile Money
6. Déployer

### Mettre à jour CORS sur Render
Ajouter `FRONTEND_URL` = URL Vercel dans les variables Render.

---

## 🔐 Connexion par défaut

| Role | Username | Mot de passe |
|------|----------|--------------|
| Admin | `admin` | `admin123` |
| Client test | `rakoto` | (définir dans Supabase) |

⚠️ **Changer le mot de passe admin immédiatement après la première connexion !**

Pour créer un vrai hash bcrypt, exécuter :
```bash
node -e "const b = require('bcryptjs'); b.hash('votre_mdp', 10).then(console.log)"
```
Et mettre à jour dans Supabase SQL :
```sql
UPDATE users SET password_hash = 'le_hash_généré' WHERE username = 'admin';
```

---

## 🔄 Créer des clients

**Via l'interface admin :**
- Se connecter en tant qu'admin
- Aller dans "Clients" → "Ajouter"
- Remplir nom, username, mot de passe, téléphone

**Via SQL :**
```sql
INSERT INTO users (username, password_hash, full_name, phone, role, status)
VALUES ('client1', 'HASH_ICI', 'Nom Prénom', '034 XX XXX XX', 'client', 'pending');
```

---

## 📱 Fonctionnalités

### Espace Client
- ✅ Dashboard avec statut d'abonnement
- ✅ Soumission de paiement (référence + capture d'écran)
- ✅ Chat avec l'administrateur
- ✅ Notifications en temps réel
- ✅ Historique des paiements
- ✅ Interface mobile responsive

### Espace Admin
- ✅ Vue d'ensemble (stats, indicateurs)
- ✅ Gestion des clients (CRUD + activation)
- ✅ Validation/refus des paiements avec preuve
- ✅ Messagerie avec chaque client
- ✅ Statistiques et graphiques
- ✅ Export CSV des paiements
- ✅ Recherche et filtrage

---

## 🛡️ Sécurité

- Mots de passe hashés avec **bcrypt** (salt rounds: 10)
- Authentification **JWT** (expiration 7 jours)
- **Rate limiting** : 100 req/15min global, 10 tentatives de login/15min
- **Helmet.js** pour les headers HTTP sécurisés
- Validation des fichiers uploadés (type + taille)
- Routes admin protégées côté serveur
- CORS restreint au domaine frontend

---

## 🔧 Variables d'environnement complètes

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=secret_64_caracteres_aleatoires
JWT_EXPIRES_IN=7d
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
CLOUDINARY_CLOUD_NAME=nom_cloud
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=secret
FRONTEND_URL=https://votre-app.vercel.app
PAYMENT_NUMBER=034 XX XXX XX
```

### Frontend (.env)
```env
VITE_API_URL=https://votre-backend.onrender.com/api
VITE_PAYMENT_NUMBER=034 XX XXX XX
```

---

## ❓ Dépannage

**"CORS error"** → Vérifier FRONTEND_URL dans Render

**"Invalid token"** → JWT_SECRET différent entre redéploiements → fixer la valeur

**Images non affichées** → Vérifier les clés Cloudinary

**Supabase "Row not found"** → Vérifier que le schéma SQL a bien été exécuté

**Render "cold start"** → Le plan gratuit met ~30s à démarrer après inactivité → normal
