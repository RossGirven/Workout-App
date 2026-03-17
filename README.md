# Workout Tracker with cloud sync

This version keeps your training plan and routines, still works offline with local cache, and can sync across devices with Supabase.

## Why this version fixes the data-loss problem

Local browser storage is fine until you switch devices or clear browser data like a man tidying a shed with a flamethrower. To keep data between devices and survive browser clearing, the app now supports:

- local cache for fast/offline use
- cloud sync via Supabase
- email magic-link sign in so the same account can be loaded on iPhone and Mac
- JSON import/export as a belt-and-braces backup

## Important truth

Cross-device persistence requires a real backend and a real account. If you clear browser data and never sign in again, the browser cannot magically remember who you were.

## Setup

### 1. Create a Supabase project

Create a project in Supabase.

### 2. Run the SQL

Open the SQL editor in Supabase and run `supabase-setup.sql`.

This creates a `workout_app_state` table with Row Level Security policies so each signed-in user can only access their own data.

### 3. Enable email sign-in

In Supabase Auth, enable email sign-in / magic links.

### 4. Add your project keys

Copy `config.example.js` to `config.js` and replace the placeholders:

```js
window.WORKOUT_APP_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

Use the **anon/public** key only. Never put the service role key in a browser app unless you fancy donating all your data to the internet.

### 5. Add your site URL to Supabase

In Supabase Auth URL settings:
- set the Site URL to your GitHub Pages URL
- add your GitHub Pages URL as a redirect URL too

For example:
- `https://yourname.github.io/workout-tracker/`

### 6. Host on GitHub Pages

Upload the whole folder to a GitHub repo and publish it with GitHub Pages.

## How to use it

1. Open the app.
2. Enter your email in the **Cloud backup and sync** card.
3. Tap **Email me a magic link**.
4. Open the link from your email on the device you want to use.
5. The app signs you in and can then load and save your tracker data to the cloud.
6. On another device, repeat the sign-in with the same email, then tap **Load cloud copy** if needed.

## Notes

- Local changes save instantly in the browser first.
- Cloud sync happens automatically after edits when you are signed in.
- `Sync now` forces an immediate upload.
- `Load cloud copy` pulls the latest cloud state down to the current device.
- `Export JSON` is still useful as an extra backup.

## Files

- `index.html` - app shell
- `styles.css` - styling
- `app.js` - app logic + Supabase auth/sync
- `config.js` - your live Supabase keys
- `config.example.js` - template config
- `supabase-setup.sql` - database table + policies
- `service-worker.js` - PWA caching
- `manifest.json` - app manifest
