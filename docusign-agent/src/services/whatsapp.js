const twilio = require('twilio');
const config = require('../config');

let client = null;

function getClient() {
  if (!client) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

async function sendMessage(body) {
  const twilioClient = getClient();
  await twilioClient.messages.create({
    from: config.twilio.whatsappNumber,
    to: config.twilio.yourNumber,
    body,
  });
}

async function notifyContractSent(clientData) {
  await sendMessage(
    `Contract sent!\n\n` +
    `Client: ${clientData.name}\n` +
    `Email: ${clientData.email}\n` +
    `Program: ${clientData.program || 'N/A'}\n` +
    `Price: ${clientData.price || 'N/A'}\n\n` +
    `Letter of Engagement has been sent via DocuSign. I'll follow up if they don't sign within 48 hours.`
  );
}

async function notifyContractSigned(clientData) {
  await sendMessage(
    `Contract signed!\n\n` +
    `${clientData.name} has signed their Letter of Engagement.\n` +
    `Program: ${clientData.program || 'N/A'}\n` +
    `Price: ${clientData.price || 'N/A'}`
  );
}

async function notifyFollowupSent(clientData, reminderNumber) {
  await sendMessage(
    `Follow-up reminder #${reminderNumber} sent to ${clientData.name} (${clientData.email}) — their Letter of Engagement is still unsigned.`
  );
}

async function notifyEscalation(clientData) {
  await sendMessage(
    `Action needed!\n\n` +
    `${clientData.name} still hasn't signed their Letter of Engagement after multiple reminders.\n` +
    `Email: ${clientData.email}\n` +
    `Phone: ${clientData.phone || 'N/A'}\n\n` +
    `You may want to call or text them directly.`
  );
}

async function sendConfirmation(to, body) {
  const twilioClient = getClient();
  await twilioClient.messages.create({
    from: config.twilio.whatsappNumber,
    to,
    body,
  });
}

module.exports = {
  sendMessage,
  notifyContractSent,
  notifyContractSigned,
  notifyFollowupSent,
  notifyEscalation,
  sendConfirmation,
};
