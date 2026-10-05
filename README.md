# Arkham Ledger

Live character sheets and campaign tools for the Arkham Horror Roleplaying Game, at **https://arkhamrpg.web.app**.

Sign in, start a campaign, invite your group, and everyone's investigator sheets stay in sync at the table. It's a free fan project, not affiliated with Fantasy Flight Games.

This repo is the code behind the live site. It isn't packaged for running your own copy; to play, just use the site.

---

## For players

### Getting started
1. Go to **arkhamrpg.web.app** and sign in with Google or an email and password.
2. Pick a username. It's the name other players see. Your email is never shown to them.
3. Either **start a campaign** (the **+ New campaign** tile) or **join one** from an invite link or an email invite waiting on your **My campaigns** page.

### Roles in a campaign
- **Owner:** whoever started the campaign. Invites players, picks the GM, sets house rules and the campaign picture, and can remove members or delete the campaign. By default the owner plays by the same rules as everyone else; ticking **Let me edit every investigator** in Settings lets them change any sheet and delete Recent entries.
- **GM:** chosen by the owner (it can be the owner). Gets the **GM** tab. Only the GM can see GM notes, hidden enemies, hidden clues and the GM's activity log.
- **Player:** makes or claims one investigator and is the only one (besides the GM's session tools) who can change it.

### Inside a campaign
- **Party:** everyone's investigators at a glance. Tap one to open their sheet.
- **Investigator sheets:** dice pool, horror, injuries and traumas, insight, skills, knacks, weapons and gear, money, XP, and a **Recent** list of what changed. **Open printable sheet** gives a print-ready copy (Letter paper, background graphics on).
- **New investigator:** builds a character step by step following the corebook's creation rules. An unfinished character is kept on your device for that campaign for two weeks; **Start over** clears it.
- **Next session:** the owner (in Settings) or the GM (on the GM tab) sets the date, time and place, with Google address suggestions. Members get a reminder email the day before (they can turn it off in Your account). Everyone sees a countdown on the campaign card and the Party tab, with **Add to calendar** and **Directions**.
- **Journal:** clues and handouts the GM has revealed, enemies the GM is showing, the campaign tracker (date, threads, people, places) and **Past sessions**: a recap of each finished session, with the GM's optional summary on top.
- **GM tab (GM only):** scene and turn tracker with surprise rounds, encounter builder from the corebook's enemy profiles, clues and handouts (to everyone or one player), campaign tracker, end-of-session XP and momentous sessions, session recaps, GM notes and a hidden dice roller.

### Your account
Click your icon at the top right for **Your account**, where you can upload a profile photo or pick a colour for your initial, and **Delete my account** (removes your username, profile and sign-in, deletes campaigns you own and takes you out of the rest).

Knack names and tiers follow each archetype's table in the corebook. Each knack's effect is a short summary of the book's rules in our own words, and can be edited on the sheet.

---

## For the site owner

### How it's hosted
- **Firebase Hosting** serves the site at arkhamrpg.web.app. **Firestore** holds the data, **Firebase Authentication** handles sign-in (Google and email/password), and **App Check** with reCAPTCHA Enterprise blocks bots. The project is on Firebase's Blaze (pay-as-you-go) plan, which keeps the free allowances below and charges only for use above them; there's no server code.
- **Every push to `main` deploys automatically** through `.github/workflows/deploy-firebase.yml`: the site goes to Firebase Hosting and `firestore.rules` is published. The GitHub secret `FIREBASE_SERVICE_ACCOUNT` holds a service account with the roles **Firebase Hosting Admin**, **API Keys Viewer**, **Firebase Rules Admin**, **Service Usage Consumer** and **Cloud Datastore Viewer**. If the rules job fails, the old rules stay in place.
- Pages and scripts are served with `Cache-Control: no-cache` (see `firebase.json`), so players get changes on their next reload.
- The version number (bumped with every change) is in each page's footer and at the bottom of the account menu.

### Admin page
`admin.html` lists every user and campaign with search and totals (users, active this week, campaigns, suspended). An admin can:
- **Suspend** an account: it can still sign in and look, but the database refuses every change it makes, and it's taken out of campaigns it joined. Campaigns it owns stay so their players keep their sheets. **Unsuspend** lifts it (they'll need new invites).
- **Change username**, for example to replace an offensive one.
- **Delete** any campaign, including its hidden GM material.
- **Feedback** tab: messages people send with **Send feedback** in the account menu (bug, idea or other, with the page, browser and version). Mark each one **Done** to clear it.
- **Errors** tab: unexpected errors people hit while signed in (message, page, browser, version, who), recorded automatically by `js/config.js` (at most a few per visit). Clear them once dealt with.

Admins are accounts with a document in the `admins` collection in Firestore whose ID is their user ID (Firebase → Authentication → Users → **User UID**); it needs no fields. Email addresses and disabling a sign-in entirely are handled in Firebase → Authentication.

### Server functions, email and pictures
- `functions/` holds two server functions, deployed by the GitHub Action: **inviteEmail** emails someone when an owner invites them by email (at most 30 a day per inviter), and **sessionReminders** runs hourly and emails members whose next session is within 24 hours (once per session; people can opt out in Your account, which sets `prefs/<uid>.noRemind`).
- Mail goes out from **arkhamrpgledger@gmail.com** (`functions/.env`) using a Gmail app password stored in Google Cloud **Secret Manager** as `GMAIL_APP_PASSWORD`. To change the password, add a new version of that secret and re-run the deploy.
- Pictures (portraits, profile and campaign photos, handouts) are uploaded to Cloud Storage by `js/upload.js`, and the database stores their links. `storage.rules` decides who may add or delete files. If an upload fails, the picture is saved inline in the database as before, so older inline pictures keep working too.
- Address suggestions use the Places API (New) key in `window.PLACES_KEY` in `js/config.js`, limited in Google Cloud to arkhamrpg.web.app and to that one API.
- The GitHub service account also needs: Cloud Functions Admin, Service Account User, Cloud Scheduler Admin, Secret Manager Admin, Service Usage Admin, Artifact Registry Administrator and Eventarc Admin. The Storage service agent needs Firebase Rules Firestore Service Agent so `storage.rules` can check campaign membership.

### Bot protection (App Check)
The reCAPTCHA Enterprise site key is in `window.APP_CHECK_KEY` in `js/config.js`, and the web app is registered with it in Firebase → **Security → App Check**. Once **App Check → APIs** shows nearly all requests as verified, **Enforce** it for Cloud Firestore and Authentication. If pages stop loading data after enforcing, turn enforcement off there again. The key's allowed domains (Google Cloud → reCAPTCHA) must include every address the site is served from.

### Costs and limits
- The free allowance is about **50,000 database reads a day**. A busy game session with five people uses a few thousand. Above that, Blaze charges a few cents per 100,000 reads instead of pausing the site.
- Spending and the budget alert are under Firebase → **Usage and billing → Account & budgets**. Budget alerts only email; they don't stop charges.
- If billing ever lapses (for example when the free-trial credit ends without confirming a paid account), the free limits apply again and every page shows a banner when the daily limit is hit; nothing is lost.
- reCAPTCHA Enterprise is free for 10,000 checks a month. The App Check token lifetime is set to 7 days, so each device uses about one check a week.

### Privacy
`privacy.html` is linked from every page's footer and the sign-in screen. Update its date and text whenever what the site stores changes. Things it currently covers: account and username, profile photo or colour, campaign data and pictures, invites by email, roughly when people last visited, Firebase/Google as the host, and reCAPTCHA.


### The original ledger
`old/` (arkhamrpg.web.app/old) is the first single-party version with passcodes, a master key and a GM PIN, kept unchanged for reference. Its data is separate from the campaigns. `beta/` only forwards old links (including old invite links) to the main site.

---

## Code layout
- `index.html`: home page (sign-in, My campaigns, New campaign, campaign Settings, account). Script: `js/home.js`.
- `play.html?c=<campaign id>`: the ledger for one campaign. Scripts in `js/ledger/`, loaded in order:
  1. `1-state.js`: campaign, roles, saving and the local cache
  2. `2-rules.js`: game rules (dice pools, XP costs, gear)
  3. `3-render.js`: drawing the party, sheets and Journal
  4. `4-creator.js`: the New investigator creator
  5. `5-events.js`: buttons and form edits
  6. `6-gm.js`: GM tools, activity log and session recaps
  7. `7-boot.js`: connecting to Firebase and starting up
- `admin.html` with `js/admin.js` and `css/admin.css`: the admin page.
- `privacy.html`: the privacy policy. `help.html`: the **How it works** page for players (linked in every footer and from the sign-in screen); keep it in step with new features.
- `js/config.js`: Firebase settings, the App Check and Places keys, and the daily-limit banner.
- `js/upload.js`: picture uploads to Cloud Storage. `storage.rules`: who may add or delete pictures. `functions/`: the email functions.
- `js/avatar.js`: the account icon and account menu. `js/cropper.js`: the drag-and-zoom picture positioner for portraits, profile photos and campaign pictures.
- `js/catalog.js`: archetypes, knacks, weapons and gear from the corebook. `js/npcs.js`: enemy profiles. `js/house-rules.js`: the suggested house rules. `js/picker.js`: searchable dropdowns.
- `css/app.css`: shared styles. `css/home.css`: home and Settings extras.
- `firestore.rules`: who can read and write what. The page hides things people can't do, but these rules are what actually enforce it.

The Firebase web settings in `js/config.js` (API key, project ID and so on) are meant to be public; they only identify the project, and the rules decide what anyone can do.

Don't copy text from the corebook into the code; game text here is summarized in our own words.
