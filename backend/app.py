import os
import sys

# Fix for Render: Add project root to path BEFORE any backend imports.
# When Render runs 'gunicorn app:app' from the backend/ directory,
# 'backend' is not on sys.path. This must happen before the imports below.
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _root not in sys.path:
    sys.path.insert(0, _root)

from backend.create_database import create_database
from backend.config import config
from backend.routes import register_blueprints
import logging
import requests
from flask import Flask, jsonify
from flask_cors import CORS

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Initialize database tables on startup
logger.info("Verifying database schema...")
try:
    create_database()
    logger.info("Database schema verified successfully.")
except Exception as e:
    logger.warning(f"Could not verify database schema on startup: {e}. Tables are assumed to already exist.")

app = Flask(__name__)
# Fully permissive CORS for all routes (important for production connectivity)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route('/', methods=['GET'])
def home():
    """API status endpoint with database health check"""
    logger.info("Health check endpoint called")
    db_status = "unknown"
    try:
        from backend.database import query_db
        # Simple query to test connection
        query_db("SELECT 1", one=True)
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
        logger.error(f"Database health check failed: {str(e)}")

    return jsonify({
        "status": "online",
        "database": db_status,
        "message": "Academic Tracker API",
        "version": "2.1.0"
    })


@app.route('/api/campus-weather')
def get_weather():
    """
    Fetch real weather data using Open-Meteo (Free, No-key required).
    Coordinates for Vancouver: Lat 49.28, Lon -123.12
    """
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=49.2827&longitude=-123.1207&current_weather=true"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        current = data.get('current_weather', {})
        return jsonify({
            "temperature": current.get('temperature', 15),
            "windspeed": current.get('windspeed', 10),
            "condition": "Live"
        })
    except Exception as e:
        logger.error(f"Weather API error: {str(e)}")
        # Fallback to mock data if API is down
        return jsonify({
            "temperature": 15,
            "windspeed": 10,
            "condition": "Offline"
        })


# Register all route blueprints
register_blueprints(app)


# Global error handlers — always return JSON so the frontend can parse the response
@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request", "message": str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found", "message": str(e)}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed", "message": str(e)}), 405

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {str(e)}", exc_info=True)
    return jsonify({"error": "Internal server error", "message": "An unexpected error occurred. Please try again."}), 500

@app.errorhandler(Exception)
def unhandled_exception(e):
    logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({"error": "Internal server error", "message": "An unexpected error occurred. Please try again."}), 500


if __name__ == '__main__':
    logger.info("Starting Academic Tracker Backend...")
    # Bind to 0.0.0.0 for Render/Production
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)


