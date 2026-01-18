# Routes Package
# This module registers all Flask Blueprints

from flask import Flask

def register_blueprints(app: Flask):
    """Register all route blueprints with the Flask app."""
    # Register configuration routes
    from .config import config_bp
    app.register_blueprint(config_bp)
    
    # Register existing routes
    from .auth import auth_bp
    app.register_blueprint(auth_bp)
    
    from .courses import courses_bp
    app.register_blueprint(courses_bp)
    
    from .assessments import assessments_bp
    app.register_blueprint(assessments_bp)
    
    from .gpa import gpa_bp
    app.register_blueprint(gpa_bp)
    
    from .admin import admin_bp
    app.register_blueprint(admin_bp)
    
    from .students import students_bp
    app.register_blueprint(students_bp)
    
    from .external import external_bp
    app.register_blueprint(external_bp)
    
    from .forecast import forecast_bp
    app.register_blueprint(forecast_bp)
