# ==========================================
# Stage 1: Build Environment
# ==========================================
FROM python:3.11-slim-bookworm AS builder

# Prevent python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies and patch package vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Initialize virtual environment to package all libraries cleanly
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .

# Install dependencies into virtual environment
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files to build environment
COPY . .

# ==========================================
# Stage 2: Secure Distroless Runtime
# ==========================================
# Distroless images contain only the application and its runtime dependencies.
# They lack package managers, shells, or auxiliary programs, removing 100% of standard OS vulnerabilities.
FROM gcr.io/distroless/python3-debian12

WORKDIR /app

# Copy the pre-built virtual environment and application code from builder stage
# Ownership is set to the default non-root user (uid: 65532, username: nonroot)
COPY --from=builder --chown=nonroot:nonroot /opt/venv /opt/venv
COPY --from=builder --chown=nonroot:nonroot /app /app

# Configure execution environment paths
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/opt/venv/lib/python3.11/site-packages"

# Expose FastAPI listening port
EXPOSE 8000

# Switch to the non-privileged nonroot user
USER nonroot

# Run the API server via Python interpreter to bypass script wrapper shebang execution errors in distroless
ENTRYPOINT ["/usr/bin/python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
