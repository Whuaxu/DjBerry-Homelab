// WhatsApp bot on top of WAHA.
//
// WAHA calls POST /webhook for every incoming message, and the bot answers
// through WAHA's HTTP API. Only the numbers in ALLOWED_NUMBERS can talk to it:
// everybody else is ignored silently (and never logged).
//
// No npm dependencies: just Node's built-in http server and fetch.
'use strict';

const http = require('node:http');

const PORT = 3000;
const WAHA_URL = process.env.WAHA_URL || 'http://waha:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY;
const ALLOWED_NUMBERS = new Set(
  (process.env.ALLOWED_NUMBERS || '')
    .split(',')
    .map((n) => n.replace(/\D/g, ''))
    .filter(Boolean),
);

if (!WAHA_API_KEY) {
  console.error('WAHA_API_KEY is missing (see bot.env.example)');
  process.exit(1);
}
if (ALLOWED_NUMBERS.size === 0) {
  console.warn('ALLOWED_NUMBERS is empty: every message will be ignored');
}

// Session used for messages the bot starts on its own (daily reminders)
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
const TIME_ZONE = process.env.TZ || 'Europe/Madrid';

// Daily reminders, as JSON: [{"time":"11:00","chatId":"...@g.us","text":"..."}]
let DAILY_REMINDERS = [];
try {
  DAILY_REMINDERS = JSON.parse(process.env.DAILY_REMINDERS || '[]');
} catch {
  console.error('DAILY_REMINDERS is not valid JSON: no reminders will be sent');
}

// --- WAHA API ----------------------------------------------------------------

async function waha(method, path, body) {
  const res = await fetch(`${WAHA_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${method} ${path.split('/').slice(0, 3).join('/')} -> HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : null;
}

// Phone number behind a chat id. WhatsApp sometimes hides it behind a
// "@lid" id, and WAHA can map that back to the number.
async function phoneOf(session, chatId) {
  if (chatId.endsWith('@c.us')) return chatId.split('@')[0];
  if (chatId.endsWith('@lid')) {
    const { pn } = await waha('GET', `/api/${session}/lids/${encodeURIComponent(chatId)}`);
    return pn ? pn.split('@')[0] : null;
  }
  return null; // groups, channels, status updates...
}

async function reply(session, chatId, msg, text, markSeen) {
  // Mark it as read first, like a person would (WAHA's advice to avoid blocks)
  if (markSeen) await waha('POST', '/api/sendSeen', { session, chatId, messageIds: [msg.id] });
  await waha('POST', '/api/sendText', { session, chatId, text, reply_to: msg.id });
}

// Chat a message belongs to. For your own messages GOWS leaves "to" empty
// and puts the chat in "from" (also in _data.Info.Chat).
function chatOf(msg) {
  const info = (msg._data && msg._data.Info) || {};
  return msg.fromMe ? info.Chat || msg.to || msg.from : msg.from;
}

// Is this own message in the "message yourself" chat of the linked phone?
// That chat is the one whose id is your own (as @lid or as phone number).
async function isSelfChat(session, msg, me) {
  const info = (msg._data && msg._data.Info) || {};
  const chat = chatOf(msg);
  if (!chat) return false;
  if (info.Sender && chat === info.Sender) return true;            // your own @lid
  const digits = (id) => (id ? String(id).split('@')[0].split(':')[0] : null);
  if (info.SenderAlt && info.RecipientAlt && digits(info.SenderAlt) === digits(info.RecipientAlt)) return true;
  if (me && (chat === me.id || (me.lid && chat === me.lid))) return true;
  return false;
}

// --- Commands ----------------------------------------------------------------

// DEBUG=1 logs why each message is ignored, with numbers masked
const DEBUG = process.env.DEBUG === '1';
const mask = (s) => String(s).replace(/\d{5,}/g, (d) => `${d.slice(0, 4)}…${d.slice(-2)}`);

// Two ways to give the bot commands:
// - from the linked phone itself, but ONLY in the chat with yourself
//   (never in conversations with other people);
// - from another phone listed in ALLOWED_NUMBERS, writing to the linked number.
async function onMessage(session, msg, me) {
  const text = (msg.body || '').trim().toLowerCase();

  // A reminder's "done" command (e.g. !agua) also works inside the reminder's
  // own chat, for anyone in it, so whoever did the task can tick it off.
  const chat = chatOf(msg);
  if (await markReminderDone(session, chat, msg, text, !msg.fromMe, true)) return;

  if (msg.fromMe) {
    const self = await isSelfChat(session, msg, me);
    if (DEBUG) console.log(`[debug] own message chat=${mask(chat)} selfChat=${self} isPing=${text === 'ping'}`);
    if (!self) return;
    return runCommand(session, chat, msg, text, false);
  }

  const phone = await phoneOf(session, msg.from);
  if (DEBUG) {
    console.log(`[debug] from=${mask(msg.from)} phone=${phone ? mask(phone) : 'unknown'} allowed=${ALLOWED_NUMBERS.has(phone)} isPing=${text === 'ping'}`);
  }
  if (!phone || !ALLOWED_NUMBERS.has(phone)) return;
  return runCommand(session, msg.from, msg, text, true);
}

async function runCommand(session, chatId, msg, text, markSeen) {
  if (text === 'ping') {
    await reply(session, chatId, msg, 'pong', markSeen);
    console.log('ping -> pong');
    return;
  }
  await markReminderDone(session, chatId, msg, text, markSeen, false);
}

// --- Daily reminders ---------------------------------------------------------
// Checks the clock every 20 s and sends each reminder once a day at its time
// (local time in TIME_ZONE, so daylight saving changes are handled).
// If the bot is down at that exact minute, that day's reminder is skipped.

const sentToday = new Set();

function localNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

async function checkReminders() {
  const { date, time } = localNow();
  for (const [i, r] of DAILY_REMINDERS.entries()) {
    const key = `${date} ${i}`;
    if (r.time !== time || sentToday.has(key)) continue;
    sentToday.add(key);
    try {
      await waha('POST', '/api/sendText', { session: WAHA_SESSION, chatId: r.chatId, text: r.text });
      console.log(`Reminder #${i + 1} sent (${r.time})`);
    } catch (err) {
      console.error(`Reminder #${i + 1} failed:`, err.message);
    }
  }
  // Forget previous days
  for (const key of sentToday) if (!key.startsWith(date)) sentToday.delete(key);
}

// "doneCommand" (e.g. "!agua") cancels that reminder for today.
// onlyInItsChat: accept it only when written in the reminder's own chat.
// Kept in memory: if the bot restarts that day, the reminder is armed again.
async function markReminderDone(session, chatId, msg, text, markSeen, onlyInItsChat) {
  const { date } = localNow();
  let matched = false;
  for (const [i, r] of DAILY_REMINDERS.entries()) {
    if (!r.doneCommand || text !== r.doneCommand.toLowerCase()) continue;
    if (onlyInItsChat && chatId !== r.chatId) continue;
    matched = true;
    const key = `${date} ${i}`;
    const alreadySent = sentToday.has(key);
    sentToday.add(key);
    console.log(`Reminder #${i + 1} marked as done for today`);
    await reply(session, chatId, msg, alreadySent
      ? '✅ Anotado (el aviso de hoy ya se había enviado)'
      : `✅ Hecho: hoy no se enviará el aviso de las ${r.time}`, markSeen);
  }
  return matched;
}

if (DAILY_REMINDERS.length > 0) {
  setInterval(() => checkReminders().catch(() => {}), 20_000);
  console.log(`${DAILY_REMINDERS.length} daily reminder(s) at ${DAILY_REMINDERS.map((r) => r.time).join(', ')} (${TIME_ZONE})`);
}

// --- HTTP server -------------------------------------------------------------

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200).end('ok');
    return;
  }
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404).end();
    return;
  }

  let raw = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 1_000_000) req.destroy(); // no event is that big
  });
  req.on('end', () => {
    res.writeHead(200).end(); // answer WAHA right away, work afterwards

    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    // message.any = incoming messages AND the ones the linked phone sends
    if (!['message', 'message.any'].includes(event.event) || !event.payload) return;

    onMessage(event.session, event.payload, event.me).catch((err) => {
      console.error('Could not handle a message:', err.message);
    });
  });
});

server.listen(PORT, () => console.log(`Bot listening on :${PORT}`));
