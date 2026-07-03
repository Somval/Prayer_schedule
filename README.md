# 24-Hour Prayer Watch (React + Firebase)

Same design as before, now with a real backend that's easy to host: Firebase
handles the database and admin login, and the whole site deploys to Vercel or
Netlify for free with no server config.

## What's included
- `/` — public sign-up page (the dial + list), synced live via Firestore
- `/admin` — admin login (Firebase Authentication, email/password)
- `/admin/dashboard` — view every hour, release a taken slot, generate the
  schedule, export CSV

## 1. Create a Firebase project
1. Go to https://console.firebase.google.com and create a new project (free "Spark" plan is enough).
2. In the project, go to **Build → Firestore Database → Create database**. Start in **production mode**.
3. Go to **Build → Authentication → Get started → Sign-in method** and enable **Email/Password**.
4. Still in Authentication, go to the **Users** tab and **Add user** manually — this is your admin login (e.g. your own email + a password you choose). This project does not have a public admin sign-up form, since admins are added directly in Firebase.

## 2. Get your Firebase config
1. Project settings (gear icon) → scroll to **Your apps** → click the web icon (`</>`) to register a web app.
2. Copy the `firebaseConfig` object it gives you.
3. Paste those values into `src/firebase.js`, replacing the placeholders.

## 3. Set the Firestore security rules
1. Firestore Database → **Rules** tab.
2. Replace the contents with what's in `firestore.rules` in this project, then **Publish**.

This ruleset means:
- Anyone can read the schedule (no login needed to view it)
- Anyone can claim a hour that's currently open (flips `taken: false → true`)
- Only a signed-in admin can release a slot, regenerate the schedule, or delete anything

## 4. Install and run locally
```bash
npm install
npm run dev
```
Visit the local URL it prints (usually `http://localhost:5173`).

## 5. Generate the schedule
1. Go to `/admin`, log in with the user you created in Firebase.
2. Click **Generate schedule** and enter a start date/time (e.g. `2026-07-10 18:00`).
3. This creates 24 hourly Firestore documents. The public page updates instantly.

Re-running "Generate schedule" (labeled "Regenerate schedule" once slots exist)
overwrites all 24 slots and clears any sign-ups, so only do this before the
watch opens or when intentionally resetting it.

## 6. Deploy for free

**Vercel (recommended)**
1. Push this project to a GitHub repo.
2. Go to https://vercel.com → **New Project** → import the repo.
3. Framework preset: Vite. Build command `npm run build`, output directory `dist` (Vercel usually detects this automatically).
4. Deploy. You'll get a live URL like `prayer-watch.vercel.app`.

**Netlify**
1. `npm run build` locally — this creates a `dist` folder.
2. Go to https://app.netlify.com → drag and drop the `dist` folder onto the deploy area.
3. You'll get a live URL immediately. (Or connect your GitHub repo the same way as Vercel for automatic redeploys.)

Neither of these needs a hostname, database credentials, or a seed script
uploaded anywhere — all of that lives in Firebase now, and your `firebase.js`
config values are safe to ship in the frontend (Firebase's security model
relies on the Firestore rules above, not on hiding the config).

## Notes
- Only the first name of who signed up is shown publicly; full name, contact,
  and notes are visible only in the admin dashboard.
- To change slot length (e.g. 48 half-hour slots instead of 24 hourly ones),
  update the loop in `handleGenerateSchedule` inside `AdminDashboard.jsx`.
