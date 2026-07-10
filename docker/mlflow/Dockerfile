# MLflow-Image mit vorinstallierten Abhaengigkeiten: der pip-Install laeuft
# einmalig beim Build statt bei jedem Container-Start (~80 s pro App-Start).
# Versions-Bump: Version hier und im image-Tag in docker-compose.yml anpassen.
FROM python:3.12-slim
RUN pip install --no-cache-dir mlflow[mcp]==3.8.1
WORKDIR /app
