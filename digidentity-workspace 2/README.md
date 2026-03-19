# Digidentity — Workspace Booking

A single-file room booking application built for **Digidentity HQ, Floor 15, Waldorpstraat 17P, Den Haag**. No framework, no build step, no dependencies. Open `index.html` in any browser and it works.

Supports a shared live database via [Supabase](https://supabase.com) (free) so every employee sees real-time availability.

---

## Contents of This Folder

```
digidentity-workspace/
├── index.html   ← The entire application (open this in your browser)
└── README.md    ← This file
```

---

## Table of Contents

1. [What the App Does](#what-the-app-does)
2. [Quick Start](#quick-start)
3. [Setting Up the Database](#setting-up-the-database)
4. [Deploying for Your Team](#deploying-for-your-team)
5. [Changing the Admin Password](#changing-the-admin-password)
6. [Adding, Editing, or Removing Rooms](#adding-editing-or-removing-rooms)
7. [Changing Available Time Slots](#changing-available-time-slots)
8. [Admin Dashboard Guide](#admin-dashboard-guide)
9. [Feature Reference](#feature-reference)
10. [Troubleshooting](#troubleshooting)
11. [Architecture Overview](#architecture-overview)
12. [Local vs Live Mode](#local-vs-live-mode)
13. [Restricting Access](#restricting-access)

---

## What the App Does

Digidentity Workspace Booking is a room reservation system for the Den Haag office. Employees can browse all 12 rooms on Floor 15, check live availability, and book hourly time slots for any date.

### Employee Features

| Feature | Description |
|---|---|
| Browse rooms | See all 12 rooms with type, amenities, capacity, and today's availability |
| Real-time availability | Each room shows a live green/red availability indicator based on the database |
| Book a room | Select a room, choose a date, enter your name and purpose, pick time slots |
| Multi-slot booking | Select multiple hourly slots in one booking (e.g. 10:00 → 13:00) |
| Conflict detection | The app re-checks the database at the moment of booking to prevent double-bookings |
| My Bookings tab | View all reservations, filter by name, upcoming/past status; cancel any booking |

### Admin Features (password required)

| Feature | Description |
|---|---|
| Admin login | Password-protected dashboard |
| All Reservations | Full table of every booking — search, filter by date/room, delete individual entries |
| Room Overview | Utilisation bar per room showing today's booking density (green → amber → red) |
| Export Data | Download all reservations as CSV (Excel-compatible) or JSON |
| Clear All | Wipe the entire database with a confirmation prompt |
| Settings | Switch database mode, view current connection status |

---

## Quick Start

### Option A — Local only (no setup needed)

1. Open `index.html` in your browser (double-click it, or open via `File → Open`)
2. When the setup screen appears, click **"Continue in local mode"**
3. The app works immediately — reservations are saved in your browser's `localStorage`

> ⚠️ In local mode, each browser has its own isolated data. Bookings made on your laptop won't appear on a colleague's computer. Use Option B for shared team use.

### Option B — Shared live database (recommended for teams)

Follow the [Supabase setup](#setting-up-the-database) below, then deploy `index.html` anywhere accessible to your team (Netlify, your intranet, a web server, etc.).

---

## Setting Up the Database

Supabase is a free PostgreSQL-as-a-service platform. Setup takes about 3 minutes and requires no backend code.

### Step 1 — Create a Supabase account

Go to [supabase.com](https://supabase.com) and sign up. The free tier is sufficient for this app.

### Step 2 — Create a new project

- Click **New Project**
- Name it something like `digidentity-rooms`
- Choose a strong database password and store it safely
- Select the EU West region (closest to Den Haag)
- Wait ~60 seconds for the project to provision

### Step 3 — Create the reservations table

1. In your Supabase project, go to **SQL Editor → New Query**
2. Paste the following SQL and click **Run**:

```sql
CREATE TABLE reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  room_icon TEXT DEFAULT '🏢',
  name TEXT NOT NULL,
  date DATE NOT NULL,
  slot TEXT NOT NULL,
  purpose TEXT DEFAULT 'Meeting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read"
  ON reservations FOR SELECT USING (true);

CREATE POLICY "public_insert"
  ON reservations FOR INSERT WITH CHECK (true);

CREATE POLICY "public_delete"
  ON reservations FOR DELETE USING (true);
```

### Step 4 — Copy your credentials

1. Go to **Settings → API** in your Supabase project
2. Copy the **Project URL** (e.g. `https://abcxyz.supabase.co`)
3. Copy the **anon public** key (the long `eyJ…` string under "Project API Keys")

### Step 5 — Connect the app

When you open `index.html` for the first time the setup screen appears. Enter your Project URL and anon key and click **Connect to Supabase**. The credentials are saved in `localStorage` — you only need to do this once per browser.

**Hardcoding credentials for team deployment:** If you want everyone to use the same database without going through setup, open `index.html` in a text editor, find the `init()` function near the bottom of the `<script>` block, and add these three lines at the very top of the function:

```javascript
SB_URL = 'https://your-project.supabase.co';
SB_KEY = 'your-anon-key-here';
isLive = true;
```

Then also delete the `if (!SB_URL && !skipped)` block below so the setup screen is never shown.

---

## Deploying for Your Team

### Netlify (free, 60-second setup)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop `index.html` onto the page
3. You get a live URL immediately (e.g. `https://digidentity-rooms.netlify.app`)
4. Optional: go to Site Settings → rename the site and add your own domain

### GitHub Pages (free)

1. Create a GitHub repository
2. Push `index.html` (rename to `index.html` if needed)
3. Go to **Settings → Pages** → set source to `main` branch, root folder
4. Live at `https://yourusername.github.io/repo-name`

### Internal web server

Upload `index.html` to any Apache, Nginx, or IIS server directory. Rename to `index.html` if hosting at a root URL.

### Intranet / file share

Employees can open `index.html` directly from a shared network drive via `file://` — useful for fully offline local mode. For shared database use, it must be served over HTTP/HTTPS.

---

## Changing the Admin Password

Open `index.html` in any text editor and find the `CONFIG` block near the top of the `<script>` tag:

```javascript
const CONFIG = {
  // Change this password — it is stored in plain text in this file
  ADMIN_PASSWORD: 'admin123',
  ...
```

Change `'admin123'` to your new password and save the file. The change takes effect immediately.

> The password is stored in plain text inside the HTML file. This is appropriate for an internal tool on a trusted network. Do not reuse a password from another service. For production-grade authentication, consider connecting Supabase Auth.

---

## Adding, Editing, or Removing Rooms

Find the `ROOMS` array inside the `CONFIG` block in the `<script>` tag:

```javascript
ROOMS: [
  { id:'r01', name:'Binnenhof Suite', type:'Boardroom', icon:'🏛', cap:16, color:'#0D2B0D', tags:['4K Display','Video Conf','Coffee Bar'], floor:'Floor 15' },
  ...
]
```

### Adding a room

Copy any existing room object, add it to the array, and give it a **unique `id`**:

```javascript
{ id:'r13', name:'Laan van NOI', type:'Meeting Room', icon:'🌳', cap:8, color:'#166534', tags:['Projector','Coffee'], floor:'Floor 14' },
```

### Removing a room

Delete the entire `{ ... }` object from the array. Existing reservations for that room remain in the database but will not appear in the UI.

### Editing a room

Change any field. Field reference:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique key. **Never change** after bookings exist for this room. |
| `name` | string | Display name shown on the card |
| `type` | string | Category shown in small caps (e.g. `'Boardroom'`, `'Focus Room'`) |
| `icon` | emoji | Single emoji shown on the card thumbnail |
| `cap` | number | Maximum capacity |
| `color` | hex string | Background tint for the room card thumbnail |
| `tags` | string[] | Amenity tags shown as pills (keep to 2–3 for clean layout) |
| `floor` | string | Floor/location label shown on the card |

---

## Changing Available Time Slots

Find the `TIME_SLOTS` array in `CONFIG`:

```javascript
TIME_SLOTS: [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00'
],
```

- Time strings must be in `HH:MM` 24-hour format
- Keep them in ascending order
- Add or remove entries freely

**Example — core office hours only (9am to 5pm):**
```javascript
TIME_SLOTS: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'],
```

---

## Admin Dashboard Guide

Click **Admin** in the top-right header and enter the password. Default: `admin123`.

### All Reservations

Full table of every booking across all rooms and dates.

- **Search:** Live filter by employee name or room name
- **Date filter:** All / Today / Upcoming / Past
- **Room filter:** All rooms or a specific room
- **Delete button:** Removes a single booking after confirmation
- **Refresh button:** Re-fetches latest data from the database

### Room Overview

Grid showing all 12 rooms with:
- All-time total bookings
- Today's booking count vs. total available slots
- Utilisation bar — green (low) → amber (medium) → red (high)

### Export Data

- **CSV:** Downloads a `.csv` file compatible with Excel and Google Sheets. Columns: ID, Room, Employee, Date, Time Slot, End Time, Purpose, Created At
- **JSON:** Downloads raw JSON for import into other systems

### Settings

- **Change Database:** Opens the DB Setup screen to reconnect or switch between Supabase and local mode
- **Clear All Reservations:** Deletes every record from the database permanently after a confirmation dialog

---

## Feature Reference

### Database indicator (top-right header)

| Pill | Meaning |
|---|---|
| 🟢 live | Connected to Supabase. All users share data in real-time. |
| 🟡 local | Using browser `localStorage`. Data is private to this browser. |
| ⬤ connecting | App is testing the database connection on startup. |

### Slot states (booking panel)

| Style | Meaning |
|---|---|
| Default grey | Available to book |
| Green fill | Selected by you in this session |
| Red / italic | Already booked. Hover to see who booked it. |
| Animated pulse | Slots are loading from the database |

### Conflict detection

At the moment you click **Confirm Booking**, the app queries the database one final time before writing. If someone else booked the same slot in the meantime, you will see an error and the slot will update to show as taken — no double-bookings are possible.

---

## Troubleshooting

**"Connection failed — check your URL and key"**
- Ensure the Project URL starts with `https://` and has no trailing slash
- Ensure you are using the **anon public** key, not the `service_role` key
- Verify you ran the full SQL from Step 3 — missing RLS policies cause silent failures

**Slots not updating after a colleague books**
The app fetches fresh slot data every time you open a booking panel or change the date. Click away and re-open the room to force a refresh. The admin dashboard has a manual **Refresh** button.

**"Booking failed" or "Delete failed"**
The most common cause is missing Row Level Security policies. In Supabase SQL Editor, re-run just the three `CREATE POLICY` lines from Step 3.

**Setup screen keeps appearing on every load**
This happens when `localStorage` is blocked — common in private/incognito windows or certain corporate browser policies. Use a normal browser window, or hardcode the credentials directly in the HTML as described in the [Deploying](#deploying-for-your-team) section.

**I need to re-enter my database credentials**
Open DevTools (`F12`), go to **Application → Local Storage**, and delete the keys `digi_sb_url` and `digi_sb_key`. Reload the page and the setup screen will appear again.

**The app is slow to load slots**
Each time you open a booking panel the app makes a targeted database query for that room and date. On the Supabase free tier this is typically under 200ms. If it feels slow, check your internet connection or switch to local mode for testing.

---

## Architecture Overview

```
digidentity-workspace/
└── index.html
    ├── CONFIG block           ← All customisation lives here
    │   ├── ADMIN_PASSWORD
    │   ├── TIME_SLOTS
    │   └── ROOMS[]
    │
    ├── DB Layer               ← Pure fetch(), no SDK
    │   ├── dbFetch()          → GET  /rest/v1/reservations
    │   ├── dbFetchSlots()     → GET  /rest/v1/reservations?room_id=&date=
    │   ├── dbInsert()         → POST /rest/v1/reservations
    │   ├── dbDelete()         → DELETE /rest/v1/reservations?id=
    │   └── dbDeleteAll()      → DELETE /rest/v1/reservations?created_at=gte.2000
    │       └── local fallback → browser localStorage (key: digi_res)
    │
    ├── UI Layer
    │   ├── Rooms view         ← Grid of room cards, booking panel
    │   ├── My Bookings view   ← Filterable list, cancel action
    │   ├── Admin view         ← Stats, table, room overview, export, settings
    │   └── Setup view         ← Credential entry, SQL guide
    │
    └── Supabase (free tier)
        └── reservations table
            id · room_id · room_name · room_icon · name · date · slot · purpose · created_at
```

No framework. No build tools. No npm. One file, vanilla JavaScript, direct Supabase REST API.

---

## Local vs Live Mode

| | Local Mode | Live (Supabase) |
|---|---|---|
| Setup time | None | ~3 minutes |
| Data shared across users | No | Yes |
| Data persists if browser is cleared | No | Yes |
| Works offline | Yes | No |
| Cost | Free | Free (Supabase free tier) |
| Best for | Testing, demos, single user | Team / office use |

---

## Restricting Access

By default any user who can open the app can read, create, and cancel reservations. This is appropriate for a trusted internal tool.

**To prevent anonymous users from deleting reservations** (only admin UI can delete):

Run this in Supabase SQL Editor:

```sql
DROP POLICY "public_delete" ON reservations;
```

Note: the admin dashboard in the app calls the same public REST API, so it would also lose delete access unless you add proper Supabase Auth with a service-role header for admin operations. Ask your developer or Claude to extend the app with Supabase Auth if you need this.

**To make the app read-only** (no new bookings — useful during maintenance):

```sql
DROP POLICY "public_insert" ON reservations;
```

Re-create the policy when you want to re-enable bookings.

---

*Digidentity Workspace Booking · Waldorpstraat 17P, Den Haag · Built with vanilla JS + Supabase*
