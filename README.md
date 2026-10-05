# Arkham RPG Player Ledger

Live character sheets for our Arkham Horror RPG group, plus a character creator and printable sheets. Hosted free on GitHub Pages, with Firebase keeping everyone's sheets in sync.

## How the site is laid out
- **`index.html`** (arkhamrpg.web.app): sign in, pick a username, and see the campaigns you own or belong to. Owners create campaigns, invite players (invite link or email address), pick the GM, and set house rules on each campaign's **Settings** page.
- **`play.html?c=<campaign>`**: the ledger for one campaign: party, investigator sheets, creator, Journal and GM tools. Investigators belong to the player who made or claimed them; the owner can edit and assign any sheet (or untick **Let me edit every investigator** in the campaign's Settings to lock other players' investigators to them); only the GM sees the GM tab.
- **`old/`** (arkhamrpg.web.app/old): the original single-party ledger with passcodes, master key and GM PIN, kept unchanged for reference. Its data is separate from the campaigns.
- **`beta/`** just forwards old links (including invite links) to the main site.

### Where the code lives
- `css/app.css`: styles shared by every page. `css/home.css`: extras for the home and Settings pages.
- `js/config.js`: the Firebase settings (`window.FIREBASE_CONFIG`).
- `js/home.js`: the home page: sign-in, usernames, My campaigns, invites and campaign Settings (including house rules).
- `js/ledger/`: the ledger behind `play.html`, loaded in order:
  1. `1-state.js`: campaign, roles, saving and the local cache
  2. `2-rules.js`: game rules (dice pools, XP costs, gear)
  3. `3-render.js`: drawing the party, sheets and Journal
  4. `4-creator.js`: the New investigator creator
  5. `5-events.js`: buttons and form edits
  6. `6-gm.js`: GM tools, activity log and session recap
  7. `7-boot.js`: connecting to Firebase and starting up
- `js/catalog.js`: archetypes, knacks, weapons and gear from the corebook. `js/npcs.js`: enemy profiles. `js/house-rules.js`: the built-in house-rule presets. `js/picker.js`: the searchable dropdowns.

## One-time setup (about 10 minutes)

### 1. Create the Firebase database
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. **Add project** → name it something like `arkham-ledger` → you can turn off Google Analytics → **Create project**.
3. In the left menu, open **Build → Firestore Database** → **Create database**.
   - Location: pick one near you (e.g. `nam5 (United States)`).
   - Start in **production mode**.
4. Open the **Rules** tab, delete what's there, paste in everything from `firestore.rules` in this repo, and click **Publish**. (After the GitHub deploy below is set up, rules publish themselves on every push. See "Automatic rules publishing".)

### 2. Get the settings for the website
1. Click the gear icon next to **Project Overview** → **Project settings**.
2. Under **Your apps**, click the web icon `</>`. Give it a nickname (e.g. `ledger`). Leave "Firebase Hosting" unchecked. **Register app**.
3. Firebase shows a `firebaseConfig` block. Copy these four values into the `window.FIREBASE_CONFIG` block in `js/config.js`:
   - `apiKey`, `authDomain`, `projectId`, `appId`

These values are safe to have in a public repo. They only identify the project; the rules from step 1 decide what anyone can do.

### 3. Turn on GitHub Pages
1. Push `index.html`, `firestore.rules` and this README to the repo.
2. On GitHub: **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → **Save**.
3. After a minute, the site is at `https://<your-username>.github.io/<repo-name>/`.

### 4. Turn on passcodes
1. In Firebase, open **Security → Authentication** → **Get started** → **Sign-in method** → **Anonymous** → turn it on → **Save**. This gives each device an ID with no account needed.
2. Set your master key: open **Databases & Storage → Firestore** → **Data** → **Start collection**. Collection ID: `locks`. Document ID: `master`. Add a field named `code`, type **string**, with your master key as the value. **Save**.

To change the master key later, edit that `code` field. Every device using the old key loses master access.

Open the site. The top right should say **Live · synced for the party**. The first time it loads, it fills slot 1 with Wallace Morrow and leaves the other three slots blank.

## Hosting on arkhamrpg.web.app (optional)
The repo also deploys to Firebase Hosting through `.github/workflows/deploy-firebase.yml` on every push to `main`. It needs:
1. A Hosting site named `arkhamrpg` in the Firebase project (Hosting → Add another site).
2. A GitHub secret named `FIREBASE_SERVICE_ACCOUNT` holding a service account key with the **Firebase Hosting Admin** and **API Keys Viewer** roles.

Until the secret exists, that workflow fails harmlessly and GitHub Pages keeps working.

## Beta: accounts and campaigns
`beta/` (arkhamrpg.web.app/beta) is a test version with real accounts (Google or email) and campaigns you own or belong to. It needs **Google** and **Email/Password** turned on in Firebase → Authentication → Sign-in method, with `arkhamrpg.web.app` in Authorized domains. It uses its own sign-in, separate from the main site's anonymous device sign-in, so it doesn't affect the main site. Owners invite players with a shareable **invite link** (Make a new link turns the old one off) or by **email address**: the invite waits for whoever signs in with that email. Nothing is emailed automatically. **Open the ledger** on a campaign page runs the full ledger for that campaign (`/?c=<campaign id>`): each investigator belongs to the player who made or claimed it, the owner can edit and assign any sheet and controls house rules, and whoever the owner makes GM gets the GM tab. No passcodes, master key or GM PIN in campaigns.

## Automatic rules publishing
Every push to `main` deploys the site and also publishes `firestore.rules` (the **rules** job in `.github/workflows/deploy-firebase.yml`). The GitHub service account needs three roles in Google Cloud → IAM: **Firebase Rules Admin**, **Service Usage Consumer** and **Cloud Datastore Viewer**.

## Managing users (admin page)
`admin.html` (arkhamrpg.web.app/admin.html) lists every user and campaign with search, and lets a site admin:
- **Suspend** an account: it can still sign in and look, but the database refuses every change it tries to make, and it's taken out of the campaigns it joined. Campaigns it owns stay so their players keep their sheets. **Unsuspend** lifts it (they'll need new invites).
- **Change username**, for example to replace an offensive one.
- **Delete** any campaign, including its hidden GM material.

To make yourself an admin (one time): sign in on the site, then in Firebase → **Firestore** → **Data**, start a collection named `admins` and add a document whose ID is your user ID (find it in Firebase → **Authentication** → **Users**, the **User UID** column), with no fields. An **Admin** link then appears next to your name. Emails and sign-in accounts themselves are managed in Firebase → Authentication, which can also disable an account entirely.

Players can delete their own account from the account page (click your name at the top). It removes their username, profile and sign-in, deletes campaigns they own and takes them out of the rest.

## Bot protection (App Check)
App Check makes Firebase refuse requests that don't come from the real site, which stops scripts and bots from creating accounts or writing to the database directly. It uses invisible reCAPTCHA Enterprise; players never see a puzzle. The free allowance is 10,000 checks a month, and each visitor uses about one check per hour of use.
1. In Google Cloud (same project), open **Security → reCAPTCHA** (it may ask you to enable the API) → **Create key** → type **Website**, domains `arkhamrpg.web.app`, `arkham-ledger.web.app`, `arkham-ledger.firebaseapp.com` and `localhost` → leave the checkbox challenge off → **Create**. Copy the key ID.
2. Paste it into `window.APP_CHECK_KEY` in `js/config.js` and push.
3. In Firebase → **Security → App Check → Apps**, register the web app with **reCAPTCHA Enterprise** and the same key.
4. Leave enforcement off for a day or two and watch **App Check → APIs**: almost all requests should show as verified. Then press **Enforce** for **Cloud Firestore** and **Authentication**.

If a page ever stops loading data after enforcing, turn enforcement off again in the same place.

## Privacy policy
`privacy.html` explains what the site stores and who can see it. Every page links to it in the footer. Update the date and text there if what the site stores changes.

## Adding and removing investigators
- **+ Add an investigator** on the Party tab adds a blank sheet (up to 12). The **New investigator** tab can also put a finished character into **a new spot in the party**.
- Only the master key can remove an investigator: open their sheet and use **Remove this investigator from the party…** at the bottom.
- This needs the current `firestore.rules`, which the deploy publishes automatically.

## Game master tools
The GM has their own **GM PIN**, separate from the master key:
- At the top of the **GM** tab, the GM chooses a PIN and presses **Set GM PIN**, just like locking a sheet. After that, only devices that enter that PIN can run the **GM** tab.
- The GM PIN can also award XP, start sessions and refill pools on locked sheets, but it can't make any other changes to them.
- The master key still does everything it did before (edit every sheet, house rules, remove investigators, reset passcodes). It can **view** the GM tab, including hidden enemies, clues and GM notes, but can't change anything there. If the GM forgets their PIN, the master key can **Reset GM PIN** so they can choose a new one.

The GM tab has:
- **Scene and turn tracker.** Name the scene, start a fight (with an optional surprise round), and step through the investigators' and adversaries' turns. Every player sees the current scene, round and whose turn it is at the top of their sheet. Pools refill automatically at the start of each side's turn.
- **Encounter builder.** Add enemies from the corebook's Chapter 8 profiles (or a custom enemy), optionally scaled up for the party size, then track each one's dice pool, injuries, traumas and strain. The pool sizes are suggestions, because the book prints them in the profile art. Choose **Show to players** to put an enemy on the Journal tab.
- **Handouts and clues.** Write a clue, attach an image, and reveal it to everyone or to one player. A clue for one player only stays private if that player's sheet has a passcode.
- **Campaign tracker.** The in-game date, open threads, NPCs and locations. Players see it on the Journal tab.
- **End of session.** Award XP to everyone at once and mark the session as momentous, which lets each player buy Insight. It also moves the session counter on.
- **Recent activity.** A log of what the GM did: scenes, fights and rounds, enemies added, hurt or taken down, clues revealed, XP awarded. Only the GM and the master key can see it.
- **Session recap.** Builds a summary of any session from everyone's activity. It opens with **The story**: the scenes, fights, enemies the players saw and clues revealed to everyone, so nothing hidden leaks. The GM can add an optional written summary to any session. Once a session is over (the GM has started the next one), players can read its recap, with the summary on top, under **Past sessions** on the Journal tab.
- **GM notes and hidden roller.** Private notes and a dice roller only the GM sees.

These need the current `firestore.rules`, which the deploy publishes automatically.

## House rules
In a campaign (beta), the owner edits house rules on the campaign's **Settings** page: custom weapons, equipment, Universal ammo, and an on/off switch. On the original site, extra weapons, gear and rule changes live in `js/house-rules.js`. Edit that list for your own group. A **Universal ammo** rule (any gun can use any gun's extra reloads) is included but commented out; remove the `//` in front of it to offer it. They stay hidden until someone with the master key turns them on in the Game Master section of the Party tab. The switch is shared with the whole party.

## Good to know
- Anyone with the link can view every sheet. A player can lock their own sheet with a passcode at the top of it; after that, only devices that entered the passcode (or the master key on the Party tab) can edit it. Firebase enforces this, not just the page.
- Unlocking is remembered on that device and browser. **Lock this device** makes it ask again.
- If a player forgets their passcode, use the master key to open their sheet and set a new one or remove it.
- Firebase's free plan covers far more than a four-player table uses.
- **Open printable sheet** opens the sheet in a new tab. Print it on Letter paper with background graphics on.
- Knack names and tiers follow each archetype's table in the corebook. Each knack's effect is filled in as a short summary of the book's rules; you can edit it on the sheet.
