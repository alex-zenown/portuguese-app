const express = require('express');
const router = express.Router();
const { queries } = require('../services/database');
const whatsapp = require('../services/whatsapp');

// DocuSign Connect webhook — receives envelope status updates
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    const envelopeId = event.envelopeId || (event.data && event.data.envelopeId);
    const status = event.status || (event.data && event.data.envelopeSummary && event.data.envelopeSummary.status);

    if (!envelopeId) {
      return res.status(400).json({ error: 'Missing envelopeId' });
    }

    console.log(`DocuSign webhook: envelope ${envelopeId} status=${status}`);

    if (status === 'completed') {
      const client = queries.getClientByEnvelopeId.get({ envelopeId });
      if (client && client.status !== 'signed') {
        queries.markSigned.run({ envelopeId });
        await whatsapp.notifyContractSigned(client);
        console.log(`${client.name} signed their Letter of Engagement`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('DocuSign webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
