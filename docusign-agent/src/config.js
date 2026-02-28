require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  docusign: {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
    secretKey: process.env.DOCUSIGN_SECRET_KEY,
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    userId: process.env.DOCUSIGN_USER_ID,
    privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH || './docusign_private_key.pem',
    templateId: process.env.DOCUSIGN_TEMPLATE_ID,
    authServer: process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com',
    basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    yourNumber: process.env.YOUR_WHATSAPP_NUMBER,
  },

  calendly: {
    apiToken: process.env.CALENDLY_API_TOKEN,
  },

  followup: {
    firstReminderHours: parseInt(process.env.FOLLOWUP_FIRST_REMINDER_HOURS) || 48,
    secondReminderHours: parseInt(process.env.FOLLOWUP_SECOND_REMINDER_HOURS) || 120,
    escalateHours: parseInt(process.env.FOLLOWUP_ESCALATE_HOURS) || 168,
  },

  dashboard: {
    username: process.env.DASHBOARD_USERNAME || 'admin',
    password: process.env.DASHBOARD_PASSWORD || 'changeme',
  },
};
