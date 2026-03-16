# Bobi Recipe Agent (Backend)

API FastAPI pour extraire et importer des recettes (boissons + nourritures).

## Prérequis
- Python 3.10+
- Variables d'environnement (voir `.env.example`)

## Installation
```bash
pip install -r requirements.txt
```

## Démarrer
```bash
uvicorn agent_api:app --host 0.0.0.0 --port 8000
```

## Endpoints
- `POST /api/recipe/extract`
- `POST /api/recipe/commit`
- `GET /healthz`
