import os
import subprocess
import uuid

def download_audio_from_youtube(url: str, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}.mp3"
    output_path = os.path.join(output_dir, filename)

    command = [
        "C:\\Users\\Kuber Kapuriya\\Downloads\\yt-dlp.exe",  # Update path if needed
        "--extract-audio",
        "--audio-format", "mp3",
        "--output", output_path,
        url
    ]

    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr}")

    # yt-dlp might automatically add .mp3 extension; check for actual file
    if not os.path.exists(output_path):
        possible_files = [f for f in os.listdir(output_dir) if f.endswith(".mp3")]
        if possible_files:
            return os.path.join(output_dir, possible_files[0])
        raise FileNotFoundError("Audio file not found after yt-dlp execution.")

    return output_path
