# Backlog

Things to do later, roughly in order of importance.

- **Backups.** Nothing can restore a campaign that's deleted by mistake. Options: Firestore scheduled daily backups (Blaze; costs about 3¢/GB-month, so pennies for this site), a free "Download everything" button on the admin page, or an "Export campaign" button for owners.
- **App Check for picture uploads.** Firebase → App Check → APIs → Cloud Storage → Enforce, once nearly all requests show as verified.
- **RSVP for the next session.** "I'm in / Can't make it" under the countdown; reminder emails could say how many are coming.
- **Install as an app.** Web app manifest so the ledger can be added to a phone's home screen and open full-screen.
- **Shared dice roller for players.** Rolls visible to the table in Recent.
- **Tidy up replaced pictures.** Old portrait/photo files stay in Storage when replaced.
- **Email deliverability.** If invites/reminders keep landing in spam, move to a custom domain with a sending service (Resend/Postmark free tier).

## Done
- App Check token lifetime raised from 1 hour to 7 days (October 5, 2026), so reCAPTCHA's 10,000 free checks a month go much further.
