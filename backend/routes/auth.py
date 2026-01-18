# Authentication Routes
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database import query_db, execute_db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Student/Admin login"""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = query_db(
        'SELECT * FROM "USER" WHERE email = ?',
        (email,),
        one=True
    )

    if user and check_password_hash(user['password'], password):
        return jsonify({
            "success": True,
            "user": {
                "id": user['user_id'],
                "name": f"{user['firstname']} {user['lastname']}",
                "email": user['email'],
                "type": user['user_type']
            }
        })
    return jsonify({"success": False, "message": "Invalid credentials"}), 401


@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    """Register new student"""
    data = request.json

    try:
        hashed_password = generate_password_hash(data['password'])
        user_id = execute_db(
            '''INSERT INTO "USER" (firstname, lastname, email, password, user_type)
               VALUES (?, ?, ?, ?, 'Student')''',
            (data['firstname'], data['lastname'], data['email'], hashed_password)
        )
        return jsonify({"success": True, "user_id": user_id})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@auth_bp.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset user password"""
    data = request.json
    email = data.get('email')
    new_password = data.get('new_password')

    user = query_db('SELECT * FROM "USER" WHERE email = ?', (email,), one=True)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    try:
        hashed_password = generate_password_hash(new_password)
        execute_db(
            'UPDATE "USER" SET password = ? WHERE email = ?',
            (hashed_password, email)
        )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
