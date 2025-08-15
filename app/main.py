import os
import subprocess
import uuid
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from app.demucs_service import separate_instrumental

app = FastAPI()

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
YTDLP_PATH = r"C:\\Users\\Kuber Kapuriya\\Downloads\\yt-dlp.exe"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.get("/")
async def read_root():
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content, status_code=200)
    return {"message": "index.html not found"}

@app.post("/extract-instrumental/")
async def extract_instrumental(file: UploadFile = File(...)):
    upload_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(upload_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        instrumental_path = separate_instrumental(upload_path, OUTPUT_DIR)
        return FileResponse(instrumental_path, media_type="audio/wav", filename="instrumental.wav")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/extract-from-youtube/")
async def extract_from_youtube(url: str = Form(...)):
    video_id = str(uuid.uuid4())
    output_template = os.path.join(UPLOAD_DIR, f"{video_id}.%(ext)s")

    command = [
        YTDLP_PATH,
        url,
        "--no-playlist",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "-o", output_template
    ]

    try:
        subprocess.run(command, check=True)
        downloaded_file = next((f for f in os.listdir(UPLOAD_DIR) if f.startswith(video_id)), None)
        if not downloaded_file:
            raise FileNotFoundError("Audio download failed.")

        downloaded_path = os.path.join(UPLOAD_DIR, downloaded_file)
        instrumental_path = separate_instrumental(downloaded_path, OUTPUT_DIR)
        return FileResponse(instrumental_path, media_type="audio/wav", filename="instrumental.wav")

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
