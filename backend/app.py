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

from .routes import register_blueprints
from .config import config

app = Flask(__name__)
CORS(app, origins=config.ALLOWED_ORIGINS)


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
    print("=" * 50)
    print("GPA Calculator Backend v2.0")
    print("=" * 50)
    print(f"Server: http://localhost:{config.PORT}")
    print(f"Debug: {config.DEBUG}")
    print("=" * 50)
    
    app.run(debug=config.DEBUG, port=config.PORT, use_reloader=False)
