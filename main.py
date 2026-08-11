from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return open("./fontend/index.html", mode='r')

if __name__ == "__main__":
    app.run(debug=True)