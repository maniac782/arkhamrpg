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
- **Journal:** clues and handouts the GM has revealed, enemies the GM is showing, the campaign tracker (date, threads, people, places) and **Past sessions**: a recap of each finished session, with the GM's optional summary on top.
- **GM tab (GM only):** scene and turn tracker with surprise rounds, encounter builder from the corebook's enemy profiles, clues and handouts (to everyone or one player), campaign tracker, end-of-session XP and momentous sessions, session recaps, GM notes and a hidden dice roller.

### Your account
Click your icon at the top right for **Your account**, where you can upload a profile photo or pick a colour for your initial, and **Delete my account** (removes your username, profile and sign-in, deletes campaigns you own and takes you out of the rest).

Knack names and tiers follow each archetype's table in the corebook. Each knack's effect is a short summary of the book's rules in our own words, and can be edited on the sheet.

---

## For the site owner

### How it's hosted
- **Firebase Hosting** serves the site at arkhamrpg.web.app. **Firestore** holds the data, **Firebase Authentication** handles sign-in (Google and email/password), and **App Check** with reCAPTCHA Enterprise blocks bots. Everything runs on Firebase's free plan; there's no server code.
- **Every push to `main` deploys automatically** through `.github/workflows/deploy-firebase.yml`: the site goes to Firebase Hosting and `firestore.rules` is published. The GitHub secret `FIREBASE_SERVICE_ACCOUNT` holds a service account with the roles **Firebase Hosting Admin**, **API Keys Viewer**, **Firebase Rules Admin**, **Service Usage Consumer** and **Cloud Datastore Viewer**. If the rules job fails, the old rules stay in place.
- Pages and scripts are served with `Cache-Control: no-cache` (see `firebase.json`), so players get changes on their next reload.
- The version number (bumped with every change) is in each page's footer and at the bottom of the account menu.

### Admin page
`admin.html` lists every user and campaign with search and totals (users, active this week, campaigns, suspended). An admin can:
- **Suspend** an account: it can still sign in and look, but the database refuses every change it makes, and it's taken out of campaigns it joined. Campaigns it owns stay so their players keep their sheets. **Unsuspend** lifts it (they'll need new invites).
- **Change username**, for example to replace an offensive one.
- **Delete** any campaign, including its hidden GM material.

Admins are accounts with a document in the `admins` collection in Firestore whose ID is their user ID (Firebase → Authentication → Users → **User UID**); it needs no fields. Email addresses and disabling a sign-in entirely are handled in Firebase → Authentication.

### Bot protection (App Check)
The reCAPTCHA Enterprise site key is in `window.APP_CHECK_KEY` in `js/config.js`, and the web app is registered with it in Firebase → **Security → App Check**. Once **App Check → APIs** shows nearly all requests as verified, **Enforce** it for Cloud Firestore and Authentication. If pages stop loading data after enforcing, turn enforcement off there again. The key's allowed domains (Google Cloud → reCAPTCHA) must include every address the site is served from.

### Limits to keep an eye on
- The free plan allows about **50,000 database reads a day**. A busy game session with five people uses a few thousand, so it's roughly ten sessions on the same day. If the limit is hit, every page shows a banner saying saving and syncing pause until midnight Pacific; nothing is lost. Watch **Firestore → Usage**; if it gets close regularly, switching to pay-as-you-go costs pennies.
- reCAPTCHA Enterprise is free for 10,000 checks a month (about one per visitor per hour of use).

### Privacy
`privacy.html` is linked from every page's footer and the sign-in screen. Update its date and text whenever what the site stores changes. Things it currently covers: account and username, profile photo or colour, campaign data and pictures, invites by email, roughly when people last visited, Firebase/Google as the host, reCAPTCHA, and campaign art loaded from Wikimedia Commons.

### Campaign art
Campaigns without their own picture show public-domain horror art (sea monsters, Doré, Harry Clarke's Poe illustrations, 1928 *Weird Tales* covers, Böcklin, Redon and others) loaded from Wikimedia Commons; owners can pick one in Settings. The list is in `js/art.js`. Only add works that are out of copyright.

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
- `js/config.js`: Firebase settings, the App Check key and the daily-limit banner.
- `js/avatar.js`: the account icon and account menu. `js/art.js`: the campaign art gallery.
- `js/catalog.js`: archetypes, knacks, weapons and gear from the corebook. `js/npcs.js`: enemy profiles. `js/house-rules.js`: the suggested house rules. `js/picker.js`: searchable dropdowns.
- `css/app.css`: shared styles. `css/home.css`: home and Settings extras.
- `firestore.rules`: who can read and write what. The page hides things people can't do, but these rules are what actually enforce it.

The Firebase web settings in `js/config.js` (API key, project ID and so on) are meant to be public; they only identify the project, and the rules decide what anyone can do.

Don't copy text from the corebook into the code; game text here is summarized in our own words.
