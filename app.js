// Importer les modules nécessaires
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const axios = require('axios');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const ngrok = require('@ngrok/ngrok');
require('dotenv').config();  // Charger les variables d'environnement

// Initialiser l'application Express
const app = express();
const port = process.env.PORT || 5000;

// Configurer bodyParser pour traiter les données JSON et URL-encoded
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Configurer les vues et les fichiers statiques
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Connexion à la base de données MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'speaksecret'
});

db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
    return;
  }
  console.log('Connecté à la base de données MySQL');
});

// Route pour l'accueil
app.get('/', (req, res) => {
  res.render('index', {
    title: 'SecretSpeak',
    description: 'SecretSpeak est votre plateforme de confiance pour des discussions confidentielles.'
  });
});

// Page À propos
app.get('/about', (req, res) => {
  res.render('about', {
    title: 'À propos de SecretSpeak'
  });
});

// Page de connexion
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Connexion'
  });
});

// Traitement de la connexion
app.post('/login', (req, res) => {
  const { email, mot_de_passe } = req.body;

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Erreur lors de la requête de connexion:', err);
      res.status(500).json({ message: 'Erreur serveur' });
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
      if (match) {
        res.json({ message: 'Connexion réussie', redirect: '/welcome' });
      } else {
        res.status(401).json({ message: 'Mot de passe incorrect' });
      }
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  });
});

// Page d'inscription
app.get('/signup', (req, res) => {
  res.render('signup', {
    title: 'Inscription'
  });
});

// Traitement de l'inscription
app.post('/signup', async (req, res) => {
  const { nom, email, mot_de_passe } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const query = 'INSERT INTO users (nom, email, mot_de_passe) VALUES (?, ?, ?)';
    db.query(query, [nom, email, hashedPassword], (err, result) => {
      if (err) {
        console.error('Erreur lors de la requête d\'inscription:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
      }

      res.status(200).json({ message: 'Inscription réussie !' });
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Page de contact
app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contactez-nous'
  });
});

// Traitement du formulaire de contact
app.post('/submit-contact-form', (req, res) => {
  const { name, email, message } = req.body;

  console.log(`Nom: ${name}, Email: ${email}, Message: ${message}`);
  
  res.json({ message: 'Votre message a été envoyé avec succès !' });
});

// Page de bienvenue
app.get('/welcome', (req, res) => {
  res.render('welcome', {
    title: 'Bienvenue sur SecretSpeak'
  });
});

// Facebook Messenger API - Envoyer un message
app.post('/send-message', (req, res) => {
  const { userId, messageText } = req.body;

  const url = `https://graph.facebook.com/v10.0/me/messages?access_token=${process.env.FB_ACCESS_TOKEN}`;
  const messageData = {
    recipient: { id: userId },
    message: { text: messageText }
  };

  axios.post(url, messageData)
    .then(response => {
      res.status(200).json({ message: 'Message envoyé avec succès sur Messenger', data: response.data });
    })
    .catch(error => {
      console.error('Erreur lors de l\'envoi du message:', error);
      res.status(500).json({ error: 'Échec de l\'envoi du message.' });
    });
});

// Webhook - Validation pour Facebook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || '2mYtLfbwz6scrlm5zVF0joDcwHa_5ET9k4BPrhPB61c2W29Eh';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Vérification échouée.');
  }
});

// Webhook - Réception des événements Facebook Messenger
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      console.log('Événement Webhook reçu:', webhookEvent);

      const senderId = webhookEvent.sender.id;
      if (webhookEvent.message && webhookEvent.message.text) {
        const message = webhookEvent.message.text;
        console.log(`Message reçu de l'utilisateur ${senderId}: ${message}`);
      }
    });

    res.status(200).send('Événement reçu');
  } else {
    res.status(404).send('Événement non pris en charge.');
  }
});

// Lancer le serveur
app.listen(port, async () => {
  console.log(`Serveur en cours d'exécution à http://localhost:${port}`);

  // Démarrer Ngrok
  try {
    const ngrokUrl = await ngrok.connect({
      addr: port,
      authtoken: '2mYtLfbwz6scrlm5zVF0joDcwHa_5ET9k4BPrhPB61c2W29Eh'
    });
    console.log(`Ingress établi à : ${ngrokUrl}`);
  } catch (error) {
    console.error('Erreur lors de la connexion Ngrok:', error);
  }
});

app.post("/webhook", (req, res) => {
  let body = req.body;

  console.log(`\u{1F7EA} Received webhook:`);
  console.dir(body, { depth: null });
});