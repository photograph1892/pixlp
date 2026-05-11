# PixLP AI Server

This server receives an OOTD photo, detects the person with AI background removal, turns the detected person into a pixel object, and returns a transparent PNG.

## Run Locally

```bash
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8787
```

Then open the website at:

```text
http://localhost:5500/index.html
```

The website sends OOTD images to:

```text
http://127.0.0.1:8787/api/pixel-person
```

## Deploy

Deploy `server.py` and `requirements.txt` to Render as a Python Web Service.

Start command:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

After Render gives you a URL, replace this line in `app.js`:

```js
const AI_PIXEL_PERSON_ENDPOINT = "http://127.0.0.1:8787/api/pixel-person";
```

with:

```js
const AI_PIXEL_PERSON_ENDPOINT = "https://YOUR-RENDER-URL.onrender.com/api/pixel-person";
```
