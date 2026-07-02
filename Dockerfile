FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY src/ src/

# Persisted delta-detection state / scraped output live here.
# Mount a volume at /app/data in production so daily runs see prior state.
RUN mkdir -p /app/data /app/articles

ENV STATE_FILE=/app/data/state.json
ENV ARTICLES_DIR=/app/articles

ENTRYPOINT ["python", "main.py"]
