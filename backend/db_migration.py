from sqlalchemy import text
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_database(engine):
    """Execute database migrations for schema updates"""
    try:
        logger.info("Running database migrations...")
        
        with engine.connect() as connection:
            # Check if min_selections column exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'questions' AND column_name = 'min_selections';
            """))
            
            column_exists = result.fetchone() is not None
            
            # Add min_selections column if it doesn't exist
            if not column_exists:
                logger.info("Adding min_selections column to questions table...")
                connection.execute(text("""
                    ALTER TABLE questions 
                    ADD COLUMN min_selections INTEGER DEFAULT 0;
                """))
                connection.commit()
                logger.info("Successfully added min_selections column")
            else:
                logger.info("min_selections column already exists")

        logger.info("Database migrations completed successfully")
        return True
    except Exception as e:
        logger.error(f"Database migration error: {str(e)}")
        return False