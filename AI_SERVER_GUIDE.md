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

Deploy this repository to Render as a Python Web Service.

Render can read `render.yaml` automatically. Use these settings if Render asks:

Start command:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

Recommended service name:

```text
pixlp-ai
```

If Render accepts that name, the AI endpoint will be:

```text
https://pixlp-ai.onrender.com/api/pixel-person
```

The frontend already uses this URL when it is opened from the deployed PixLP site.
