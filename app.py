import json
import os
import sqlite3
from pathlib import Path
import urllib.error
import urllib.request

import pandas as pd
from flask import Flask, Response, jsonify, request, send_file

app = Flask(__name__)


def load_environment_file(path):
    if not path.is_file():
        return

    with path.open(mode="r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:].strip()
            name, separator, value = line.partition("=")
            if not separator or not name.strip():
                continue

            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            os.environ.setdefault(name.strip(), value)


load_environment_file(Path(__file__).resolve().parent / ".env")

DATASET_PATH = "./assets/dataset/full_dataset.csv"
SEARCH_PAGE_SIZE = 9
INGREDIENT_SEARCH_PAGE_SIZE = 12
TRANSLATION_CACHE_PATH = "./assets/dataset/translation_cache.sqlite3"
LIBRETRANSLATE_URL = os.environ.get("LIBRETRANSLATE_URL", "http://localhost:5000").rstrip("/") + "/translate"
TRANSLATION_BATCH_SIZE = 100
SUPPORTED_TRANSLATION_PAIRS = {("en", "bg"), ("bg", "en")}

APP_CONFIG = {
    "dataset_path": DATASET_PATH,
    "search_page_size": SEARCH_PAGE_SIZE,
    "ingredient_search_page_size": INGREDIENT_SEARCH_PAGE_SIZE,
    "translation_cache_path": TRANSLATION_CACHE_PATH,
}


def read_text_file(path):
    with open(path, mode="r", encoding="utf-8") as file:
        return file.read()


def serve_json_script(path):
    return Response(read_text_file(path), mimetype="application/javascript; charset=utf-8")


def serve_css(path):
    return Response(read_text_file(path), mimetype="text/css; charset=utf-8")


def serve_html(path):
    return read_text_file(path)


df = pd.read_csv(
    APP_CONFIG["dataset_path"],
    on_bad_lines="skip",
    comment="#",
    skipinitialspace=True,
)


def get_translation_cache():
    connection = sqlite3.connect(APP_CONFIG["translation_cache_path"])
    connection.execute(
        """CREATE TABLE IF NOT EXISTS translations (
            source_language TEXT NOT NULL,
            target_language TEXT NOT NULL,
            source_text TEXT NOT NULL,
            translated_text TEXT NOT NULL,
            PRIMARY KEY (source_language, target_language, source_text)
        )"""
    )
    return connection


def translate_texts(texts, source_language="en", target_language="bg"):
    """Return translations for input texts, calling LibreTranslate only for cache misses."""
    translations = {}
    unique_texts = list(dict.fromkeys(text for text in texts if isinstance(text, str) and text.strip()))
    if not unique_texts:
        return translations

    with get_translation_cache() as connection:
        cached_texts = set()
        for start in range(0, len(unique_texts), TRANSLATION_BATCH_SIZE):
            batch = unique_texts[start:start + TRANSLATION_BATCH_SIZE]
            placeholders = ",".join("?" for _ in batch)
            rows = connection.execute(
                f"SELECT source_text, translated_text FROM translations "
                f"WHERE source_language = ? AND target_language = ? AND source_text IN ({placeholders})",
                [source_language, target_language, *batch],
            ).fetchall()
            for source_text, translated_text in rows:
                translations[source_text] = translated_text
                cached_texts.add(source_text)

        missing_texts = [text for text in unique_texts if text not in cached_texts]
        api_key = os.environ.get("LIBRETRANSLATE_API_KEY")

        for start in range(0, len(missing_texts), TRANSLATION_BATCH_SIZE):
            batch = missing_texts[start:start + TRANSLATION_BATCH_SIZE]
            payload = {
                "q": batch,
                "source": source_language,
                "target": target_language,
                "format": "text",
            }
            if api_key:
                payload["api_key"] = api_key
            req = urllib.request.Request(
                LIBRETRANSLATE_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json; charset=utf-8"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as response:
                result = json.loads(response.read().decode("utf-8"))
            batch_translations = result["translatedText"]
            if isinstance(batch_translations, str):
                batch_translations = [batch_translations]
            if len(batch_translations) != len(batch):
                raise RuntimeError("LibreTranslate returned an incomplete batch")

            for source_text, translated_text in zip(batch, batch_translations):
                translations[source_text] = translated_text
                connection.execute(
                    "INSERT OR REPLACE INTO translations "
                    "(source_language, target_language, source_text, translated_text) VALUES (?, ?, ?, ?)",
                    (source_language, target_language, source_text, translated_text),
                )

    return translations


def translate_dataset_records(records, fields, source_language, target_language):
    texts = [record.get(field) for record in records for field in fields]
    translations = translate_texts(texts, source_language, target_language)
    translated_records = []
    for record in records:
        translated = dict(record)
        translated_fields = {}
        for field in fields:
            value = record.get(field)
            if isinstance(value, str) and value.strip():
                translated_fields[field] = translations[value]
        translated["translations"] = translated_fields
        translated_records.append(translated)
    return translated_records


def translation_error(error):
    if isinstance(error, urllib.error.HTTPError):
        return jsonify({"error": "LibreTranslate request failed", "details": error.read().decode("utf-8", errors="replace")}), 502
    if isinstance(error, (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, RuntimeError)):
        return jsonify({"error": str(error)}), 503
    return jsonify({"error": "Translation failed"}), 500


def is_supported_translation_pair(source_language, target_language):
    return (source_language, target_language) in SUPPORTED_TRANSLATION_PAIRS


# ASSETS -------------------------------------------------------------------------------------------------------------------

@app.route("/favicon.ico")
def pantryiqlogo():
    return send_file("./assets/logo/fi.ico", mimetype="image/png")


@app.route("/logo.ico")
def favicon():
    return send_file("./assets/logo/pl.png", mimetype="image/png")


@app.route("/css/dark-theme.css")
def dark_theme():
    return serve_css("./css/dark-theme.css")


@app.route("/css/white-theme.css")
def white_theme():
    return serve_css("./css/white-theme.css")


@app.route("/js/shared.js")
def sharedJs():
    return serve_json_script("./js/shared.js")


@app.route("/js/theme.js")
def themeJs():
    return serve_json_script("./js/theme.js")


@app.route("/js/language.js")
def languageJs():
    return serve_json_script("./js/language.js")


@app.route("/js/byIngredients.js")
def byIngredientsJs():
    return serve_json_script("./js/byIngredients.js")


@app.route("/js/searchRecipes.js")
def searchRecipesJs():
    return serve_json_script("./js/searchRecipes.js")

@app.route("/js/favorites.js")
def favoritesJs():
    return serve_json_script("./js/favorites.js")


@app.route("/js/recipe.js")
def recipeJs():
    return serve_json_script("./js/recipe.js")


# PAGES -----------------------------------------------------------------------------------------------------------------

@app.route("/")
def home():
    return serve_html("./html/homepage.html")


@app.route("/byIngredients")
def byIngredients():
    return serve_html("./html/byIngredients.html")


@app.route("/favorites")
def favorites():
    return serve_html("./html/favorites.html")


@app.route("/searchrecipes")
def searchrecipe():
    return serve_html("./html/searchrecipes.html")


@app.route("/recipe")
def recipe_page():
    return serve_html("./html/recipe.html")


# SEARCH API ---------------------------------------------------------------------------------------------------------------

@app.route("/recipes/search/name")
def search():
    raw_search = request.args.get("q", "")
    page = max(1, request.args.get("page", 1, type=int))
    per_page = APP_CONFIG["search_page_size"]
    filtered_df = df[df["recipe_name"].str.contains(raw_search, case=False, na=False)]
    total = len(filtered_df)
    total_pages = (total + per_page - 1) // per_page
    page = min(page, total_pages) if total_pages else 1

    start = (page - 1) * per_page
    end = start + per_page

    recipes = filtered_df.iloc[start:end].to_dict(orient="records")
    return {"recipes": recipes, "page": page, "page_size": per_page, "total": total, "total_pages": total_pages}


@app.route("/recipes/search/ingr")
def by_ingredients():
    raw_search = request.args.get("q", "")
    page = max(1, request.args.get("page", 1, type=int))
    per_page = APP_CONFIG["ingredient_search_page_size"]

    filtered_df = df
    ingredients_list = []
    for item in raw_search.split(","):
        cleaned_item = item.strip()
        if cleaned_item != "":
            cleaned_item = f" {cleaned_item} "
            ingredients_list.append(cleaned_item)

    for ingredient in ingredients_list:
        filtered_df = filtered_df[filtered_df["ingredients"].str.contains(ingredient, case=False, na=False)]

    total = len(filtered_df)
    total_pages = (total + per_page - 1) // per_page
    page = min(page, total_pages) if total_pages else 1

    start = (page - 1) * per_page
    end = start + per_page

    recipes = filtered_df.iloc[start:end].to_dict(orient="records")
    return {"recipes": recipes, "page": page, "page_size": per_page, "total": total, "total_pages": total_pages}


@app.route("/recipes/favorites", methods=["POST"])
def favorite_recipes():
    data = request.get_json(silent=True) or {}
    recipe_names = data.get("recipe_names")
    if not isinstance(recipe_names, list) or any(not isinstance(name, str) for name in recipe_names):
        return jsonify({"error": "recipe_names must be a list of recipe names"}), 400
    if len(recipe_names) > 1000:
        return jsonify({"error": "A request can contain at most 1000 favorites"}), 400

    matching_recipes = df[df["recipe_name"].isin(recipe_names)].drop_duplicates(subset=["recipe_name"])
    recipes_by_name = matching_recipes.set_index("recipe_name").to_dict(orient="index")
    recipes = [recipes_by_name[name] for name in recipe_names if name in recipes_by_name]
    return {"recipes": recipes}


@app.route("/recipes/detail")
def recipe_detail():
    recipe_name = request.args.get("name", "")
    if not recipe_name:
        return jsonify({"error": "A recipe name is required"}), 400

    matching_recipes = df[df["recipe_name"] == recipe_name]
    if matching_recipes.empty:
        return jsonify({"error": "Recipe not found"}), 404

    recipe_fields = ["recipe_name", "source", "url", "servings", "calories", "image_url", "ingredient_lines"]
    recipe = matching_recipes.iloc[0][recipe_fields].to_dict()
    return {"recipe": recipe}


# TRANSLATION API ----------------------------------------------------------------------------------------------------------

@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json(silent=True) or {}
    texts = data.get("texts")
    if texts is None and isinstance(data.get("text"), str):
        texts = [data["text"]]
    if not isinstance(texts, list) or any(not isinstance(text, str) for text in texts):
        return jsonify({"error": "Provide a text string or a list of text strings"}), 400
    if len(texts) > 1000:
        return jsonify({"error": "A request can contain at most 1000 strings"}), 400

    source_language = data.get("source_language", "en")
    target_language = data.get("target_language", "bg")
    if not isinstance(source_language, str) or not isinstance(target_language, str):
        return jsonify({"error": "source_language and target_language must be strings"}), 400
    if not is_supported_translation_pair(source_language, target_language):
        return jsonify({"error": "Only English and Bulgarian translation is enabled"}), 400

    try:
        translations = translate_texts(texts, source_language, target_language)
        return jsonify({"translations": [translations.get(text, text) for text in texts]})
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, RuntimeError) as error:
        return translation_error(error)


@app.route("/translate/dataset", methods=["POST"])
def translate_dataset():
    data = request.get_json(silent=True) or {}
    records = data.get("records")
    fields = data.get("fields")
    if not isinstance(records, list) or any(not isinstance(record, dict) for record in records):
        return jsonify({"error": "records must be a list of dataset records"}), 400
    if len(records) > 1000:
        return jsonify({"error": "A request can contain at most 1000 records"}), 400
    if not isinstance(fields, list) or not fields or any(not isinstance(field, str) for field in fields):
        return jsonify({"error": "fields must be a non-empty list of record field names"}), 400

    source_language = data.get("source_language", "en")
    target_language = data.get("target_language", "bg")
    if not isinstance(source_language, str) or not isinstance(target_language, str):
        return jsonify({"error": "source_language and target_language must be strings"}), 400
    if not is_supported_translation_pair(source_language, target_language):
        return jsonify({"error": "Only English and Bulgarian translation is enabled"}), 400

    try:
        translated_records = translate_dataset_records(records, fields, source_language, target_language)
        return jsonify({"records": translated_records})
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, RuntimeError) as error:
        return translation_error(error)


if __name__ == "__main__":
    app.run(debug=True, port=8000)
