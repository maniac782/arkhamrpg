# Arkham Party Ledger

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

Open it. The top right should say **Live · synced for the party**. The first time it loads, it fills slot 1 with Wallace Morrow and leaves the other three slots blank.

## Good to know
- Anyone with the link can edit any sheet. There are no logins, so share the link only with the group.
- Firebase's free plan covers far more than a four-player table uses.
- **Download printable sheet** saves an HTML file. Open it and print on Letter paper with background graphics on.
- Knack names and tiers follow each archetype's table in the corebook. Write each knack's effect in from the book.
