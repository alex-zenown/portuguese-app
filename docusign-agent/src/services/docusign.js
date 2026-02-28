const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let dsApiClient = null;
let tokenExpiresAt = 0;

async function authenticate() {
  const now = Date.now();
  if (dsApiClient && now < tokenExpiresAt) {
    return dsApiClient;
  }

  dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(config.docusign.basePath);
  dsApiClient.setOAuthBasePath(config.docusign.authServer);

  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY
    ? Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n'))
    : fs.readFileSync(path.resolve(config.docusign.privateKeyPath));

  const results = await dsApiClient.requestJWTUserToken(
    config.docusign.integrationKey,
    config.docusign.userId,
    ['signature', 'impersonation'],
    privateKey,
    3600
  );

  const accessToken = results.body.access_token;
  tokenExpiresAt = now + (results.body.expires_in - 300) * 1000;
  dsApiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

  return dsApiClient;
}

async function sendLetterOfEngagement(client) {
  const apiClient = await authenticate();
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const envelopeDefinition = new docusign.EnvelopeDefinition();
  envelopeDefinition.templateId = config.docusign.templateId;
  envelopeDefinition.status = 'sent';

  const signer = docusign.TemplateRole.constructFromObject({
    email: client.email,
    name: client.name,
    roleName: 'Client',
    tabs: {
      textTabs: [
        { tabLabel: 'ClientName', value: client.name },
        { tabLabel: 'Program', value: client.program || '' },
        { tabLabel: 'Price', value: client.price || '' },
        { tabLabel: 'DateFrom', value: client.dateFrom || '' },
        { tabLabel: 'DateTo', value: client.dateTo || '' },
      ],
    },
  });

  envelopeDefinition.templateRoles = [signer];
  envelopeDefinition.emailSubject =
    'Mind Station Coaching - Letter of Engagement';
  envelopeDefinition.emailBlurb =
    `Dear ${client.name},\n\nPlease review and sign your Letter of Engagement for ${client.program || 'your coaching program'} with Mind Station Coaching.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nMind Station Coaching`;

  const result = await envelopesApi.createEnvelope(
    config.docusign.accountId,
    { envelopeDefinition }
  );

  return result.envelopeId;
}

async function getEnvelopeStatus(envelopeId) {
  const apiClient = await authenticate();
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const envelope = await envelopesApi.getEnvelope(
    config.docusign.accountId,
    envelopeId
  );

  return envelope.status;
}

async function resendEnvelope(envelopeId) {
  const apiClient = await authenticate();
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  await envelopesApi.update(config.docusign.accountId, envelopeId, {
    envelope: { resend_envelope: 'true' },
  });
}

module.exports = { sendLetterOfEngagement, getEnvelopeStatus, resendEnvelope };
