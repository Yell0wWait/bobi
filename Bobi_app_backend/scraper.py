import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# ============================================================
# CONFIG SUPABASE (intégré directement comme demandé)
# ============================================================

SUPABASE_URL = "https://qxjpmtqncivzqvskyrgf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4anBtdHFuY2l2enF2c2t5cmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNTExOTYsImV4cCI6MjA4MjYyNzE5Nn0.5sb9ONpFdqpLhUAzgFkepxfEnnFvJrzFY6MxGKKgyZ0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================
# UTILS
# ============================================================

def clean(txt: str) -> str:
    return " ".join(txt.replace("\xa0", " ").split())

def is_iba(url: str) -> bool:
    return "iba-world.com/iba-cocktail" in url

def is_saq(url: str) -> bool:
    return "saq.com" in url

# ============================================================
# PARSER IBA (CORRIGÉ)
# ============================================================

def parse_iba(url: str):
    res = requests.get(url, timeout=15)
    soup = BeautifulSoup(res.text, "html.parser")

    # -------- Ingrédients --------
    ingredients = []
    ing_nodes = soup.select("div.recipe-ingredients ul li")
    if not ing_nodes:
        ing_nodes = soup.select("div.field--name-field-ingredients li")

    for li in ing_nodes:
        txt = clean(li.get_text())
        if txt:
            ingredients.append({
                "nom": txt,
                "quantite": None
            })

    # -------- Étapes --------
    steps = []
    step_nodes = soup.select("div.recipe-instructions ol li")
    if not step_nodes:
        step_nodes = soup.select("div.field--name-field-preparation p")

    for i, node in enumerate(step_nodes, start=1):
        txt = clean(node.get_text())
        if txt:
            steps.append({
                "ordre": i,
                "description": txt
            })

    return ingredients, steps

# ============================================================
# PARSER SAQ (CORRIGÉ)
# ============================================================

def parse_saq(url: str):
    res = requests.get(url, timeout=15)
    soup = BeautifulSoup(res.text, "html.parser")

    # -------- Ingrédients --------
    ingredients = []
    ing_nodes = soup.select("div.cocktail-ingredients li")
    if not ing_nodes:
        ing_nodes = soup.select("ul.ingredients-list li")

    for li in ing_nodes:
        txt = clean(li.get_text())
        if txt:
            ingredients.append({
                "nom": txt,
                "quantite": None
            })

    # -------- Étapes --------
    steps = []
    step_nodes = soup.select("div.cocktail-preparation p")
    if not step_nodes:
        step_nodes = soup.select("div.preparation p")

    for i, p in enumerate(step_nodes, start=1):
        txt = clean(p.get_text())
        if txt:
            steps.append({
                "ordre": i,
                "description": txt
            })

    return ingredients, steps

# ============================================================
# INSERTION DB
# ============================================================

def insert_ingredients(boisson_id, ingredients):
    for ing in ingredients:
        supabase.table("boissons_ingredients").upsert({
            "boisson_id": boisson_id,
            "nom": ing["nom"],
            "quantite": ing["quantite"]
        }).execute()

def insert_steps(boisson_id, steps):
    for step in steps:
        supabase.table("boissons_preparation").upsert({
            "boisson_id": boisson_id,
            "ordre": step["ordre"],
            "description": step["description"]
        }).execute()

# ============================================================
# IMPORT D'UNE BOISSON
# ============================================================

def import_boisson(boisson_id, url, insert_db=True):
    if is_iba(url):
        ingredients, steps = parse_iba(url)
    elif is_saq(url):
        ingredients, steps = parse_saq(url)
    else:
        print(f"Lien non reconnu : {url}")
        return

    if not insert_db:
        print("⚠️ Mode ponctuel sans insertion DB boisson")
        print("Ingrédients :", ingredients)
        print("Étapes :", steps)
        return

    insert_ingredients(boisson_id, ingredients)
    insert_steps(boisson_id, steps)

    print(f"Recette importée pour boisson_id {boisson_id}")

# ============================================================
# MODE BATCH AUTO
# ============================================================

def batch_import():
    rows = supabase.table("boissons") \
        .select("id, url") \
        .not_.is_("url", "null") \
        .execute() \
        .data

    for row in rows:
        url = row["url"]
        if not (is_iba(url) or is_saq(url)):
            continue

        print(f"Import de {row['id']} depuis {url}")
        import_boisson(row["id"], url, insert_db=True)

# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
        import_boisson("TEST", url, insert_db=False)
    else:
        batch_import()
