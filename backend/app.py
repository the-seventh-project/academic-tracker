import os
import sys
import logging
import requests
from flask import Flask, jsonify
from flask_cors import CORS

# Definitive fix for Render: Add project root to path
# This ensures 'backend' can be imported as a package
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root not in sys.path:
    sys.path.insert(0, root)

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from backend.routes import register_blueprints
from backend.config import config
from backend.create_database import create_database

# Initialize database tables on startup
logger.info("Verifying database schema...")
create_database()

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
        "message": "GPA Calculator API",
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


if __name__ == '__main__':
    logger.info("Starting GPA Calculator Backend...")
    # Bind to 0.0.0.0 for Render/Production
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)


