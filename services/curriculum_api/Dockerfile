FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY services/curriculum_api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY tools /app/tools
COPY services/curriculum_api /app/services/curriculum_api

CMD ["sh", "-c", "uvicorn services.curriculum_api.app:app --host 0.0.0.0 --port ${PORT}"]
