import pandas as pd
from flask import Flask, Response, request, send_file

app = Flask(__name__)

DATASET_PATH = "./assets/dataset/full_dataset.csv"
SEARCH_PAGE_SIZE = 9
INGREDIENT_SEARCH_PAGE_SIZE = 12

APP_CONFIG = {
    "dataset_path": DATASET_PATH,
    "search_page_size": SEARCH_PAGE_SIZE,
    "ingredient_search_page_size": INGREDIENT_SEARCH_PAGE_SIZE,
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


@app.route("/js/byIngredients.js")
def byIngredientsJs():
    return serve_json_script("./js/byIngredients.js")


@app.route("/js/searchRecipes.js")
def searchRecipesJs():
    return serve_json_script("./js/searchRecipes.js")


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


# SEARCH API ---------------------------------------------------------------------------------------------------------------

@app.route("/recipes/search")
def search():
    raw_search = request.args.get("q", "")
    page = request.args.get("page", 1, type=int)
    per_page = APP_CONFIG["search_page_size"]
    filtered_df = df[df["recipe_name"].str.contains(raw_search, case=False, na=False)]

    start = (page - 1) * per_page
    end = start + per_page

    recipes = filtered_df.to_dict(orient="records")[start:end]
    return {"recipes": recipes}


@app.route("/recipes/search/by-ingredients")
def by_ingredients():
    raw_search = request.args.get("q", "")
    page = request.args.get("page", 1, type=int)
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

    start = (page - 1) * per_page
    end = start + per_page

    recipes = filtered_df.to_dict(orient="records")[start:end]
    return {"recipes": recipes}


if __name__ == "__main__":
    app.run(debug=True)