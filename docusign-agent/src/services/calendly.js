const axios = require('axios');
const config = require('../config');

const calendlyApi = axios.create({
  baseURL: 'https://api.calendly.com',
  headers: {
    Authorization: `Bearer ${config.calendly.apiToken}`,
    'Content-Type': 'application/json',
  },
});

async function getRecentBookings(count = 10) {
  const userRes = await calendlyApi.get('/users/me');
  const userUri = userRes.data.resource.uri;

  const eventsRes = await calendlyApi.get('/scheduled_events', {
    params: {
      user: userUri,
      count,
      status: 'active',
      sort: 'start_time:desc',
    },
  });

  const events = eventsRes.data.collection;
  const bookings = [];

  for (const event of events) {
    const inviteesRes = await calendlyApi.get(
      `${event.uri}/invitees`
    );
    const invitee = inviteesRes.data.collection[0];
    if (invitee) {
      bookings.push({
        name: invitee.name,
        email: invitee.email,
        phone: extractPhone(invitee.questions_and_answers),
        eventName: event.name,
        startTime: event.start_time,
        calendlyEventUri: event.uri,
      });
    }
  }

  return bookings;
}

async function findClientByEmail(email) {
  const bookings = await getRecentBookings(20);
  return bookings.find(
    (b) => b.email.toLowerCase() === email.toLowerCase()
  );
}

async function findClientByName(name) {
  const bookings = await getRecentBookings(20);
  const lowerName = name.toLowerCase();
  return bookings.find(
    (b) => b.name.toLowerCase().includes(lowerName)
  );
}

function extractPhone(questionsAndAnswers) {
  if (!questionsAndAnswers) return null;
  const phoneQ = questionsAndAnswers.find(
    (q) =>
      q.question.toLowerCase().includes('phone') ||
      q.question.toLowerCase().includes('number')
  );
  return phoneQ ? phoneQ.answer : null;
}

module.exports = { getRecentBookings, findClientByEmail, findClientByName };
