import ast
import pandas as pd
from flask import Flask, Response

app = Flask(__name__)

@app.route("/")
def home():
    return open("./frontend/index.html", mode='r')

@app.route("/indexstyle.css")
def index_style():
    return Response(open("./frontend/indexstyle.css", mode='r'), mimetype="text/css")

@app.route("/indexcode.js")
def index_code():
    return Response(open("./frontend/indexcode.js", mode='r'), mimetype="application/javascript")

@app.route("/api/get-recipes")
def get_recipes():
    column_names = [
        "title",
        "ingredients",
        "directions",
        "link",
        "source",
        "NER"
    ]
    df = pd.read_csv("./assets/dataset/full_dataset.csv", names=column_names, comment='#', skiprows=1, skipinitialspace=True)
    recipes = df.to_dict(orient="records")
    return {"recipes": recipes}

if __name__ == "__main__":
    app.run(debug=True)