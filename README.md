# FoodoraX — Turning Surplus into Smiles

FoodoraX is a MERN food-rescue app for sharing surplus food with nearby verified community partners. The application lives in `portfolio/frontend/` and `portfolio/backend/`.

## Project structure

```text
FoodoraX/
├── .gitignore
├── README.md
└── portfolio/
    ├── frontend/
    │   ├── index.html
    │   ├── package.json
    │   ├── vite.config.js
    │   └── src/
    │       ├── api.js
    │       ├── App.jsx
    │       ├── index.css
    │       └── main.jsx
    └── backend/
        ├── .env.example
        ├── package.json
        └── src/
            ├── config/db.js
            ├── middleware/auth.js
            ├── models/
            │   ├── User.js
            │   ├── Food.js
            │   └── Donation.js
            ├── routes/
            │   ├── auth.js
            │   ├── food.js
            │   ├── donations.js
            │   ├── users.js
            │   └── admin.js
            ├── scripts/seedAdmin.js
            ├── utils/http.js
            └── server.js
```

## Start from zero

Requirements: Node.js 20+ and MongoDB 6+ (local MongoDB or a MongoDB Atlas connection string). Set `JWT_SECRET` to a private random string with at least 32 characters; set your own `ADMIN_PASSWORD` (at least 12 characters) before seeding an admin.

1. Open two terminals in the project root.
2. Configure the backend in the first terminal:

   ```powershell
   cd portfolio\backend
   Copy-Item .env.example .env
   # Edit .env: set MONGO_URI and replace JWT_SECRET with a long random secret.
   npm install
   npm run dev
   ```

   The API listens on `http://localhost:5000`. Check `http://localhost:5000/api/health` for its health response. The backend exits with a clear error if MongoDB cannot be reached.

3. Configure the frontend in the second terminal:

   ```powershell
   cd portfolio\frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Optional: create `portfolio/frontend/.env` and set `VITE_API_URL` or `VITE_SOCKET_URL` to use different API/socket origins.

4. Create an administrator account in the backend terminal (or a third terminal):

   ```powershell
   cd portfolio\backend
   # Set ADMIN_EMAIL and ADMIN_PASSWORD in portfolio/backend/.env first.
   npm run seed:admin
   ```

   The seed command requires an admin password of at least 12 characters. It creates the account if it does not exist and safely updates the password if it is already an administrator.

## Demo walkthrough

1. Register a **donor** account and optionally use the location button to attach nearby coordinates.
2. Add a food listing with its pickup/expiry time, pickup address, image URL, and every safety check confirmed.
3. Register a separate **NGO / recipient** account. Its first login works immediately, but it cannot accept food until verified.
4. Sign in using the seeded admin credentials in another browser/incognito session. Open **NGO verification**, review the NGO, and verify it.
5. Sign back into the NGO account and open **Find food**. Available listings are ranked by distance, quantity fit, food-category preference, freshness deadline, and NGO priority. When a location is unavailable, the ranking still works with the remaining signals.
6. Accept a listing. The NGO gets a one-time six-digit pickup code; the donor can see it in the donation tracker.
7. The NGO starts pickup and enters the code provided by the donor. A correct code marks the donation delivered.
8. Both participants receive real-time Socket.io notifications. Admin analytics recalculate from saved MongoDB users, food listings, and completed donations.

## Main API

All endpoints are prefixed with `/api`. Authenticated routes accept `Authorization: Bearer <token>`.

| Method | Endpoint | Access / purpose |
|---|---|---|
| POST | `/auth/register` | Register as donor or NGO |
| POST | `/auth/login` | Log in |
| GET | `/auth/me` | Current account |
| PATCH | `/auth/me` | Update contact details, pickup location and NGO matching preferences |
| GET, POST | `/food` | Browse permitted listings / publish as donor |
| GET | `/food/recommendations` | NGO ranked match list with distance filters |
| POST | `/food/upload-image` | Upload a JPG, PNG or WebP food photo (maximum 5 MB) |
| GET | `/food/:id` | View a listing |
| PATCH | `/food/:id/status` | Donor cancels an unclaimed listing |
| POST | `/food/:id/accept` | Accept as a verified NGO; creates a pickup code |
| GET | `/donations` | Participant donation history |
| GET | `/donations/:id` | Participant donation detail |
| PATCH | `/donations/:id/status` | NGO starts pickup |
| PATCH | `/donations/:id/verify` | NGO submits donor’s pickup code; marks delivered |
| PATCH | `/donations/:id/pickup-time` | Donation participants reschedule an accepted pickup |
| GET | `/notifications` | View in-app notifications and unread count |
| PATCH | `/notifications/read-all`, `/notifications/:id/read` | Mark notifications as read |
| GET | `/reviews/donation/:id` | View participant reviews for a completed donation |
| POST | `/reviews/donation/:id` | Leave a one-time review after a completed donation |
| GET, POST | `/recurring` | View or create weekly/monthly donation reminders |
| PATCH | `/recurring/:id` | Pause or resume a donation reminder |
| GET | `/users` | Admin user management list |
| GET | `/users/:id/profile` | View a community member’s public profile and ratings |
| GET | `/admin/users`, `/admin/ngos` | Admin account and verification lists |
| PATCH | `/admin/users/:id/status` | Admin activates or deactivates a member |
| PATCH | `/admin/ngos/:id/verify` | Verify an NGO and notify it |
| PATCH | `/admin/food/:id/status` | Admin cancels an active listing |
| GET | `/admin/analytics` | Counts and delivered food quantity |
| GET | `/admin/analytics/monthly` | Delivered donation totals by month |
| GET | `/admin/reports/:type.csv` | Export food, donation or audit CSV data |
| GET | `/admin/audit` | View recorded administrator actions |
| GET | `/health` | API health check |

## Implementation notes

- Passwords are bcrypt-hashed. JWT-protected endpoints enforce roles; public NGO signup cannot create an admin.
- Pickup codes are generated with a cryptographically secure random generator and are not exposed to the recipient through donation-history reads.
- Food safety confirmations, pickup times, expiry times, role permissions, and request data are validated by the API.
- Real-time `notification` events are sent to both donation participants; `food:updated` signals listing changes. Socket connections require the same JWT.
- Notifications are stored in MongoDB and visible in the notification center. Optional email delivery uses SMTP; configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` in `portfolio/backend/.env`. Without SMTP values, in-app notifications continue to work.
- Coordinates use GeoJSON `[longitude, latitude]`. Location is opt-in and can be refreshed from the profile or nearby-food page; distance matching uses the Haversine formula and supports 10, 25, 50, 100 km or any-distance browsing. NGO preferences, quantity needs and admin-assigned priority are included in the match score. Listing directions open OpenStreetMap, without a paid map key.
- Food photos can be uploaded to `portfolio/backend/uploads/` (JPG, PNG, WebP, 5 MB maximum). Keep this directory on persistent storage when deploying the backend; uploads are intentionally git-ignored.
- Completed donations support one review per participant. Accepted pickups can be rescheduled by either participant. Admin actions are recorded in the audit log and can be exported.
- Weekly/monthly recurring donation schedules send reminders to confirm food safety and create a fresh listing; they do not auto-publish food. Expiry reminders are checked every 30 minutes for listed food expiring within 24 hours.
- The frontend includes installable PWA metadata and an offline shell cache. API/private data is never cached offline. Use the workspace language switch for Hindi/English labels; translations are progressively applied.
- Environmental estimates are transparent demo estimates: 0.5 kg saved per delivered food quantity unit, with each delivered unit counted as one meal/person supported. They are not third-party audited metrics.
- The homepage impact counters and testimonial are illustrative demo content; admin dashboard counts are calculated from the connected MongoDB data.
- Images may use a public URL or local upload; local image files are served by the backend.

## Troubleshooting

- **MongoDB connection error:** ensure MongoDB is running or `MONGO_URI` is a reachable Atlas URI; check the Atlas network allowlist if applicable.
- **NGO cannot accept food:** log in as an admin and verify the NGO first.
- **Nearby distance is missing:** allow browser location access during registration; without coordinates, recommendations remain ranked using quantity, deadline, category and partner priority.
- **Frontend cannot reach the API:** confirm the backend health URL and set `VITE_API_URL` / `VITE_SOCKET_URL` in `portfolio/frontend/.env` if using non-default ports or hosts.
