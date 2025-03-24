from sqlalchemy import text
import logging
import json
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define migrations with version numbers
MIGRATIONS = [
    {
        "version": "001_initial_schema",
        "description": "Create initial tables if they don't exist",
        "sql": [
            """
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                question_id VARCHAR(255) NOT NULL UNIQUE,
                question_type VARCHAR(50) NOT NULL,
                question_text TEXT NOT NULL,
                question_subtext TEXT,
                options JSONB,
                logic JSONB,
                is_required BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS responses (
                id SERIAL PRIMARY KEY,
                answers JSONB NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        ]
    },
    {
        "version": "002_add_min_selections",
        "description": "Add min_selections column to questions table",
        "sql": [
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'questions' AND column_name = 'min_selections'
                ) THEN
                    ALTER TABLE questions 
                    ADD COLUMN min_selections INTEGER DEFAULT 0;
                END IF;
            END $$;
            """
        ]
    },
    # Add more migrations here as needed
    {
        "version": "003_add_max_selections",
        "description": "Add max_selections column to questions table",
        "sql": [
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'questions' AND column_name = 'max_selections'
                ) THEN
                    ALTER TABLE questions 
                    ADD COLUMN max_selections INTEGER DEFAULT 0;
                END IF;
            END $$;
            """
        ]
    }
]

def migrate_database(engine):
    """Execute database migrations with version tracking"""
    try:
        logger.info("Running database migrations...")
        
        with engine.connect() as connection:
            # Create migrations table if it doesn't exist
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) NOT NULL UNIQUE,
                    description TEXT,
                    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    details JSONB
                );
            """))
            connection.commit()
            
            # Get already applied migrations
            result = connection.execute(text("SELECT version FROM migrations;"))
            applied_versions = [row[0] for row in result.fetchall()]
            logger.info(f"Found {len(applied_versions)} previously applied migrations")
            
            # Apply pending migrations
            applied_count = 0
            for migration in MIGRATIONS:
                version = migration["version"]
                
                # Skip already applied migrations
                if version in applied_versions:
                    logger.info(f"Migration {version} already applied, skipping")
                    continue
                
                logger.info(f"Applying migration {version}: {migration['description']}")
                
                # Execute all SQL statements for this migration
                for sql in migration["sql"]:
                    try:
                        connection.execute(text(sql))
                        connection.commit()
                    except Exception as e:
                        logger.error(f"Error executing SQL in migration {version}: {str(e)}")
                        connection.rollback()
                        raise
                
                # Record the migration
                migration_details = {
                    "sql_count": len(migration["sql"]),
                    "applied_by": "system",
                    "timestamp": datetime.now().isoformat()
                }
                
                connection.execute(
                    text("""
                        INSERT INTO migrations (version, description, details) 
                        VALUES (:version, :description, :details);
                    """),
                    {
                        "version": version,
                        "description": migration["description"],
                        "details": json.dumps(migration_details)
                    }
                )
                connection.commit()
                
                logger.info(f"Successfully applied migration {version}")
                applied_count += 1
                
            logger.info(f"Database migrations completed: {applied_count} applied, {len(applied_versions)} skipped")
            return True
            
    except Exception as e:
        logger.error(f"Database migration error: {str(e)}")
        return False