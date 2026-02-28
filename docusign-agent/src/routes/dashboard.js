const express = require('express');
const path = require('path');
const router = express.Router();
const config = require('../config');
const { queries } = require('../services/database');
const docusign = require('../services/docusign');
const whatsapp = require('../services/whatsapp');

// Basic auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"');
    return res.status(401).send('Authentication required');
  }

  const credentials = Buffer.from(header.split(' ')[1], 'base64')
    .toString()
    .split(':');
  const [user, pass] = credentials;

  if (user === config.dashboard.username && pass === config.dashboard.password) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"');
  return res.status(401).send('Invalid credentials');
}

router.use(auth);

// Serve dashboard page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../templates/dashboard.html'));
});

// Get recent clients
router.get('/api/clients', (req, res) => {
  const clients = queries.getRecentClients.all();
  res.json(clients);
});

// Send contract
router.post('/api/send', express.json(), async (req, res) => {
  const { name, email, phone, program, price, dateFrom, dateTo } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const result = queries.insertClient.run({
      name,
      email,
      phone: phone || null,
      program: program || null,
      price: price || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    });

    const envelopeId = await docusign.sendLetterOfEngagement({
      name,
      email,
      phone,
      program,
      price,
      dateFrom,
      dateTo,
    });

    queries.updateEnvelope.run({ id: result.lastInsertRowid, envelopeId });

    await whatsapp.notifyContractSent({ name, email, phone, program, price });

    res.json({ success: true, envelopeId, clientId: result.lastInsertRowid });
  } catch (err) {
    console.error('Send contract error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search Calendly for client
router.get('/api/calendly/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const calendly = require('../services/calendly');
    const booking = await calendly.findClientByName(q);
    res.json(booking ? [booking] : []);
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
