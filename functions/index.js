/* Arkham Ledger server functions.
   - inviteEmail: when an owner invites someone by email, send them a short email about it.
   - sessionReminders: once an hour, email members of campaigns whose next session is within 24 hours.
   Mail goes out through Gmail (MAIL_FROM in .env) using the app password kept in Secret Manager. */
const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret, defineString} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const MAIL_FROM = defineString('MAIL_FROM');
const SITE_URL = defineString('SITE_URL', {default: 'https://arkhamrpg.web.app'});

const INVITES_PER_DAY = 30;   // per inviter, so one account can't use the site to spam
const HOUR = 3600 * 1000;

let transport = null;
function mailer() {
  if (!transport) {
    transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {user: MAIL_FROM.value(), pass: GMAIL_APP_PASSWORD.value().replace(/\s+/g, '')},
    });
  }
  return transport;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
const oneLine = s => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, 120);

function page(title, paras, button, footer) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1b2230">' +
    '<div style="font-family:Georgia,serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Arkham Ledger</div>' +
    '<h1 style="font-family:Georgia,serif;font-size:22px;margin:8px 0 16px">' + esc(title) + '</h1>' +
    paras.map(p => '<p style="font-size:15px;line-height:1.5;margin:0 0 12px">' + p + '</p>').join('') +
    (button ? '<p style="margin:20px 0"><a href="' + esc(button.href) + '" style="background:#1b2230;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:15px;display:inline-block">' + esc(button.label) + '</a></p>' : '') +
    '<p style="font-size:12px;color:#6b7280;line-height:1.5;margin-top:24px">' + footer + '</p></div>';
}

async function send(to, subject, text, html) {
  await mailer().sendMail({from: '"Arkham Ledger" <' + MAIL_FROM.value() + '>', to, subject, text, html});
}

/* ---------- Invite emails ---------- */
exports.inviteEmail = onDocumentCreated({document: 'invites/{id}', secrets: [GMAIL_APP_PASSWORD]}, async (event) => {
  const inv = event.data && event.data.data();
  if (!inv || typeof inv.toEmail !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inv.toEmail)) return;
  if (!inv.fromUid || !inv.cid) return;

  // Daily cap per inviter.
  const day = new Date().toISOString().slice(0, 10);
  const counter = db.doc('mailcount/' + inv.fromUid + '_' + day);
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counter);
    const n = snap.exists ? (snap.get('n') || 0) : 0;
    if (n >= INVITES_PER_DAY) return false;
    tx.set(counter, {n: n + 1, day, expires: admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 24 * HOUR)}, {merge: true});
    return true;
  });
  if (!allowed) { logger.warn('Invite email cap reached', {fromUid: inv.fromUid}); return; }

  // The campaign must still exist and the inviter must own it.
  const camp = await db.doc('campaigns/' + inv.cid).get();
  if (!camp.exists || camp.get('ownerUid') !== inv.fromUid) return;

  const site = SITE_URL.value();
  const from = oneLine(inv.fromName) || 'Someone';
  const name = oneLine(camp.get('name') || inv.campaignName) || 'a campaign';
  const subject = from + ' invited you to “' + name + '” on Arkham Ledger';
  const text = from + ' invited you to join the Arkham Horror RPG campaign "' + name + '" on Arkham Ledger.\n\n' +
    'Sign in at ' + site + ' with this email address (' + inv.toEmail + ') and the invite will be waiting on your My campaigns page.\n\n' +
    'If you weren\'t expecting this, you can ignore it. Nothing happens unless you sign in and accept.';
  const html = page(from + ' invited you to “' + name + '”', [
    esc(from) + ' wants you in their Arkham Horror RPG campaign <b>' + esc(name) + '</b> on Arkham Ledger, where your group keeps its investigators in sync at the table.',
    'Sign in with this email address (<b>' + esc(inv.toEmail) + '</b>) and the invite will be waiting on your <b>My campaigns</b> page.',
  ], {href: site, label: 'Open Arkham Ledger'},
  'If you weren\'t expecting this, you can ignore it. Nothing happens unless you sign in and accept.');

  try { await send(inv.toEmail, subject, text, html); }
  catch (e) { logger.error('Invite email failed', {err: String(e && e.message || e)}); }
});

/* ---------- Session reminders ---------- */
function whenText(ms, tz) {
  try {
    return new Intl.DateTimeFormat('en-US', {weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short'}).format(new Date(ms));
  } catch (e) {
    return whenText(ms, 'America/New_York');
  }
}

exports.sessionReminders = onSchedule({schedule: 'every 60 minutes', secrets: [GMAIL_APP_PASSWORD], timeoutSeconds: 300}, async () => {
  const now = Date.now();
  const qs = await db.collection('campaigns').where('nextSession', '>', now).where('nextSession', '<=', now + 24 * HOUR).get();
  const site = SITE_URL.value();

  for (const doc of qs.docs) {
    const c = doc.data();
    if (c.deleting || c.remindedFor === c.nextSession) continue;
    // Mark first, so a slow or failed run never sends the same reminder twice.
    await doc.ref.update({remindedFor: c.nextSession});

    const uids = Array.isArray(c.memberIds) ? c.memberIds.slice(0, 20) : [];
    if (!uids.length) continue;
    const [users, prefs] = await Promise.all([
      admin.auth().getUsers(uids.map(uid => ({uid}))).catch(() => ({users: []})),
      Promise.all(uids.map(uid => db.doc('prefs/' + uid).get().catch(() => null))),
    ]);
    const prefOf = {};
    prefs.forEach((p, i) => { prefOf[uids[i]] = p && p.exists ? p.data() : {}; });
    const banned = await Promise.all(uids.map(uid => db.doc('bans/' + uid).get().then(s => s.exists, () => false)));
    const bannedSet = new Set(uids.filter((u, i) => banned[i]));

    const name = oneLine(c.name) || 'Your campaign';
    const where = oneLine(c.nextWhere);
    const link = site + '/play.html?c=' + encodeURIComponent(doc.id);
    for (const u of users.users || []) {
      const p = prefOf[u.uid] || {};
      if (!u.email || u.disabled || p.noRemind === true || bannedSet.has(u.uid)) continue;
      const when = whenText(c.nextSession, typeof p.tz === 'string' && p.tz ? p.tz : 'America/New_York');
      const subject = 'Reminder: ' + name + ' – ' + when;
      const text = 'The next session of "' + name + '" is ' + when + (where ? ' at ' + where : '') + '.\n\n' +
        'Open the ledger: ' + link + '\n\n' +
        'Don\'t want these? Turn off session reminders under Your account at ' + site + '.';
      const html = page(name + ' is coming up', [
        'The next session is <b>' + esc(when) + '</b>' + (where ? ' at <b>' + esc(where) + '</b>' : '') + '.',
      ], {href: link, label: 'Open the ledger'},
      'Don\'t want these? Turn off session reminders under <b>Your account</b> at <a href="' + esc(site) + '" style="color:#6b7280">' + esc(site.replace(/^https?:\/\//, '')) + '</a>.');
      try { await send(u.email, subject, text, html); }
      catch (e) { logger.error('Reminder email failed', {cid: doc.id, err: String(e && e.message || e)}); }
    }
  }
});

/* ---------- Calendar file ----------
   arkhamrpg.web.app/cal/<campaign id>.ics serves the campaign's next session as a calendar event.
   A real link (rather than a downloaded file) is what lets iPhones and Macs open it straight in Calendar.
   It shows only the campaign name, time and place, to people who have the campaign's id. */
function icsText(s) { return String(s == null ? '' : s).replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n'); }
function icsTime(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
exports.calendar = onRequest({cors: false, maxInstances: 5}, async (req, res) => {
  const m = /\/cal\/([A-Za-z0-9]{10,40})\.ics$/.exec(req.path || '');
  if (!m) { res.status(404).send('Not found'); return; }
  const snap = await db.doc('campaigns/' + m[1]).get().catch(() => null);
  const c = snap && snap.exists ? snap.data() : null;
  if (!c || c.deleting || typeof c.nextSession !== 'number' || c.nextSession < Date.now() - 6 * HOUR) {
    res.status(404).set('Content-Type', 'text/plain; charset=utf-8').send('No upcoming session is set for this campaign.');
    return;
  }
  const site = SITE_URL.value();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Arkham Ledger//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', 'UID:' + m[1] + '-' + c.nextSession + '@arkhamrpg.web.app', 'DTSTAMP:' + icsTime(Date.now()),
    'DTSTART:' + icsTime(c.nextSession), 'DTEND:' + icsTime(c.nextSession + (c.nextHours >= 1 && c.nextHours <= 12 ? c.nextHours : 4) * HOUR),
    'SUMMARY:' + icsText(oneLine(c.name) + ' \u2014 Arkham Horror'),
    c.nextWhere ? 'LOCATION:' + icsText(oneLine(c.nextWhere)) : '',
    'DESCRIPTION:' + icsText('Open the ledger: ' + site + '/play.html?c=' + m[1]),
    'URL:' + site + '/play.html?c=' + m[1],
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean);
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', 'inline; filename="arkham-session.ics"');
  res.set('Cache-Control', 'public, max-age=60');
  res.send(lines.join('\r\n') + '\r\n');
});
