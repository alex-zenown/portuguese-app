# Mind Station Coaching - DocuSign Contract Agent

Automated agent that sends your Letter of Engagement via DocuSign when you sign new coaching clients. You can instruct it via WhatsApp or a web dashboard.

## What It Does

1. **You have a consultation** (booked via Calendly)
2. **Client says yes** — you tell the agent via WhatsApp or the web dashboard
3. **Agent sends** the Letter of Engagement via DocuSign
4. **Auto follow-up** — email reminders at 48hrs and 5 days if unsigned
5. **Escalation** — WhatsApp alert to you at 7 days so you can call/text the client

---

## Setup Guide

### Step 1: DocuSign Developer Account & API Keys

1. Go to [developers.docusign.com](https://developers.docusign.com/) and create a free developer account
2. In the dashboard, click **"Add App and Integration Key"**
3. Note your **Integration Key** (this is your `DOCUSIGN_INTEGRATION_KEY`)
4. Under **Authentication**, select **"RSA Keypair"** — click **Generate RSA**
5. **Save the private key** as `docusign_private_key.pem` in the `docusign-agent/` folder
6. Under **Additional Settings > Redirect URIs**, add: `http://localhost:3000/callback`
7. Note your **User ID** from your DocuSign account settings (this is `DOCUSIGN_USER_ID`)
8. Note your **Account ID** from the API account info (this is `DOCUSIGN_ACCOUNT_ID`)

**Grant consent** (one-time): Visit this URL in your browser:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=http://localhost:3000/callback
```
Click "Accept" to grant your app permission to send envelopes on your behalf.

### Step 2: Create Your Letter of Engagement Template

1. Log into [demo.docusign.net](https://demo.docusign.net)
2. Go to **Templates > New > Create Template**
3. Upload your Letter of Engagement document (Word/PDF)
4. Add a **Role** called exactly: `Client`
5. Add these **Text tabs** (custom fields) to the template:
   - `ClientName` — where the client's name appears
   - `ClientEmail` — where the client's email appears
   - `Program` — where the coaching program name appears
   - `Price` — where the price appears
6. Add a **Signature** tab where the client should sign
7. Add a **Date Signed** tab
8. Save the template and note the **Template ID** (this is `DOCUSIGN_TEMPLATE_ID`)

### Step 3: Twilio Account (for WhatsApp)

1. Sign up at [twilio.com](https://www.twilio.com/)
2. Get your **Account SID** and **Auth Token** from the Twilio console
3. Go to **Messaging > Try it Out > Send a WhatsApp Message**
4. Follow the sandbox setup to connect your WhatsApp number
5. Set the webhook URL to: `https://YOUR_DEPLOYED_URL/whatsapp/webhook`
6. Note:
   - `TWILIO_ACCOUNT_SID` — your Twilio Account SID
   - `TWILIO_AUTH_TOKEN` — your Twilio Auth Token
   - `TWILIO_WHATSAPP_NUMBER` — the Twilio sandbox number (e.g. `whatsapp:+14155238886`)
   - `YOUR_WHATSAPP_NUMBER` — your personal WhatsApp number (e.g. `whatsapp:+447XXXXXXXXX`)

### Step 4: Calendly API Key

1. Log into Calendly and go to **Integrations > API & Webhooks**
2. Generate a **Personal Access Token**
3. This is your `CALENDLY_API_TOKEN`

### Step 5: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in all the values from steps 1-4

### Step 6: Install & Run

```bash
cd docusign-agent
npm install
npm start
```

The agent will start on port 3000 (or your configured port).

### Step 7: Deploy

The agent needs to be publicly accessible for webhooks. Recommended options:

**Railway (recommended for simplicity):**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Or Render:**
1. Connect your GitHub repo at [render.com](https://render.com)
2. Set the root directory to `docusign-agent`
3. Add your environment variables in the dashboard

After deploying, update:
- `BASE_URL` in your `.env` to your deployed URL
- Twilio WhatsApp webhook URL to `https://YOUR_URL/whatsapp/webhook`

### Step 8: DocuSign Connect (optional but recommended)

For instant notifications when a client signs:
1. In DocuSign, go to **Settings > Connect**
2. Add a new configuration
3. Set the URL to: `https://YOUR_URL/docusign/webhook`
4. Select events: **Envelope Completed**
5. Save

Without this, the agent still checks status via the hourly scheduler.

---

## Usage

### Via WhatsApp

Send a message to your Twilio WhatsApp number:

| Command | Example |
|---------|---------|
| **Send contract** | `Send contract to John Doe, john@email.com, 07700900000, Executive Coaching, £2,500` |
| **Check status** | `check John Doe` |
| **List all** | `status` |
| **Resend** | `resend John Doe` |
| **Help** | `help` |

If you just send a name, the agent will try to pull their details from Calendly.

### Via Web Dashboard

Go to `https://YOUR_URL/dashboard` and log in with your configured credentials.

---

## Follow-up Schedule

| Time after sending | Action |
|---|---|
| 48 hours | Auto resend via DocuSign email + WhatsApp notification to you |
| 5 days | Second auto resend + WhatsApp notification |
| 7 days | WhatsApp alert to you: "Call or text this client directly" |

These timings are configurable in your `.env` file.

---

## Production Checklist

- [ ] Switch DocuSign from sandbox to production:
  - Change `DOCUSIGN_AUTH_SERVER` to `account.docusign.com`
  - Change `DOCUSIGN_BASE_PATH` to `https://na1.docusign.net/restapi` (or your region)
  - Go live via the DocuSign developer dashboard
- [ ] Set up Twilio WhatsApp Business (beyond sandbox)
- [ ] Use a strong `DASHBOARD_PASSWORD`
- [ ] Set `BASE_URL` to your production URL
