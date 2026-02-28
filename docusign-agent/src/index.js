const express = require('express');
const config = require('./config');
const whatsappRoutes = require('./routes/whatsapp');
const dashboardRoutes = require('./routes/dashboard');
const docusignWebhook = require('./routes/docusign-webhook');
const { startScheduler } = require('./services/followup');

const app = express();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'docusign-contract-agent' });
});

// Routes
app.use('/whatsapp', whatsappRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/docusign', docusignWebhook);

// Start follow-up scheduler
startScheduler();

app.listen(config.port, () => {
  console.log(`Mind Station Coaching - Contract Agent`);
  console.log(`Server running on port ${config.port}`);
  console.log(`Dashboard: http://localhost:${config.port}/dashboard`);
  console.log(`WhatsApp webhook: ${config.baseUrl}/whatsapp/webhook`);
  console.log(`DocuSign webhook: ${config.baseUrl}/docusign/webhook`);
});
