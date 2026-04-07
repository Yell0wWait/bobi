import json
import os
import re
import unicodedata
from typing import Any, Dict, List, Literal, Optional

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

# ----------------------------
# Config
# ----------------------------

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY").strip('"') if os.getenv("OPENAI_API_KEY") else None
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip('"')
OPENAI_API_URL = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/responses").strip('"')

SUPABASE_URL = os.getenv("SUPABASE_URL").strip('"') if os.getenv("SUPABASE_URL") else None
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
if SUPABASE_KEY:
    SUPABASE_KEY = SUPABASE_KEY.strip('"')

MAX_TEXT_CHARS = int(os.getenv("RECIPE_MAX_TEXT_CHARS", "12000").strip('"'))

if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY environment variable")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Schemas
# ----------------------------


class ExtractRequest(BaseModel):
    entity_type: Literal["boisson", "nourriture"]
    url: Optional[str] = None
    text: Optional[str] = None


class CommitSource(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None


class CommitIngredient(BaseModel):
    ingredient_id: Optional[str] = None
    create_new_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    type: Optional[str] = None
    name_raw: Optional[str] = None
    alternatives: Optional[Dict[str, Any]] = None


class CommitStep(BaseModel):
    order: int
    text: str


class CommitRequest(BaseModel):
    entity_type: Literal["boisson", "nourriture"]
    entity_id: str
    source: Optional[CommitSource] = None
    title: Optional[str] = None
    replace_mode: bool = True
    ingredients: List[CommitIngredient]
    steps: List[CommitStep]


# ----------------------------
# Prompt + JSON schema (Structured Outputs)
# ----------------------------


RECIPE_SCHEMA_NAME = "recipe_extract_v1"
RECIPE_SCHEMA_STRICT = True
RECIPE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["entity_type", "title", "source", "ingredients", "steps", "recipe_notes"],
    "properties": {
        "entity_type": {"type": "string", "enum": ["boisson", "nourriture"]},
        "title": {"type": ["string", "null"]},
        "source": {
            "type": "object",
            "additionalProperties": False,
            "required": ["url", "name"],
            "properties": {
                "url": {"type": ["string", "null"]},
                "name": {"type": ["string", "null"]},
            },
        },
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name_raw", "quantity", "quantity_text", "unit", "notes", "group"],
                "properties": {
                    "name_raw": {"type": "string"},
                    "quantity": {"type": ["number", "null"]},
                    "quantity_text": {"type": ["string", "null"]},
                    "unit": {"type": ["string", "null"]},
                    "notes": {"type": ["string", "null"]},
                    "group": {"type": ["string", "null"]},
                },
            },
        },
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["order", "text"],
                "properties": {
                    "order": {"type": "integer"},
                    "text": {"type": "string"},
                },
            },
        },
        "recipe_notes": {"type": ["string", "null"]},
    },
}

SYSTEM_PROMPT = (
    "Tu es un agent d'extraction de recettes.\n"
    "Retourne UNIQUEMENT un JSON conforme au schéma fourni.\n"
    "N'invente rien. Si une quantité/unité manque, omets le champ.\n"
    "Garde l'ordre des étapes. Mets entity_type tel que demandé.\n"
)


# ----------------------------
# Utils
# ----------------------------


def normalize_text(value: str) -> str:
    if not value:
        return ""
    value = value.lower()
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = re.sub(r"[^a-z0-9\s-]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = " ".join(soup.get_text(" ").split())
    return text


def extract_output_text(response_json: Dict[str, Any]) -> Optional[str]:
    if "output_text" in response_json and response_json["output_text"]:
        return response_json["output_text"]
    for item in response_json.get("output", []):
        for content in item.get("content", []):
            if isinstance(content, dict) and "text" in content:
                return content["text"]
    return None


def fetch_inventory() -> List[Dict[str, Any]]:
    res = supabase.table("inventaire").select("id, nom, categorie").execute()
    return res.data or []


def find_candidates(name_raw: str, inventory: List[Dict[str, Any]]) -> Dict[str, Any]:
    from difflib import SequenceMatcher

    normalized = normalize_text(name_raw)
    exact = None
    scored = []
    for item in inventory:
        norm_item = normalize_text(item.get("nom", ""))
        if normalized and normalized == norm_item:
            exact = item
            break
        if normalized and norm_item:
            score = SequenceMatcher(None, normalized, norm_item).ratio()
            scored.append((score, item))

    if exact:
        return {
            "status": "matched",
            "selected_inventory_id": exact["id"],
            "candidates": [{"id": exact["id"], "nom": exact["nom"], "score": 1.0}],
        }

    scored.sort(key=lambda x: x[0], reverse=True)
    top = [
        {"id": item["id"], "nom": item["nom"], "score": round(score, 3)}
        for score, item in scored[:3]
        if score >= 0.55
    ]
    if top:
        return {"status": "suggested", "selected_inventory_id": top[0]["id"], "candidates": top}
    return {"status": "unmatched", "selected_inventory_id": None, "candidates": []}


def call_openai(entity_type: str, content: str, url: Optional[str]) -> Dict[str, Any]:
    user_prompt = (
        f"Type cible: {entity_type}\n"
        f"URL source: {url or 'N/A'}\n\n"
        "Texte de recette:\n"
        f"{content}\n"
    )

    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": RECIPE_SCHEMA_NAME,
                "schema": RECIPE_SCHEMA,
                "strict": RECIPE_SCHEMA_STRICT,
            }
        },
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    resp = requests.post(OPENAI_API_URL, headers=headers, json=payload, timeout=60)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    response_json = resp.json()
    output_text = extract_output_text(response_json)
    if not output_text:
        raise HTTPException(status_code=500, detail="OpenAI response missing output text")

    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid JSON output: {exc}") from exc


# ----------------------------
# Routes
# ----------------------------


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/api/recipe/extract")
def extract_recipe(body: ExtractRequest):
    if bool(body.url) == bool(body.text):
        raise HTTPException(status_code=400, detail="Provide exactly one of url or text")

    if body.url:
        res = requests.get(body.url, timeout=20)
        res.raise_for_status()
        content = extract_text_from_html(res.text)
    else:
        content = body.text or ""

    content = " ".join(content.split())
    if len(content) > MAX_TEXT_CHARS:
        content = content[:MAX_TEXT_CHARS]

    extraction = call_openai(body.entity_type, content, body.url)
    extraction["entity_type"] = body.entity_type
    extraction.setdefault("ingredients", [])
    extraction.setdefault("steps", [])
    extraction.setdefault("source", {"url": None, "name": None})
    if body.url and not extraction["source"].get("url"):
        extraction["source"]["url"] = body.url

    inventory = fetch_inventory()
    for ing in extraction["ingredients"]:
        match = find_candidates(ing.get("name_raw", ""), inventory)
        ing["match"] = match

    return {"extraction": extraction}


@app.post("/api/recipe/commit")
def commit_recipe(body: CommitRequest):
    if body.entity_type not in ("boisson", "nourriture"):
        raise HTTPException(status_code=400, detail="Invalid entity_type")

    ingredients_table = "boissons_ingredients" if body.entity_type == "boisson" else "nourritures_ingredients"
    preparation_table = "boissons_preparation" if body.entity_type == "boisson" else "nourritures_preparation"
    entity_table = "boissons" if body.entity_type == "boisson" else "nourritures"
    entity_id_field = "boisson_id" if body.entity_type == "boisson" else "nourriture_id"

    if body.replace_mode:
        supabase.table(ingredients_table).delete().eq(entity_id_field, body.entity_id).execute()
        supabase.table(preparation_table).delete().eq(entity_id_field, body.entity_id).execute()

    inventory_cache = {item["id"]: item for item in fetch_inventory()}
    allowed_boisson_types = {"obligatoire", "facultatif"}

    ingredient_rows = []
    for ing in body.ingredients:
        ingredient_id = ing.ingredient_id
        if not ingredient_id and ing.create_new_name:
            created = supabase.table("inventaire").insert({
                "nom": ing.create_new_name.strip()
            }).execute()
            if created.data:
                ingredient_id = created.data[0]["id"]
                inventory_cache[ingredient_id] = created.data[0]

        if not ingredient_id:
            raise HTTPException(status_code=400, detail="Missing ingredient_id for one or more ingredients")

        ingredient_type = ing.type or ("obligatoire" if body.entity_type == "boisson" else None)
        if body.entity_type == "boisson" and ingredient_type not in allowed_boisson_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid ingredient type; expected 'obligatoire' or 'facultatif'",
            )

        row = {
            entity_id_field: body.entity_id,
            "ingredient_id": ingredient_id,
            "quantite": ing.quantity,
            "unite": ing.unit,
            "alternatives": ing.alternatives or {
                "raw": ing.name_raw,
            },
            "type": ingredient_type,
        }
        ingredient_rows.append(row)

    if ingredient_rows:
        try:
            supabase.table(ingredients_table).insert(ingredient_rows).execute()
        except Exception as exc:
            print("Insert ingredients failed:", exc)
            raise HTTPException(status_code=500, detail=f"Insert ingredients failed: {exc}") from exc

    step_rows = []
    for step in body.steps:
        step_rows.append({
            entity_id_field: body.entity_id,
            "ordre": step.order,
            "description": step.text,
        })
    if step_rows:
        try:
            supabase.table(preparation_table).insert(step_rows).execute()
        except Exception as exc:
            print("Insert steps failed:", exc)
            raise HTTPException(status_code=500, detail=f"Insert steps failed: {exc}") from exc

    update_payload = {}
    if body.source and body.source.url:
        update_payload["lien_recette"] = body.source.url
    if body.source and body.source.name:
        update_payload["recette"] = body.source.name
    if update_payload:
        try:
            supabase.table(entity_table).update(update_payload).eq("id", body.entity_id).execute()
        except Exception as exc:
            print("Update entity failed:", exc)
            raise HTTPException(status_code=500, detail=f"Update entity failed: {exc}") from exc

    return {"ok": True, "ingredients": len(ingredient_rows), "steps": len(step_rows)}
