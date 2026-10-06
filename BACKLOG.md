# Backlog

Things to do later, roughly in order of importance.

- **App Check for picture uploads.** Firebase → App Check → APIs → Cloud Storage → Enforce, once nearly all requests show as verified.
- **RSVP for the next session.** "I'm in / Can't make it" under the countdown; reminder emails could say how many are coming.

- **Shared dice roller for players.** Rolls visible to the table in Recent.
- **Tidy up replaced pictures.** Old portrait/photo files stay in Storage when replaced.
- **Email deliverability.** If invites/reminders keep landing in spam, move to a custom domain with a sending service (Resend/Postmark free tier).

## Done
- Install as an app: manifest, home-screen icons and an Install app menu item (October 6, 2026).
- Daily Firestore backups, kept 14 days (October 6, 2026). Firestore → Disaster Recovery. A restore goes into a new database ("Restore with Cloud Shell" on a backup), then data is copied back.
- App Check token lifetime raised from 1 hour to 7 days (October 5, 2026), so reCAPTCHA's 10,000 free checks a month go much further.
