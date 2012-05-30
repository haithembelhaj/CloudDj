from flask import Flask, render_template, request
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stream')
def stream():
	r = requests.get(request.args.get('url',''))
	return r.content


if __name__ == '__main__':
    app.run(port= 28974)