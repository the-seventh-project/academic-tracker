# Academic Tracker

A comprehensive tool for tracking academic performance, calculating GPA, and forecasting grades.

## Project Structure

- **backend/**: Flask-based API server
- **frontend/**: HTML/CSS/JS user interface

## Setup Instructions

### Prerequisites
- Python 3.x installed
- Pip installed

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Initialize the database:
```bash
python create_database.py
```

Start the server:
```bash
python app.py
```
The server will run on `http://localhost:5000`.

### 2. Frontend Usage

Simply open `frontend/login.html` in your web browser. No build step is required for the frontend.

## Features

- **Dashboard**: Overview of current GPA and course performance
- **Course Management**: Add, update, and delete courses
- **Assessment Tracking**: Track assignments, quizzes, and exams
- **GPA Calculation**: Real-time semester and cumulative GPA
- **What-If Analysis**: Forecast future GPA based on potential grades
- **Trends**: View historical performance trends

## License

Private project for personal use.
