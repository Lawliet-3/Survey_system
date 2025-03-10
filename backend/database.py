from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging
import traceback
import time
import os
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database credentials
DB_USER = os.getenv("DB_USER", "doadmin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "defaultdb")

# For DigitalOcean managed PostgreSQL, use the simpler sslmode parameter
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

logger.info(f"Connecting to database at {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")

def create_db_engine(max_retries=5, retry_delay=3):
    retries = 0
    last_exception = None
    
    while retries < max_retries:
        try:
            # For DigitalOcean, simply using sslmode=require is often more reliable
            # than custom SSL contexts
            engine = create_engine(
                DATABASE_URL,
                connect_args={"sslmode": "require"},  # Direct sslmode parameter
                pool_pre_ping=True,
                pool_recycle=1800
            )
            
            # Test the connection
            from sqlalchemy import text
            with engine.connect() as connection:
                result = connection.execute(text("SELECT 1"))
                logger.info(f"Database connection successful! Test query result: {result.fetchone()}")
            
            return engine
        
        except Exception as e:
            retries += 1
            last_exception = e
            logger.warning(f"Database connection attempt {retries} failed: {str(e)}")
            logger.debug(traceback.format_exc())
            
            if retries < max_retries:
                sleep_time = retry_delay * (2 ** (retries - 1))
                logger.info(f"Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                logger.error(f"Failed to connect to database after {max_retries} attempts.")
                raise last_exception

try:
    # Create the engine with retry logic
    engine = create_db_engine()
except Exception as e:
    logger.critical(f"Could not establish database connection: {str(e)}")
    logger.debug(traceback.format_exc())
    engine = None
    logger.warning("Application may not function correctly without database connection")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

# Add this to the end of database.py for testing
if __name__ == "__main__":
    # Test the database connection
    try:
        from sqlalchemy import text
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("Database connection successful:", result.fetchone())
    except Exception as e:
        print(f"Database connection test failed: {str(e)}")
        print(traceback.format_exc())