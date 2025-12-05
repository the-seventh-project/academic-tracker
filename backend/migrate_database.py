"""
Database Migration Script
Adds student profile columns to USER table

Run this ONCE on PythonAnywhere before using the new profile endpoints.
"""

import sqlite3
import os

def migrate():
    # Find database file
    db_path = 'gpa_calculator.db'
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check which columns already exist
    cursor.execute("PRAGMA table_info(USER)")
    existing_columns = [col[1] for col in cursor.fetchall()]
    print(f"Existing columns: {existing_columns}")
    
    # Add missing columns
    columns_to_add = [
        ("student_id", "VARCHAR(20) DEFAULT ''"),
        ("major", "VARCHAR(100) DEFAULT ''"),
        ("level", "VARCHAR(50) DEFAULT ''")
    ]
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE USER ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added column: {col_name}")
            except sqlite3.OperationalError as e:
                print(f"⚠️ Column {col_name}: {e}")
        else:
            print(f"ℹ️ Column {col_name} already exists")
    
    conn.commit()
    conn.close()
    print("\n✅ Migration complete!")
    return True

def verify():
    """Verify the migration worked"""
    conn = sqlite3.connect('gpa_calculator.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(USER)")
    columns = cursor.fetchall()
    conn.close()
    
    print("\nUSER table columns:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
    required = ['student_id', 'major', 'level']
    existing = [col[1] for col in columns]
    missing = [r for r in required if r not in existing]
    
    if missing:
        print(f"\n❌ Missing columns: {missing}")
        return False
    else:
        print("\n✅ All required columns present!")
        return True

if __name__ == '__main__':
    print("=" * 50)
    print("Academic Tracker - Database Migration")
    print("=" * 50)
    migrate()
    verify()
