# Academic Tracker

A full-stack academic tracker for KPU students — track courses, calculate GPA, and forecast grades.

Built with **Python Flask** (Backend, hosted on Render) + **Vanilla JS** (Frontend, hosted on Netlify) + **Neon PostgreSQL** (Database).

---

## Architecture

| Layer    | Technology       | Hosting  |
|----------|-----------------|----------|
| Frontend | HTML / JS / CSS  | Netlify  |
| Backend  | Python Flask API | Render   |
| Database | PostgreSQL       | Neon     |

---

## Live URLs

- **Frontend:** Deployed on Netlify (drag & drop `frontend/` folder)
- **API:** `https://academic-tracker-api-pujq.onrender.com`

---

## Local Development (Optional)

You only need this if you want to run the backend locally for testing.

### 1. Prerequisites
- Python 3.8+
- A `.env` file in the project root with your Neon database URL:

```
DATABASE_URL=postgresql://your-neon-connection-string
```

### 2. Install dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Run the server
```bash
python -m backend.app
```
Server starts at `http://localhost:5000`. The database schema and migrations run automatically on startup.

### 4. Frontend
Open `frontend/index.html` directly in a browser, or use the VS Code **Live Server** extension to serve the `frontend/` folder.

> **Note:** The API URL is set in `frontend/js/core/config.js`. Change `API_URL` to `http://localhost:5000` if testing locally.

---

## Git Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — what is live on Render/Netlify |
| `local` | Stable local copy, mirrors `main` |
| `dev`  | Active development and experiments |

**Workflow:** Work on `dev` → test → push to `main` to deploy.

---

## Project Structure

```
backend/            Flask API, Services, DB logic
  routes/           API endpoints (auth, courses, gpa, forecast…)
  services/         Business logic (gpa_service, forecast_service)
  create_database.py  Schema creation + auto-migrations
frontend/
  pages/            HTML pages (auth, dashboard, tools)
  js/               JavaScript (core, pages, services, components)
  assets/css/       Modular CSS (variables, base, layout, components)
testing/            Technical docs and logic explanations
```

---

## Grading Scale (KPU)

| Letter | Range     | GPA  |
|--------|-----------|------|
| A+     | 90–100    | 4.00 |
| A      | 85–89.99  | 4.00 |
| A-     | 80–84.99  | 3.70 |
| B+     | 77–79.99  | 3.30 |
| B      | 73–76.99  | 3.00 |
| B-     | 70–72.99  | 2.70 |
| C+     | 67–69.99  | 2.30 |
| C      | 63–66.99  | 2.00 |
| C-     | 60–62.99  | 1.70 |
| D      | 50–59.99  | 1.00 |
| F      | 0–49.99   | 0.00 |
