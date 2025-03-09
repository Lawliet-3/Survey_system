from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import ssl
import logging
import traceback
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a custom SSL context that doesn't verify certificates
# NOTE: In production, you should use proper certificate verification
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Base credentials
DB_USER = "doadmin"
DB_PASSWORD = "AVNS_s5qe31ldmhfLbyzLKCY"
DB_HOST = "db-postgresql-sgp1-19252-do-user-16591899-0.m.db.ondigitalocean.com"
DB_PORT = "25060"
DB_NAME = "defaultdb"

# PostgreSQL connection string with pg8000 driver and SSL context
DATABASE_URL = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

logger.info(f"Connecting to database at {DB_HOST}:{DB_PORT}/{DB_NAME} as {DB_USER}")

# Function to attempt database connection with retries
def create_db_engine(max_retries=3, retry_delay=2):
    retries = 0
    last_exception = None
    
    while retries < max_retries:
        try:
            # Create SQLAlchemy engine with SSL context
            engine = create_engine(
                DATABASE_URL,
                connect_args={"ssl_context": ssl_context},
                pool_pre_ping=True,  # Check connection before using from pool
                pool_recycle=3600    # Recycle connections after 1 hour
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
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
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
    # For demonstration purposes we're not re-raising, but in production
    # you should decide how to handle this fatal error
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