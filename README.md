# Arkham RPG Player Ledger

Live character sheets for our Arkham Horror RPG group, plus a character creator and printable sheets. Hosted free on GitHub Pages, with Firebase keeping everyone's sheets in sync.

## One-time setup (about 10 minutes)

### 1. Create the Firebase database
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. **Add project** → name it something like `arkham-ledger` → you can turn off Google Analytics → **Create project**.
3. In the left menu, open **Build → Firestore Database** → **Create database**.
   - Location: pick one near you (e.g. `nam5 (United States)`).
   - Start in **production mode**.
4. Open the **Rules** tab, delete what's there, paste in everything from `firestore.rules` in this repo, and click **Publish**.

### 2. Get the settings for the website
1. Click the gear icon next to **Project Overview** → **Project settings**.
2. Under **Your apps**, click the web icon `</>`. Give it a nickname (e.g. `ledger`). Leave "Firebase Hosting" unchecked. **Register app**.
3. Firebase shows a `firebaseConfig` block. Copy these four values into the `window.FIREBASE_CONFIG` block near the top of `index.html`:
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

## Adding and removing investigators
- **+ Add an investigator** on the Party tab adds a blank sheet (up to 12). The **New investigator** tab can also put a finished character into **a new spot in the party**.
- Only the master key can remove an investigator: open their sheet and use **Remove this investigator from the party…** at the bottom.
- This needs the current `firestore.rules`. If you set the site up before this was added, paste the new rules into Firebase → Firestore → Rules, press **Publish**, then reload the site.

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
- **Session recap.** Builds a summary of any session from everyone's activity.
- **GM notes and hidden roller.** Private notes and a dice roller only the GM sees.

These need the current `firestore.rules` (paste into Firebase → Firestore → Rules, **Publish**, reload).

## House rules
Extra weapons, gear and rule changes live in the `window.HOUSE_RULES` block near the top of `index.html`. Edit that list for your own group. A **Universal ammo** rule (any gun can use any gun's extra reloads) is included but commented out; remove the `//` in front of it to offer it. They stay hidden until someone with the master key turns them on in the Game master section of the Party tab. The switch is shared with the whole party.

## Good to know
- Anyone with the link can view every sheet. A player can lock their own sheet with a passcode at the top of it; after that, only devices that entered the passcode (or the master key on the Party tab) can edit it. Firebase enforces this, not just the page.
- Unlocking is remembered on that device and browser. **Lock this device** makes it ask again.
- If a player forgets their passcode, use the master key to open their sheet and set a new one or remove it.
- Firebase's free plan covers far more than a four-player table uses.
- **Open printable sheet** opens the sheet in a new tab. Print it on Letter paper with background graphics on.
- Knack names and tiers follow each archetype's table in the corebook. Each knack's effect is filled in as a short summary of the book's rules; you can edit it on the sheet.
