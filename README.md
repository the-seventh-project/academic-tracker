# 📊 GPA Calculator (Refactored)

A modern, full-stack GPA Calculator and Forecaster built with **Python Flask** (Backend) and **Vanilla JS** (Frontend).

## 🚀 Quick Start

### 1. Prerequisites
*   Python 3.8+
*   PostgreSQL (Optional, uses SQLite by default)

### 2. Backend Setup
Navigate to the project root and install dependencies:
```bash
pip install -r backend/requirements.txt
```

### 3. Initialize Database
Create the local SQLite database (or connect to Postgres via .env):
```bash
python -m backend.create_database
```

### 4. Run the Server ⚡
Start the Flask backend from the **root directory**:
```bash
python -m backend.app
```
*   Server will start at: `http://localhost:5000`

### 5. Frontend
*   Open `frontend/index.html` in your browser.
*   Or use a Live Server (VS Code extension) to serve the `frontend` folder.

## 📁 Project Structure
*   `backend/`: Flask API, Services, Database logic.
*   `frontend/`: JS Components, CSS Modules, HTML Pages.
