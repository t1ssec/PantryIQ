import pandas as pd
from flask import Flask, Response, request, send_file

app = Flask(__name__)
df = pd.read_csv("./assets/dataset/full_dataset.csv", on_bad_lines='skip', comment='#', skipinitialspace=True) # reads the data set

# ASSETS -------------------------------------------------------------------------------------------------------------------

@app.route("/favicon.ico")
def pantryiqlogo():
    return send_file("./assets/logo/fi.ico", mimetype="image/png")

@app.route("/logo.ico")
def favicon():
    return send_file("./assets/logo/pl.png", mimetype="image/png")

@app.route("/css/dark-theme.css")
def dark_theme():
    return Response(open("./css/dark-theme.css", mode='r', encoding='utf-8'), mimetype="text/css; charset=utf-8")

@app.route("/js/byIngredients.js")
def byIngredientsJs():
    return Response(open("./js/byIngredients.js", mode='r', encoding='utf-8'), mimetype="application/javascript; charset=utf-8")

@app.route("/js/searchRecipes.js")
def searchRecipesJs():
    return Response(open("./js/searchRecipes.js", mode='r', encoding='utf-8'), mimetype="application/javascript; charset=utf-8")

# PAGES -----------------------------------------------------------------------------------------------------------------

@app.route("/")
def home():
    return open("./html/homepage.html", mode='r', encoding='utf-8')

@app.route("/byIngredients")
def byIngredients():
    return open("./html/byIngredients.html", mode='r', encoding='utf-8')

@app.route("/favorites")
def favorites():
    return open("./html/favorites.html", mode='r', encoding='utf-8')

@app.route("/searchrecipes")
def searchrecipe():
    return open("./html/searchrecipes.html", mode='r', encoding='utf-8')

# SEARCH API ---------------------------------------------------------------------------------------------------------------

@app.route("/recipes/search") # the recipes search
def search():
    raw_search = request.args.get("q", "")                                              # gets ?q="SEARCH-TERM"
    page = request.args.get("page", 1, type=int)
    per_page = 9
    filtered_df = df[df["recipe_name"].str.contains(raw_search, case=False, na=False)]  # searches in the dataframe and writes it to a variable

    start = (page - 1) * per_page
    end = start + per_page

    recipes = filtered_df.to_dict(orient="records")[start:end]
    return {"recipes": recipes}

@app.route("/recipes/search/by-ingredients")      # the recipes search by ingredients
def by_ingredients():
    raw_search = request.args.get("q", "")
    page = request.args.get("page", 1, type=int)
    per_page = 9

    filtered_df = df
    ingredients_list = []
    for item in raw_search.split(","):            # removes the ","
       cleaned_item = item.strip()                # removes the " "
       if cleaned_item != "":                     # to prevent empty item
           cleaned_item = f" {cleaned_item} "
           ingredients_list.append(cleaned_item)  # adds to the list

    for ingredient in ingredients_list:
        filtered_df = filtered_df[filtered_df["ingredients"].str.contains(ingredient, case=False, na=False)]

    start = (page - 1) * per_page
    end = start + per_page

    recipes = filtered_df.to_dict(orient="records")[start:end]
    return {"recipes": recipes}

# --------------------------------------------------------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)