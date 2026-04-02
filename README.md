# Bajaj Vehicle Service Center Management System

Full-stack service center app: **React (Vite)** + **Node.js (Express)** + **MySQL**, with JWT auth, service records, automatic next due dates, and reminders.

## Prerequisites

- Node.js 18+
- MySQL 8.x (or compatible)

## 1. Database setup

1. Start MySQL and create a user with permission to create databases (or use `root`).
2. Copy environment file for the backend:

   ```bash
   cd backend
   copy .env.example .env
   ```

   On macOS/Linux use `cp .env.example .env`.

3. Edit `backend/.env` with your MySQL credentials and a strong `JWT_SECRET`.

4. Run the schema + seed (creates tables and demo admin):

   ```bash
   npm install
   npm run seed
   ```

   Demo login: **admin** / **admin123**

## 2. Backend API

```bash
cd backend
npm run dev
```

API defaults to **http://localhost:5000** (see `PORT` in `.env`).

## 3. Frontend

```bash
cd frontend
npm install
```

If `npm install` fails with `EBUSY`, `TAR_ENTRY_ERROR`, or partial `node_modules`, delete the `frontend/node_modules` folder and run `npm install` again (avoid running multiple installs at the same time).

Optional: copy `frontend/.env.example` to `frontend/.env` if you need to point the app at a different API URL in production.

```bash
npm run dev
```

Open **http://localhost:5173**. In development, Vite proxies `/api` to `http://localhost:5000`.

## Project layout

- `backend/` — Express + mysql2 + JWT + bcrypt
- `frontend/` — React + Vite + Tailwind CSS + react-hot-toast + html2pdf.js

## API summary (all protected except login)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/dashboard/stats` | Stats + recent services + upcoming reminders |
| GET/POST | `/api/vehicles` | List/search vehicles; create vehicle |
| GET | `/api/vehicles/:vehicleNumber` | Lookup by vehicle number |
| PUT | `/api/vehicles/:id/avg-km` | Update average daily KM |
| POST | `/api/services` | Create service (computes next due date + reminder) |
| GET | `/api/services/:vehicleId` | Service history for a vehicle |
| GET | `/api/reminders?filter=all\|week\|overdue` | Pending reminders |
| PUT | `/api/reminders/:id/dismiss` | Dismiss reminder |

## Production build

```bash
cd frontend
npm run build
```

Serve the `frontend/dist` folder with any static host and set `VITE_API_URL` to your API base URL (e.g. `https://api.example.com`).
