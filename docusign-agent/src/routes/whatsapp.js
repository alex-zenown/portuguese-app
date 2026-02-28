const express = require('express');
const router = express.Router();
const { parseCommand } = require('../utils/parser');
const { queries } = require('../services/database');
const docusign = require('../services/docusign');
const whatsapp = require('../services/whatsapp');
const calendly = require('../services/calendly');
const config = require('../config');

// Twilio WhatsApp webhook
router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;

  // Only accept messages from your number
  if (from !== config.twilio.yourNumber) {
    return res.status(403).send('Unauthorized');
  }

  try {
    const parsed = parseCommand(body);
    let reply;

    switch (parsed.command) {
      case 'send':
        reply = await handleSend(parsed);
        break;
      case 'status':
        reply = handleStatus();
        break;
      case 'check':
        reply = await handleCheck(parsed.name);
        break;
      case 'resend':
        reply = await handleResend(parsed.name);
        break;
      case 'help':
        reply = getHelpText();
        break;
      default:
        reply = `I didn't understand that. Send "help" for available commands.`;
    }

    await whatsapp.sendConfirmation(from, reply);
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    await whatsapp.sendConfirmation(from, `Error: ${err.message}`);
  }

  res.status(200).send('<Response></Response>');
});

async function handleSend(parsed) {
  let { name, email, phone, program, price } = parsed;

  if (!name || !email) {
    // Try to find client in Calendly by name
    if (name && !email) {
      try {
        const booking = await calendly.findClientByName(name);
        if (booking) {
          email = booking.email;
          phone = phone || booking.phone;
          return await sendContract({ name, email, phone, program, price }, true);
        }
      } catch (err) {
        // Calendly lookup failed, continue
      }
    }
    return `I need at least a name and email. Try:\n\n"Send contract to John Doe, john@email.com, 07700900000, Executive Coaching, £2500"`;
  }

  return await sendContract({ name, email, phone, program, price }, false);
}

async function sendContract(client, fromCalendly) {
  // Save to database
  const result = queries.insertClient.run({
    name: client.name,
    email: client.email,
    phone: client.phone || null,
    program: client.program || null,
    price: client.price || null,
  });

  // Send via DocuSign
  const envelopeId = await docusign.sendLetterOfEngagement(client);

  // Update database with envelope ID
  queries.updateEnvelope.run({ id: result.lastInsertRowid, envelopeId });

  const calendlyNote = fromCalendly ? ' (details pulled from Calendly)' : '';

  return (
    `Done! Letter of Engagement sent${calendlyNote}.\n\n` +
    `Client: ${client.name}\n` +
    `Email: ${client.email}\n` +
    `Phone: ${client.phone || 'N/A'}\n` +
    `Program: ${client.program || 'N/A'}\n` +
    `Price: ${client.price || 'N/A'}\n\n` +
    `I'll send a reminder if they don't sign within ${config.followup.firstReminderHours} hours.`
  );
}

function handleStatus() {
  const clients = queries.getRecentClients.all();
  if (clients.length === 0) {
    return 'No clients on record yet.';
  }

  const lines = clients.map((c) => {
    const icon = c.status === 'signed' ? 'Signed' : c.status === 'sent' ? 'Pending' : c.status;
    return `${icon}: ${c.name} (${c.program || 'N/A'}) - ${c.status}`;
  });

  return `Recent clients:\n\n${lines.join('\n')}`;
}

async function handleCheck(name) {
  const clients = queries.getRecentClients.all();
  const match = clients.find(
    (c) => c.name.toLowerCase().includes(name.toLowerCase())
  );

  if (!match) {
    return `No client found matching "${name}".`;
  }

  let statusDetail = `${match.name}\nEmail: ${match.email}\nProgram: ${match.program || 'N/A'}\nStatus: ${match.status}`;

  if (match.envelope_id) {
    try {
      const liveStatus = await docusign.getEnvelopeStatus(match.envelope_id);
      statusDetail += `\nDocuSign status: ${liveStatus}`;

      if (liveStatus === 'completed' && match.status !== 'signed') {
        queries.markSigned.run({ envelopeId: match.envelope_id });
        statusDetail += '\n\n(Just updated to signed!)';
      }
    } catch (err) {
      statusDetail += `\nCouldn't check DocuSign: ${err.message}`;
    }
  }

  return statusDetail;
}

async function handleResend(name) {
  const clients = queries.getRecentClients.all();
  const match = clients.find(
    (c) => c.name.toLowerCase().includes(name.toLowerCase())
  );

  if (!match) {
    return `No client found matching "${name}".`;
  }
  if (!match.envelope_id) {
    return `${match.name} doesn't have an active envelope to resend.`;
  }
  if (match.status === 'signed') {
    return `${match.name} has already signed their contract.`;
  }

  await docusign.resendEnvelope(match.envelope_id);
  return `Reminder re-sent to ${match.name} (${match.email}).`;
}

function getHelpText() {
  return (
    `Available commands:\n\n` +
    `Send contract to [name], [email], [phone], [program], [price]\n` +
    `  — Sends Letter of Engagement via DocuSign\n\n` +
    `status\n  — List recent clients and contract status\n\n` +
    `check [name]\n  — Check a specific client's contract status\n\n` +
    `resend [name]\n  — Resend the contract to a client\n\n` +
    `help\n  — Show this message`
  );
}

module.exports = router;
