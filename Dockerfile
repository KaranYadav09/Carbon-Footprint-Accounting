# Use the official Python base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 7860

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (Hugging Face Spaces requires UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Install Python dependencies
COPY --chown=user server/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY --chown=user server/ .

# Expose port (HF Spaces defaults to 7860)
EXPOSE 7860

# Run the application
CMD ["python", "app.py"]
