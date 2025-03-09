from sqlalchemy import create_engine, text
import time

DATABASE_URL = "postgresql://doadmin:AVNS_s5qe31ldmhfLbyzLKCY@db-postgresql-sgp1-19252-do-user-16591899-0.m.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

def align_database_with_models():
    print("Aligning database tables with SQLAlchemy models...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        transaction = conn.begin()
        
        try:
            # Fix question_type column
            print("Converting question_type column to VARCHAR...")
            
            # Check if it's an enum
            result = conn.execute(text("""
                SELECT data_type, udt_name 
                FROM information_schema.columns 
                WHERE table_name = 'questions' AND column_name = 'question_type';
            """))
            col_info = result.fetchone()
            
            if col_info and col_info[0] == 'USER-DEFINED':
                # Create a new column with the correct type
                conn.execute(text("""
                    ALTER TABLE questions ADD COLUMN question_type_new VARCHAR NOT NULL DEFAULT 'SA';
                """))
                
                # Copy data with conversion
                conn.execute(text("""
                    UPDATE questions SET question_type_new = question_type::text;
                """))
                
                # Drop the old column
                conn.execute(text("""
                    ALTER TABLE questions DROP COLUMN question_type;
                """))
                
                # Rename the new column
                conn.execute(text("""
                    ALTER TABLE questions RENAME COLUMN question_type_new TO question_type;
                """))
            
            # Check and fix any other columns if needed
            print("Checking other columns...")
            column_types = {
                "id": "VARCHAR",
                "question_text": "VARCHAR",
                "question_subtext": "VARCHAR",
                "options": "JSON",
                "logic": "JSON",
                "is_required": "BOOLEAN",
                "display_order": "INTEGER"
            }
            
            for col_name, expected_type in column_types.items():
                result = conn.execute(text(f"""
                    SELECT data_type, udt_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'questions' AND column_name = '{col_name}';
                """))
                col_info = result.fetchone()
                
                if col_info:
                    current_type = col_info[0].upper()
                    if current_type != expected_type.upper() and current_type != 'USER-DEFINED':
                        print(f"Converting {col_name} from {current_type} to {expected_type}...")
                        conn.execute(text(f"""
                            ALTER TABLE questions 
                            ALTER COLUMN {col_name} TYPE {expected_type} 
                            USING {col_name}::{expected_type};
                        """))
            
            # Commit changes
            transaction.commit()
            print("Database tables now match SQLAlchemy models!")
            
        except Exception as e:
            transaction.rollback()
            print(f"Error during database alignment: {e}")

if __name__ == "__main__":
    align_database_with_models()