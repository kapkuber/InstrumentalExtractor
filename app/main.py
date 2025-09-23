import os
import shutil
import subprocess
import uuid
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.demucs_service import separate_instrumental

app = FastAPI()

# === Config ===
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
YTDLP_PATH = r"C:\\Users\\Kuber Kapuriya\\Downloads\\yt-dlp.exe"

# Optional React build directory (for production serving)
DIST_DIR = os.path.join("client", "dist")
DIST_EXISTS = os.path.isdir(DIST_DIR)

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

"""CORS for React dev server"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""Serve React build in production if present; otherwise fall back to static/index.html"""
if DIST_EXISTS:
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")

# === Cleanup function ===
def cleanup_files():
    """Safely remove old uploads/outputs."""
    for folder in [UPLOAD_DIR, OUTPUT_DIR]:
        for f in os.listdir(folder):
            path = os.path.join(folder, f)
            try:
                if os.path.isfile(path):
                    os.remove(path)
                elif os.path.isdir(path):
                    shutil.rmtree(path)
            except PermissionError:
                print(f"Skipping locked file: {path}")


# === Routes ===


@app.post("/extract-instrumental/")
async def extract_instrumental(
    file: UploadFile = File(...), background_tasks: BackgroundTasks = None
):
    try:
        # Cleanup old files before processing
        cleanup_files()

        upload_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(upload_path, "wb") as buffer:
            buffer.write(await file.read())

        instrumental_path = separate_instrumental(upload_path, OUTPUT_DIR)

        # Schedule cleanup after response
        background_tasks.add_task(cleanup_files)

        return FileResponse(
            instrumental_path, media_type="audio/wav", filename="instrumental.wav"
        )

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/extract-from-youtube/")
async def extract_from_youtube(
    url: str = Form(...), background_tasks: BackgroundTasks = None
):
    try:
        # Cleanup old files first
        cleanup_files()

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

        subprocess.run(command, check=True)

        # Find downloaded file
        downloaded_file = next(
            (f for f in os.listdir(UPLOAD_DIR) if f.startswith(video_id)), None
        )
        if not downloaded_file:
            raise FileNotFoundError("Audio download failed.")

        downloaded_path = os.path.join(UPLOAD_DIR, downloaded_file)
        instrumental_path = separate_instrumental(downloaded_path, OUTPUT_DIR)

        # Cleanup after sending file
        background_tasks.add_task(cleanup_files)

        return FileResponse(
            instrumental_path, media_type="audio/wav", filename="instrumental.wav"
        )

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
