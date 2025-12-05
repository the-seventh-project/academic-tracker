import sqlite3

def create_database():
    """Create all database tables and initial data"""
    conn = sqlite3.connect('gpa_calculator.db')
    cursor = conn.cursor()
    
    # Create USER table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS USER (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname VARCHAR(50) NOT NULL,
            lastname VARCHAR(50) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            user_type VARCHAR(10) NOT NULL DEFAULT 'Student'
        )
    ''')
    
    # Create COURSE table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS COURSE (
            course_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code VARCHAR(20) NOT NULL,
            course_name VARCHAR(100) NOT NULL,
            credit_hours DECIMAL(3,1) NOT NULL,
            semester VARCHAR(20) NOT NULL,
            student_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES USER(user_id) ON DELETE CASCADE
        )
    ''')
    
    # Create ASSESSMENT table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ASSESSMENT (
            assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            assessment_type VARCHAR(20) NOT NULL,
            weight DECIMAL(5,2) NOT NULL,
            marks DECIMAL(6,2) NOT NULL,
            earned_marks DECIMAL(6,2),
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES USER(user_id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES COURSE(course_id) ON DELETE CASCADE
        )
    ''')
    
    # Create GPAREPORT table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS GPAREPORT (
            report_id INTEGER PRIMARY KEY AUTOINCREMENT,
            semester_gpa DECIMAL(3,2),
            cumulative_gpa DECIMAL(3,2),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            student_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES USER(user_id) ON DELETE CASCADE
        )
    ''')
    
    # Create WHATIFSCENARIO table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS WHATIFSCENARIO (
            scenario_id INTEGER PRIMARY KEY AUTOINCREMENT,
            scenario_name VARCHAR(100),
            desired_grades DECIMAL(5,2) NOT NULL,
            predicted_gpa DECIMAL(3,2),
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES USER(user_id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES COURSE(course_id) ON DELETE CASCADE
        )
    ''')
    
    # Create GRADINGSCALE table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS GRADINGSCALE (
            scale_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    
    cursor.executemany(
        'INSERT OR IGNORE INTO GRADINGSCALE (letter_grade, min_score, max_score, gpa_value) VALUES (?, ?, ?, ?)',
        grading_scale
    )
    
    # Create test student account
    cursor.execute('''
        INSERT OR IGNORE INTO USER (firstname, lastname, email, password, user_type)
        VALUES ('Test', 'Student', 'test@student.com', 'password123', 'Student')
    ''')
    
    # Create test admin account
    cursor.execute('''
        INSERT OR IGNORE INTO USER (firstname, lastname, email, password, user_type)
        VALUES ('Admin', 'User', 'admin@kpu.ca', 'admin123', 'Admin')
    ''')
    
    conn.commit()
    conn.close()
    print("Database created successfully!")
    print("Created 6 tables: USER, COURSE, ASSESSMENT, GPAREPORT, WHATIFSCENARIO, GRADINGSCALE")
    print("Test accounts created:")
    print("   Student: test@student.com / password123")
    print("   Admin: admin@kpu.ca / admin123")

if __name__ == '__main__':
    create_database()
