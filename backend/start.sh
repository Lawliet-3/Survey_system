#!/bin/bash

echo "Waiting for database to be ready..."
# Wait for database to be ready
python << END
import time
import socket
import os

host = os.getenv("DB_HOST", "localhost")
port = int(os.getenv("DB_PORT", "5432"))
max_retries = 30
retry_interval = 2

for i in range(max_retries):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        sock.connect((host, port))
        sock.close()
        print(f"Database at {host}:{port} is ready!")
        break
    except Exception as e:
        print(f"Waiting for database... Attempt {i+1}/{max_retries}")
        if i == max_retries - 1:
            print(f"Could not connect to database: {e}")
            exit(1)
        time.sleep(retry_interval)
END

echo "Running database initialization..."
python -c "from main import initialize_database; initialize_database()"

echo "Running database migrations..."
python -c "from db_migration import migrate_database; from database import engine; migrate_database(engine)"

echo "Starting the application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload