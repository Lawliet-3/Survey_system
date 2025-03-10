FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make the start script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["/app/start.sh"]