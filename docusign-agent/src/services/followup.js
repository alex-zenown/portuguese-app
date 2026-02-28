const cron = require('node-cron');
const config = require('../config');
const { queries } = require('./database');
const docusign = require('./docusign');
const whatsapp = require('./whatsapp');

function startScheduler() {
  // Run every hour to check for unsigned contracts
  cron.schedule('0 * * * *', async () => {
    try {
      await checkPendingContracts();
    } catch (err) {
      console.error('Follow-up scheduler error:', err.message);
    }
  });

  console.log('Follow-up scheduler started (runs every hour)');
}

async function checkPendingContracts() {
  const pending = queries.getPendingFollowups.all();
  const now = Date.now();

  for (const client of pending) {
    const sentAt = new Date(client.sent_at + 'Z').getTime();
    const hoursSinceSent = (now - sentAt) / (1000 * 60 * 60);

    // Check if contract was signed on DocuSign side
    try {
      const status = await docusign.getEnvelopeStatus(client.envelope_id);
      if (status === 'completed') {
        queries.markSigned.run({ envelopeId: client.envelope_id });
        await whatsapp.notifyContractSigned(client);
        continue;
      }
    } catch (err) {
      console.error(`Error checking envelope ${client.envelope_id}:`, err.message);
    }

    // First reminder
    if (
      !client.first_reminder_sent &&
      hoursSinceSent >= config.followup.firstReminderHours
    ) {
      try {
        await docusign.resendEnvelope(client.envelope_id);
        queries.markFirstReminder.run({ id: client.id });
        await whatsapp.notifyFollowupSent(client, 1);
        console.log(`First reminder sent to ${client.name}`);
      } catch (err) {
        console.error(`Error sending first reminder to ${client.name}:`, err.message);
      }
    }

    // Second reminder
    if (
      client.first_reminder_sent &&
      !client.second_reminder_sent &&
      hoursSinceSent >= config.followup.secondReminderHours
    ) {
      try {
        await docusign.resendEnvelope(client.envelope_id);
        queries.markSecondReminder.run({ id: client.id });
        await whatsapp.notifyFollowupSent(client, 2);
        console.log(`Second reminder sent to ${client.name}`);
      } catch (err) {
        console.error(`Error sending second reminder to ${client.name}:`, err.message);
      }
    }

    // Escalation — WhatsApp alert for manual outreach
    if (
      client.second_reminder_sent &&
      !client.escalated &&
      hoursSinceSent >= config.followup.escalateHours
    ) {
      try {
        queries.markEscalated.run({ id: client.id });
        await whatsapp.notifyEscalation(client);
        console.log(`Escalation alert sent for ${client.name}`);
      } catch (err) {
        console.error(`Error escalating ${client.name}:`, err.message);
      }
    }
  }
}

module.exports = { startScheduler, checkPendingContracts };
