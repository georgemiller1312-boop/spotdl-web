# ---- Frontend build stage ----
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Backend runtime ----
FROM python:3.12-slim
WORKDIR /app

# spotdl shells out to ffmpeg to convert/tag downloaded audio
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --break-system-packages \
    --default-timeout=180 --retries=5 \
    -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-build /frontend/dist ./static

ENV STATIC_DIR=/app/static
ENV MUSIC_DIR=/music

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
