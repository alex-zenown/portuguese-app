const express = require('express');
const config = require('./config');

const app = express();

// Health check (defined early, before any DB-dependent routes)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'docusign-contract-agent' });
});

// Load routes (these require database)
try {
  const whatsappRoutes = require('./routes/whatsapp');
  const dashboardRoutes = require('./routes/dashboard');
  const docusignWebhook = require('./routes/docusign-webhook');
  const { startScheduler } = require('./services/followup');

  app.use('/whatsapp', whatsappRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/docusign', docusignWebhook);

  startScheduler();
} catch (err) {
  console.error('Failed to load routes/services:', err);
  app.use((req, res) => {
    res.status(503).json({ error: 'Service starting up — check logs', detail: err.message });
  });
}

const port = config.port;
app.listen(port, '0.0.0.0', () => {
  console.log(`Mind Station Coaching - Contract Agent`);
  console.log(`Server running on port ${port}`);
  console.log(`Dashboard: ${config.baseUrl}/dashboard`);
  console.log(`WhatsApp webhook: ${config.baseUrl}/whatsapp/webhook`);
  console.log(`DocuSign webhook: ${config.baseUrl}/docusign/webhook`);
});
