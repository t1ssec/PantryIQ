import pandas as pd
from flask import Flask, Response, request, send_file

app = Flask(__name__)
df = pd.read_csv("./assets/dataset/full_dataset.csv", on_bad_lines='skip', comment='#', skipinitialspace=True) # reads the data set

# ASSETS -------------------------------------------------------------------------------------------------------------------

@app.route("/favicon.ico")
def pantryiqlogo():
    return send_file("./assets/logo/favicon.ico", mimetype="image/png")

@app.route("/logo.ico")
def favicon():
    return send_file("./assets/logo/PantryIQ_Logo.ico", mimetype="image/png")

# HOMEPAGE -----------------------------------------------------------------------------------------------------------------

@app.route("/")
def home():
    return open("./html/homepage.html", mode='r')

# BYINGREDIENTS ------------------------------------------------------------------------------------------------------------

@app.route("/byIngredients")
def byIngredients():
    return open("./html/byIngredients.html", mode='r')

@app.route("/css/dark-theme.css")
def index_style():
    return Response(open("./css/dark-theme.css", mode='r', encoding='utf-8'), mimetype="text/css; charset=utf-8")

@app.route("/js/byIngredients.js")
def index_code():
    return Response(open("./js/byIngredients.js", mode='r', encoding='utf-8'), mimetype="application/javascript; charset=utf-8")

# SEARCH API ---------------------------------------------------------------------------------------------------------------

@app.route("/recipes/search") # the recipes search
def search():
    raw_search = request.args.get("search", "")                                   # gets ?search="SEARCH-TERM"
    filtered_df = df[df["title"].str.contains(raw_search, case=False, na=False)]  # searches in the dataframe and writes it to a variable
    recipes = filtered_df.to_dict(orient="records")
    return {"recipes": recipes}

@app.route("/recipes/search/by-ingredients")      # the recipes search by ingredients
def by_ingredients():
    raw_search = request.args.get("search", "")
    
    filtered_df = df

    ingredients_list = []
    for item in raw_search.split(","):            # removes the ","
       cleaned_item = item.strip()                # removes the " "
       if cleaned_item != "":                     # to prevent empty item
           ingredients_list.append(cleaned_item)  # adds to the list

    for ingredient in ingredients_list:
        filtered_df = filtered_df[filtered_df["ingredients"].str.contains(ingredient, case=False, na=False)]

    recipes = filtered_df.to_dict(orient="records")
    return {"recipes": recipes}

# --------------------------------------------------------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)