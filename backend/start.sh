#!/bin/bash

echo "Installing required packages..."
pip install psycopg2-binary

# Get the PORT from environment variable or default to 8080 for Cloud Run
PORT="${PORT:-8080}"
echo "Application will listen on port $PORT"

echo "Testing database connection..."
python << END
import os
import sys
import time
import psycopg2

# Get database connection details
db_user = os.getenv("DB_USER", "doadmin")
db_password = os.getenv("DB_PASSWORD", "")
db_host = os.getenv("DB_HOST", "localhost")
db_port = int(os.getenv("DB_PORT", "5432"))
db_name = os.getenv("DB_NAME", "defaultdb")

print(f"Attempting to connect to PostgreSQL database: {db_host}:{db_port}/{db_name}")

# Try to connect directly with psycopg2
max_attempts = 5
attempt = 0

while attempt < max_attempts:
    attempt += 1
    try:
        # For DigitalOcean, this connection string format often works better
        conn_string = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password} sslmode=require"
        
        print(f"Attempt {attempt}: Connecting with conn_string...")
        conn = psycopg2.connect(conn_string)
        
        # Run a simple query
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"Connection successful! Test query result: {result}")
        
        cursor.close()
        conn.close()
        print("Database connection test passed")
        sys.exit(0)
    except Exception as e:
        print(f"Connection attempt {attempt} failed: {e}")
        if attempt < max_attempts:
            sleep_time = 3 * attempt
            print(f"Retrying in {sleep_time} seconds...")
            time.sleep(sleep_time)
        else:
            print("All connection attempts failed.")
            # We'll continue anyway and let the application try
            # Don't exit with error so Cloud Run doesn't immediately fail
            # sys.exit(1)
END

echo "Running database initialization..."
python -c "from database import Base, engine; from models import *; Base.metadata.create_all(engine)" || true

echo "Running database migrations..."
python -c "from db_migration import migrate_database; from database import engine; migrate_database(engine)" || true

echo "Starting the application on port $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT