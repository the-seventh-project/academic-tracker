import os
from dotenv import load_dotenv

# Load .env file for local development
load_dotenv()

class Config:
    """Backend configuration using environment variables."""
    
    # Database URL: Fallback to local SQLite if DATABASE_URL is not set
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///gpa_calculator.db')
    
    # Secret Key for sessions/security
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-vibe-coded-secret-key')
    
    # Flask settings
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    PORT = int(os.getenv('PORT', 5000))
    
    # CORS settings
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')

config = Config()
