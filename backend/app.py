import os
import sys

# Definitive fix for Render: Add project root to path
# This ensures 'backend' can be imported as a package
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root not in sys.path:
    sys.path.insert(0, root)

from backend.routes import register_blueprints
from backend.config import config

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
