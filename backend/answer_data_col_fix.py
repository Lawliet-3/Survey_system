# responses_column_fix.py
# Run this script to change the answer_data column type from JSON to Text
from sqlalchemy import text
import logging
from database import engine

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def change_column_type():
    """Change the answer_data column from JSONB to TEXT"""
    try:
        logger.info("Changing answer_data column type from JSONB to TEXT")
        
        with engine.connect() as conn:
            # Check if the column exists and what type it is
            check_query = text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'responses' AND column_name = 'answer_data';
            """)
            
            result = conn.execute(check_query)
            column_info = result.fetchone()
            
            if not column_info:
                logger.error("answer_data column not found in responses table")
                return False
                
            current_type = column_info[0]
            logger.info(f"Current column type: {current_type}")
            
            # If it's already TEXT, no need to change
            if current_type.upper() == 'TEXT':
                logger.info("Column is already TEXT type")
                return True
                
            # Change the column type
            logger.info("Changing column type to TEXT")
            
            # First, backup the column data
            backup_query = text("""
                ALTER TABLE responses 
                ADD COLUMN answer_data_backup TEXT;
                
                UPDATE responses 
                SET answer_data_backup = answer_data::TEXT;
            """)
            
            # Then, drop and recreate the column
            recreate_query = text("""
                ALTER TABLE responses 
                DROP COLUMN answer_data;
                
                ALTER TABLE responses 
                ADD COLUMN answer_data TEXT;
                
                UPDATE responses 
                SET answer_data = answer_data_backup;
                
                ALTER TABLE responses 
                DROP COLUMN answer_data_backup;
            """)
            
            # Execute the queries in a transaction
            try:
                conn.execute(backup_query)
                logger.info("Backup created")
                
                conn.execute(recreate_query)
                logger.info("Column recreated as TEXT")
                
                conn.commit()
                logger.info("Transaction committed")
                return True
            except Exception as e:
                conn.rollback()
                logger.error(f"Error changing column type: {e}")
                return False
                
    except Exception as e:
        logger.error(f"Error in migration: {e}")
        return False

if __name__ == "__main__":
    success = change_column_type()
    if success:
        print("Migration completed successfully")
    else:
        print("Migration failed")