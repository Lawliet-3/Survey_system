#!/bin/bash

echo "Installing certifi package for SSL certificate verification..."
pip install certifi

echo "Waiting for database to be ready..."
# Wait for database to be ready using a more reliable method
python << END
import time
import os
import sys
import ssl
import certifi
import socket
from urllib.parse import urlparse

# Get database connection details
db_user = os.getenv("DB_USER", "doadmin")
db_password = os.getenv("DB_PASSWORD", "")
db_host = os.getenv("DB_HOST", "localhost")
db_port = int(os.getenv("DB_PORT", "5432"))
db_name = os.getenv("DB_NAME", "defaultdb")

# DigitalOcean managed PostgreSQL requires SSL
print(f"Testing connection to {db_host}:{db_port}...")

# Maximum number of connection attempts
max_retries = 30
retry_delay = 3

for attempt in range(1, max_retries + 1):
    try:
        # Try to establish a socket connection first to check if host is reachable
        print(f"Attempt {attempt}/{max_retries}: Checking if host is reachable...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((db_host, db_port))
        sock.close()
        print(f"Successfully connected to {db_host}:{db_port}")
        
        # If socket connection works, try actual database connection
        print("Testing database credentials and authentication...")
        
        # We'll try to connect using psycopg2 if available, otherwise SQLAlchemy
        try:
            import psycopg2
            
            conn_string = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password} sslmode=require"
            conn = psycopg2.connect(conn_string)
            
            # Execute a simple query
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            print(f"Database connection successful! Test query result: {result}")
            cursor.close()
            conn.close()
            break
            
        except ImportError:
            print("psycopg2 not installed, falling back to SQLAlchemy...")
            
            try:
                from sqlalchemy import create_engine, text
                import pg8000
                
                # Create a secure SSL context
                ssl_context = ssl.create_default_context(cafile=certifi.where())
                
                # Connect using SQLAlchemy
                engine = create_engine(
                    f"postgresql+pg8000://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}",
                    connect_args={"ssl_context": ssl_context}
                )
                
                with engine.connect() as connection:
                    result = connection.execute(text("SELECT 1"))
                    print(f"Database connection successful! Test query result: {result.fetchone()}")
                break
                
            except ImportError:
                print("SQLAlchemy or pg8000 not installed, installing requirements...")
                import subprocess
                subprocess.check_call([sys.executable, "-m", "pip", "install", "sqlalchemy", "pg8000"])
                print("Requirements installed, will try database connection on next attempt")
                
    except Exception as e:
        print(f"Connection attempt {attempt} failed: {str(e)}")
        
        if attempt == max_retries:
            print("Maximum number of retries reached. Exiting.")
            sys.exit(1)
            
        # Exponential backoff with base of retry_delay
        sleep_time = retry_delay * (2 ** min(attempt - 1, 4))  # Cap at 16x base delay
        print(f"Retrying in {sleep_time} seconds...")
        time.sleep(sleep_time)
END

if [ $? -ne 0 ]; then
    echo "Failed to connect to database. Exiting."
    exit 1
fi

echo "Running database initialization..."
python -c "from database import Base, engine; from models import *; Base.metadata.create_all(engine)"

echo "Running database migrations..."
python -c "from db_migration import migrate_database; from database import engine; migrate_database(engine)"

echo "Starting the application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload