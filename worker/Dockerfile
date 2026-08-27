# Production-ready Dockerfile for Python OpenCV worker
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /worker

# Install system dependencies required by OpenCV and Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    libtesseract-dev \
    libleptonica-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system worker && adduser --system --ingroup worker worker

# Copy and install Python dependencies
COPY worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker code
COPY worker.py ./worker.py

# Change ownership to non-root user
RUN chown -R worker:worker /worker
USER worker

# Default env vars (override at runtime)
ENV DB_HOST=postgres \
    DB_PORT=5432 \
    DB_NAME=mediadb \
    DB_USER=postgres \
    DB_PASSWORD=postgrespassword \
    RABBITMQ_HOST=rabbitmq

# Start the worker
CMD ["python", "worker.py"]
