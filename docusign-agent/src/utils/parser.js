/**
 * Parses WhatsApp messages to extract client details and commands.
 *
 * Supported formats:
 *   "Send contracts to John Doe, john@email.com, 07700900000, Executive Coaching, 2500"
 *   "send loe John Doe john@email.com 07700900000 Executive Coaching 2500"
 *   "status" — list recent clients and their contract status
 *   "check John Doe" — check a specific client's contract status
 */

function parseCommand(message) {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (lower === 'status' || lower === 'list') {
    return { command: 'status' };
  }

  if (lower === 'help') {
    return { command: 'help' };
  }

  if (lower.startsWith('check ')) {
    return { command: 'check', name: text.slice(6).trim() };
  }

  if (lower.startsWith('resend ')) {
    return { command: 'resend', name: text.slice(7).trim() };
  }

  // Parse "send" command with client details
  const sendMatch = lower.match(
    /^(?:send\s+(?:contracts?|loe|letter|engagement)\s+(?:to\s+)?)/
  );
  if (sendMatch) {
    const details = text.slice(sendMatch[0].length);
    return { command: 'send', ...parseClientDetails(details) };
  }

  // Try to parse as direct client details (name, email, phone, program, price)
  if (text.includes('@') || text.includes(',')) {
    return { command: 'send', ...parseClientDetails(text) };
  }

  return { command: 'unknown', raw: text };
}

function parseClientDetails(text) {
  const parts = text.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);

  const result = {
    name: null,
    email: null,
    phone: null,
    program: null,
    price: null,
    dateFrom: null,
    dateTo: null,
  };

  for (const part of parts) {
    if (!result.email && part.includes('@')) {
      result.email = part;
    } else if (
      !result.phone &&
      /^[+\d\s()-]{7,}$/.test(part.replace(/\s/g, ''))
    ) {
      result.phone = part;
    } else if (
      !result.price &&
      /^[£$€]?\s*[\d,]+(?:\.\d{2})?$/.test(part.replace(/\s/g, ''))
    ) {
      result.price = part;
    } else if (
      !result.dateFrom &&
      /^\d{4}-\d{2}-\d{2}$/.test(part)
    ) {
      result.dateFrom = part;
    } else if (
      !result.dateTo &&
      result.dateFrom &&
      /^\d{4}-\d{2}-\d{2}$/.test(part)
    ) {
      result.dateTo = part;
    } else if (!result.name) {
      result.name = part;
    } else if (!result.program) {
      result.program = part;
    } else if (!result.price) {
      result.price = part;
    }
  }

  return result;
}

module.exports = { parseCommand, parseClientDetails };
