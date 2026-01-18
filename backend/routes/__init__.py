# Routes Package
# This module registers all Flask Blueprints

from flask import Flask

def register_blueprints(app: Flask):
    """Register all route blueprints with the Flask app."""
    # Register configuration routes
    from backend.routes.config import config_bp
    app.register_blueprint(config_bp)
    
    from backend.routes.auth import auth_bp
    app.register_blueprint(auth_bp)
    
    from backend.routes.courses import courses_bp
    app.register_blueprint(courses_bp)
    
    from backend.routes.assessments import assessments_bp
    app.register_blueprint(assessments_bp)
    
    from backend.routes.gpa import gpa_bp
    app.register_blueprint(gpa_bp)
    
    from backend.routes.admin import admin_bp
    app.register_blueprint(admin_bp)
    
    from backend.routes.students import students_bp
    app.register_blueprint(students_bp)
    
    from backend.routes.external import external_bp
    app.register_blueprint(external_bp)
    
    from backend.routes.forecast import forecast_bp
    app.register_blueprint(forecast_bp)
