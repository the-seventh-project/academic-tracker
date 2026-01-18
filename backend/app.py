# GPA Calculator Backend
# Entry point - imports and registers all Flask blueprints
from flask import Flask, jsonify
from flask_cors import CORS
import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

import sys
import os

# Add the directory containing this file to the Python path for robust imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routes import register_blueprints
from config import config

app = Flask(__name__)
# Permissive CORS for production stability
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/', methods=['GET'])
def home():
    """API status endpoint"""
    logger.info("Health check endpoint called")
    return jsonify({
        "status": "online",
        "message": "GPA Calculator API",
        "version": "2.0.0"
    })


@app.route('/api/campus-weather', methods=['GET'])
def get_weather():
    """Mock weather endpoint"""
    return jsonify({
        "temperature": 15,
        "windspeed": 10,
        "condition": "Cloudy"
    })


# Register all route blueprints
register_blueprints(app)


if __name__ == '__main__':
    logger.info("Starting GPA Calculator Backend...")
    # Bind to 0.0.0.0 for Render/Production
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
