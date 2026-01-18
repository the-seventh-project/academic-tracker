# External API Routes
# Weather and other external service integrations
from flask import Blueprint, jsonify
import requests

external_bp = Blueprint('external', __name__)


@external_bp.route('/campus-weather', methods=['GET'])
def get_campus_weather():
    """Get weather for KPU Richmond campus"""
    try:
        # Richmond, BC coordinates
        response = requests.get(
            'https://api.open-meteo.com/v1/forecast?latitude=49.17&longitude=-123.14&current_weather=true'
        )
        weather = response.json()

        return jsonify({
            "temperature": weather['current_weather']['temperature'],
            "windspeed": weather['current_weather']['windspeed'],
            "time": weather['current_weather']['time']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
