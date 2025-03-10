from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import ssl
import logging
import traceback
import time
import os
from dotenv import load_dotenv
import certifi

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Base credentials
DB_USER = os.getenv("DB_USER", "doadmin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "defaultdb")

# For DigitalOcean managed databases, we should use proper SSL verification
# PostgreSQL connection string with pg8000 driver and SSL
DATABASE_URL = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

logger.info(f"Connecting to database at {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")

# Function to attempt database connection with retries
def create_db_engine(max_retries=5, retry_delay=3):
    retries = 0
    last_exception = None
    
    while retries < max_retries:
        try:
            # Create SQLAlchemy engine with secure SSL configuration
            # Using the system's CA certificates (certifi) for verification
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            
            engine = create_engine(
                DATABASE_URL,
                connect_args={"ssl_context": ssl_context},
                pool_pre_ping=True,     # Check connection before using from pool
                pool_recycle=1800,      # Recycle connections after 30 minutes
                pool_size=5,            # Set connection pool size
                max_overflow=10         # Allow up to 10 overflow connections
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
                # Exponential backoff with jitter
                sleep_time = retry_delay * (2 ** (retries - 1)) + (time.time() % 1)
                logger.info(f"Retrying in {sleep_time:.2f} seconds...")
                time.sleep(sleep_time)
            else:
                logger.error(f"Failed to connect to database after {max_retries} attempts.")
                # Re-raise the last exception
                raise last_exception

try:
    # Create the engine with retry logic
    engine = create_db_engine()
except Exception as e:
    logger.critical(f"Could not establish database connection: {str(e)}")
    logger.debug(traceback.format_exc())
    # In a production environment, you may want to exit the application
    # if database connection fails
    logger.warning("Application may not function correctly without database connection")
    engine = None

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