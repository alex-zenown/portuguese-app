const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'agent.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    program TEXT,
    price TEXT,
    envelope_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    sent_at TEXT,
    signed_at TEXT,
    first_reminder_sent INTEGER DEFAULT 0,
    second_reminder_sent INTEGER DEFAULT 0,
    escalated INTEGER DEFAULT 0
  )
`);

const queries = {
  insertClient: db.prepare(`
    INSERT INTO clients (name, email, phone, program, price)
    VALUES (@name, @email, @phone, @program, @price)
  `),

  updateEnvelope: db.prepare(`
    UPDATE clients SET envelope_id = @envelopeId, status = 'sent', sent_at = datetime('now')
    WHERE id = @id
  `),

  markSigned: db.prepare(`
    UPDATE clients SET status = 'signed', signed_at = datetime('now')
    WHERE envelope_id = @envelopeId
  `),

  markFirstReminder: db.prepare(`
    UPDATE clients SET first_reminder_sent = 1 WHERE id = @id
  `),

  markSecondReminder: db.prepare(`
    UPDATE clients SET second_reminder_sent = 1 WHERE id = @id
  `),

  markEscalated: db.prepare(`
    UPDATE clients SET escalated = 1 WHERE id = @id
  `),

  getPendingFollowups: db.prepare(`
    SELECT * FROM clients
    WHERE status = 'sent'
    ORDER BY sent_at ASC
  `),

  getClientByEnvelopeId: db.prepare(`
    SELECT * FROM clients WHERE envelope_id = @envelopeId
  `),

  getRecentClients: db.prepare(`
    SELECT * FROM clients ORDER BY created_at DESC LIMIT 20
  `),

  getClientById: db.prepare(`
    SELECT * FROM clients WHERE id = @id
  `),
};

module.exports = { db, queries };
