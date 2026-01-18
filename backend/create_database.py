import sqlite3
import psycopg2
from .database import get_db_connection, format_query
from werkzeug.security import generate_password_hash

def create_database():
    """Create all database tables and initial data (supports SQLite and PostgreSQL)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    is_sqlite = isinstance(conn, sqlite3.Connection)
    
    # helper for auto-increment and keys
    PK_TYPE = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
    IGNORE = "OR IGNORE" if is_sqlite else ""
    CONFLICT = "" if is_sqlite else "ON CONFLICT DO NOTHING"

    # Create USER table
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS "USER" (
            user_id {PK_TYPE},
            firstname VARCHAR(50) NOT NULL,
            lastname VARCHAR(50) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            user_type VARCHAR(10) NOT NULL DEFAULT 'Student'
        )
    ''')
    
    # Create COURSE table
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS "COURSE" (
            course_id {PK_TYPE},
            course_code VARCHAR(20) NOT NULL,
            course_name VARCHAR(100) NOT NULL,
            credit_hours DECIMAL(3,1) NOT NULL,
            semester VARCHAR(20) NOT NULL,
            student_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES "USER"(user_id) ON DELETE CASCADE
        )
    ''')
    
    # Create ASSESSMENT table
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS "ASSESSMENT" (
            assessment_id {PK_TYPE},
            name VARCHAR(100) NOT NULL,
            assessment_type VARCHAR(20) NOT NULL,
            weight DECIMAL(5,2) NOT NULL,
            marks DECIMAL(6,2) NOT NULL,
            earned_marks DECIMAL(6,2),
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES "USER"(user_id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES "COURSE"(course_id) ON DELETE CASCADE
        )
    ''')
    
    # Create GPAREPORT table
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS "GPAREPORT" (
            report_id {PK_TYPE},
            semester_gpa DECIMAL(3,2),
            cumulative_gpa DECIMAL(3,2),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            student_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES "USER"(user_id) ON DELETE CASCADE
        )
    ''')
    
    # Create WHATIFSCENARIO table
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS "WHATIFSCENARIO" (
            scenario_id {PK_TYPE},
            scenario_name VARCHAR(100),
            desired_grades DECIMAL(5,2) NOT NULL,
            predicted_gpa DECIMAL(3,2),
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES "USER"(user_id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES "COURSE"(course_id) ON DELETE CASCADE
        )
    ''')
    
    # Create ASSESSMENT_TYPE table
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS "ASSESSMENT_TYPE" (
            type_id {PK_TYPE},
            name VARCHAR(50) UNIQUE NOT NULL,
            default_weight DECIMAL(5,2) DEFAULT 0,
            color VARCHAR(20) DEFAULT '#bb86fc'
        )
    ''')

    # Create GRADINGSCALE table
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS "GRADINGSCALE" (
            scale_id {PK_TYPE},
            letter_grade VARCHAR(3) UNIQUE NOT NULL,
            min_score DECIMAL(5,2) NOT NULL,
            max_score DECIMAL(5,2) NOT NULL,
            gpa_value DECIMAL(3,2) NOT NULL
        )
    ''')
    
    # Insert KPU grading scale data
    grading_scale = [
        ('A+', 90.00, 100.00, 4.00),
        ('A', 85.00, 89.99, 4.00),
        ('A-', 80.00, 84.99, 3.70),
        ('B+', 77.00, 79.99, 3.30),
        ('B', 73.00, 76.99, 3.00),
        ('B-', 70.00, 72.99, 2.70),
        ('C+', 67.00, 69.99, 2.30),
        ('C', 63.00, 66.99, 2.00),
        ('C-', 60.00, 62.99, 1.70),
        ('D', 50.00, 59.99, 1.00),
        ('F', 0.00, 49.99, 0.00)
    ]
    
    insert_scale_query = format_query(f'INSERT {IGNORE} INTO "GRADINGSCALE" (letter_grade, min_score, max_score, gpa_value) VALUES (?, ?, ?, ?) {CONFLICT}', conn)
    cursor.executemany(insert_scale_query, grading_scale)

    # Insert Default Assessment Types
    assessment_types = [
        ('Assignment', 10.0, '#bb86fc'),  # Purple
        ('Quiz', 5.0, '#03dac6'),         # Teal
        ('Midterm', 20.0, '#d76d77'),     # Red
        ('Final', 30.0, '#3a1c71'),       # Deep Purple
        ('Project', 15.0, '#ffaf7b'),     # Orange
        ('Lab', 10.0, '#ff8c00'),         # Dark Orange
        ('Participation', 5.0, '#cf6679') # Pink
    ]

    insert_types_query = format_query(f'INSERT {IGNORE} INTO "ASSESSMENT_TYPE" (name, default_weight, color) VALUES (?, ?, ?) {CONFLICT}', conn)
    cursor.executemany(insert_types_query, assessment_types)
    
    # Create or Update test student account
    student_pw = generate_password_hash('password123')
    cursor.execute(format_query('SELECT user_id FROM "USER" WHERE email = ?', conn), ('test@student.com',))
    exists = cursor.fetchone()
    if exists:
        cursor.execute(format_query('UPDATE "USER" SET password = ? WHERE email = ?', conn), (student_pw, 'test@student.com'))
    else:
        cursor.execute(format_query('''
            INSERT INTO "USER" (firstname, lastname, email, password, user_type)
            VALUES (?, ?, ?, ?, 'Student')
        ''', conn), ('Test', 'Student', 'test@student.com', student_pw))
    
    # Create or Update test admin account
    admin_pw = generate_password_hash('admin123')
    cursor.execute(format_query('SELECT user_id FROM "USER" WHERE email = ?', conn), ('admin@kpu.ca',))
    exists = cursor.fetchone()
    if exists:
        cursor.execute(format_query('UPDATE "USER" SET password = ? WHERE email = ?', conn), (admin_pw, 'admin@kpu.ca'))
    else:
        cursor.execute(format_query('''
            INSERT INTO "USER" (firstname, lastname, email, password, user_type)
            VALUES (?, ?, ?, ?, 'Admin')
        ''', conn), ('Admin', 'User', 'admin@kpu.ca', admin_pw))
    
    conn.commit()
    conn.close()
    print("Database created/verified successfully!")
    print(f"Connected to: {'SQLite' if is_sqlite else 'PostgreSQL'}")
    print("Prepared 6 tables: USER, COURSE, ASSESSMENT, GPAREPORT, WHATIFSCENARIO, GRADINGSCALE")


if __name__ == '__main__':
    create_database()
