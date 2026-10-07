/* Arkham Horror RPG Ledger server functions.
   - inviteEmail: when an owner invites someone by email, send them a short email about it.
   - sessionReminders: once an hour, email members of campaigns whose next session is within 24 hours.
   Mail goes out through Gmail (MAIL_FROM in .env) using the app password kept in Secret Manager. */
const {onDocumentCreated, onDocumentWritten, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onRequest, onCall, HttpsError} = require('firebase-functions/v2/https');
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
    '<div style="font-family:Georgia,serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Arkham Horror RPG Ledger</div>' +
    '<h1 style="font-family:Georgia,serif;font-size:22px;margin:8px 0 16px">' + esc(title) + '</h1>' +
    paras.map(p => '<p style="font-size:15px;line-height:1.5;margin:0 0 12px">' + p + '</p>').join('') +
    (button ? '<p style="margin:20px 0"><a href="' + esc(button.href) + '" style="background:#1b2230;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:15px;display:inline-block">' + esc(button.label) + '</a></p>' : '') +
    '<p style="font-size:12px;color:#6b7280;line-height:1.5;margin-top:24px">' + footer + '</p></div>';
}

async function send(to, subject, text, html) {
  await mailer().sendMail({from: '"Arkham Horror RPG Ledger" <' + MAIL_FROM.value() + '>', to, subject, text, html});
}

/* ---------- Push notifications ----------
   Each phone or browser that turned notifications on has a devices/<token> document with its owner's uid.
   pushTo sends one notification to every device of the given people and forgets devices that are gone. */
async function pushTo(uids, title, body, link, tag) {
  uids = [...new Set(uids.filter(Boolean))];
  if (!uids.length) return;
  const tokens = [];
  for (let i = 0; i < uids.length; i += 30) {
    const qs = await db.collection('devices').where('uid', 'in', uids.slice(i, i + 30)).get().catch(() => null);
    if (qs) qs.forEach(d => tokens.push(d.id));
  }
  if (!tokens.length) return;
  const site = SITE_URL.value();
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      // Data-only: the page's background worker (firebase-messaging-sw.js) shows it and decides what a tap opens.
      webpush: {
        headers: {Urgency: 'high'},
        data: {title: oneLine(title), body: String(body || '').slice(0, 200), link: link || site, tag: tag || ''},
      },
    }).catch(e => { logger.error('Push failed', {err: String(e && e.message || e)}); return null; });
    if (!res) continue;
    await Promise.all(res.responses.map((r, k) => {
      const code = r.error && r.error.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token' || code === 'messaging/invalid-argument') {
        return db.doc('devices/' + batch[k]).delete().catch(() => {});
      }
      return null;
    }));
  }
}
async function prefsFor(uids) {
  const out = {};
  await Promise.all(uids.map(uid => db.doc('prefs/' + uid).get().then(s => { out[uid] = s.exists ? s.data() : {}; }, () => { out[uid] = {}; })));
  return out;
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
  const subject = from + ' invited you to “' + name + '” on Arkham Horror RPG Ledger';
  const text = from + ' invited you to join their campaign "' + name + '" on Arkham Horror RPG Ledger.\n\n' +
    'Sign in at ' + site + ' with this email address (' + inv.toEmail + ') and the invite will be waiting on your My campaigns page.\n\n' +
    'If you weren\'t expecting this, you can ignore it. Nothing happens unless you sign in and accept.';
  const html = page(from + ' invited you to “' + name + '”', [
    esc(from) + ' wants you in their campaign <b>' + esc(name) + '</b> on Arkham Horror RPG Ledger, where your group keeps its investigators in sync at the table.',
    'Sign in with this email address (<b>' + esc(inv.toEmail) + '</b>) and the invite will be waiting on your <b>My campaigns</b> page.',
  ], {href: site, label: 'Open Arkham Horror RPG Ledger'},
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
    const pushUids = uids.filter(uid => !bannedSet.has(uid) && (prefOf[uid] || {}).noRemind !== true);
    for (const uid of pushUids) {
      const tz = typeof (prefOf[uid] || {}).tz === 'string' && prefOf[uid].tz ? prefOf[uid].tz : 'America/New_York';
      await pushTo([uid], name + ' is coming up', whenText(c.nextSession, tz) + (where ? ' \u00b7 ' + where : ''), link, 'remind-' + doc.id).catch(() => {});
    }
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
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Arkham Horror RPG Ledger//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', 'UID:' + m[1] + '-' + c.nextSession + '@arkhamrpg.web.app', 'DTSTAMP:' + icsTime(Date.now()),
    'DTSTART:' + icsTime(c.nextSession), 'DTEND:' + icsTime(c.nextSession + (c.nextHours >= 1 && c.nextHours <= 12 ? c.nextHours : 4) * HOUR),
    'SUMMARY:' + icsText(oneLine(c.name) + ' \u2014 Arkham Horror RPG'),
    c.nextWhere ? 'LOCATION:' + icsText(oneLine(c.nextWhere)) : '',
    'DESCRIPTION:' + icsText('Open the ledger: ' + site + '/play.html?c=' + m[1]),
    'URL:' + site + '/play.html?c=' + m[1],
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean);
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', 'inline; filename="arkham-session.ics"');
  res.set('Cache-Control', 'public, max-age=60');
  res.send(lines.join('\r\n') + '\r\n');
});

/* ---------- Clue revealed ----------
   When the GM reveals a clue, notify the player it's for (or every player when it's for everyone). */
exports.clueAlert = onDocumentWritten('campaigns/{cid}/clues/{id}', async (event) => {
  const before = event.data && event.data.before && event.data.before.exists ? event.data.before.data() : null;
  const after = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : null;
  if (!after || after.shown !== true || (before && before.shown === true && before.to === after.to)) return;
  const cid = event.params.cid;
  const camp = await db.doc('campaigns/' + cid).get();
  if (!camp.exists || camp.get('deleting')) return;
  const c = camp.data();
  let uids = [];
  if (after.to === 'all') uids = (c.memberIds || []).filter(u => u !== c.gmUid);
  else if (/^p([1-9]|1[0-2])$/.test(String(after.to || ''))) {
    const ch = await db.doc('campaigns/' + cid + '/characters/' + after.to).get().catch(() => null);
    if (ch && ch.exists && ch.get('ownerUid')) uids = [ch.get('ownerUid')];
  }
  if (!uids.length) return;
  const prefs = await prefsFor(uids);
  uids = uids.filter(u => prefs[u].noCluePush !== true);
  const title = oneLine(after.title) || 'A new clue';
  await pushTo(uids, 'New clue in ' + (oneLine(c.name) || 'your campaign'), after.to === 'all' ? title : title + ' (just for you)',
    SITE_URL.value() + '/play.html?c=' + encodeURIComponent(cid) + '#clue-' + encodeURIComponent(event.params.id), 'clue-' + event.params.id);
});

/* ---------- Investigators' turn ----------
   In a fight, when play passes to the investigators, notify players who turned this on. */
exports.turnAlert = onDocumentUpdated('campaigns/{cid}/table/state', async (event) => {
  const b = event.data.before.data() || {}, a = event.data.after.data() || {};
  if (!a.fight || a.phase !== 'investigators' || (b.phase === 'investigators' && b.round === a.round)) return;
  const cid = event.params.cid;
  const camp = await db.doc('campaigns/' + cid).get();
  if (!camp.exists || camp.get('deleting')) return;
  const c = camp.data();
  let uids = (c.memberIds || []).filter(u => u !== c.gmUid);
  const prefs = await prefsFor(uids);
  uids = uids.filter(u => prefs[u].pushTurns === true);
  await pushTo(uids, 'Investigators\u2019 turn' + (a.round ? ' \u00b7 round ' + a.round : ''), (a.scene ? oneLine(a.scene) + ' \u2014 ' : '') + (oneLine(c.name) || ''),
    SITE_URL.value() + '/play.html?c=' + encodeURIComponent(cid), 'turn-' + cid);
});

/* adminDeleteUser: an admin removes someone's account from the admin page, the same as their own "Delete my account":
   their sign-in, profile, username, settings and devices; campaigns they own (with everything in them and their
   pictures, and invites to them); their place in other campaigns (investigators they played stay with those campaigns);
   invites they sent or were waiting on; and their profile pictures. Only accounts in admins/ can call it. */
const BUCKET = 'arkham-ledger.firebasestorage.app';
exports.adminDeleteUser = onCall({timeoutSeconds: 300, maxInstances: 2}, async (req) => {
  const caller = req.auth && req.auth.uid;
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (!(await db.doc('admins/' + caller).get()).exists) throw new HttpsError('permission-denied', 'Only admins can do this.');
  const uid = String((req.data && req.data.uid) || '');
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) throw new HttpsError('invalid-argument', 'No account given.');
  if (uid === caller) throw new HttpsError('failed-precondition', 'Use Delete my account for your own account.');
  if ((await db.doc('admins/' + uid).get()).exists) throw new HttpsError('failed-precondition', 'That account is an admin. Remove it from admins first.');

  const bucket = admin.storage().bucket(BUCKET);
  const dropPrefix = p => bucket.deleteFiles({prefix: p}).catch(e => logger.warn('deleteFiles', p, e.message));
  const delQuery = async q => { const qs = await q.get().catch(() => null); if (qs) await Promise.all(qs.docs.map(d => d.ref.delete().catch(() => {}))); };
  let email = '';
  try { email = String((await admin.auth().getUser(uid)).email || '').toLowerCase(); } catch (e) { /* sign-in already gone */ }

  // Campaigns they own: everything inside, their pictures and invites to them.
  const owned = await db.collection('campaigns').where('ownerUid', '==', uid).get();
  for (const c of owned.docs) {
    await delQuery(db.collection('invites').where('cid', '==', c.id));
    await dropPrefix('campaigns/' + c.id + '/');
    await db.recursiveDelete(c.ref);
  }
  // Campaigns they're in: take them out (like leaving).
  const member = await db.collection('campaigns').where('memberIds', 'array-contains', uid).get();
  for (const c of member.docs) {
    const d = c.data(), FV = admin.firestore.FieldValue;
    const p = {memberIds: FV.arrayRemove(uid), ['roles.' + uid]: FV.delete(), ['names.' + uid]: FV.delete()};
    if (d.gmUid === uid) p.gmUid = null;
    await c.ref.update(p).catch(e => logger.warn('leave', c.id, e.message));
  }
  // Invites from them or waiting for them, and their devices.
  await delQuery(db.collection('invites').where('fromUid', '==', uid));
  if (email) await delQuery(db.collection('invites').where('toEmail', '==', email));
  await delQuery(db.collection('devices').where('uid', '==', uid));
  // Profile, username, settings, suspension.
  const prof = await db.doc('users/' + uid).get();
  const lower = prof.exists && prof.data().usernameLower;
  const b = db.batch();
  if (lower) b.delete(db.doc('usernames/' + lower));
  ['users/', 'prefs/', 'bans/'].forEach(k => b.delete(db.doc(k + uid)));
  await b.commit();
  await dropPrefix('users/' + uid + '/');
  // Finally the sign-in itself.
  try { await admin.auth().deleteUser(uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
  logger.info('adminDeleteUser', {by: caller, uid, owned: owned.size, member: member.size});
  return {owned: owned.size, member: member.size};
});
