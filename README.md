# Rental Management & Invoice Automation System

Full-stack MERN starter for rental agreement tracking, invoice lifecycle, and renewal monitoring.

## Project structure

```text
Rental/
├── client/           # Frontend (React + Vite + Tailwind)
├── backend/          # Backend (Express + MongoDB + JWT)
└── package.json      # Root scripts to run both
```

## Setup

1) Install dependencies

```bash
npm install
npm run install:all
```

2) Update environment values

- Edit `backend/.env`
- Replace at least:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`

3) Start MongoDB

- Local MongoDB must be running on `127.0.0.1:27017`, **or**
- Replace `MONGODB_URI` in `backend/.env` with your MongoDB Atlas connection string

4) Run backend + frontend (use 2 terminals)

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd client
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`

If login shows `500`, backend is not running.  
If login works but dashboard fails, MongoDB is not connected.

## Current working APIs

- `POST /api/auth/login`
- `GET /api/bootstrap` (JWT protected)

## Demo login (default)

- Email: `admin@rental.com`
- Password: `admin123`
