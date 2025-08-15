# 🎵 AI Instrumental Extractor

A FastAPI-based web application that:
- Lets users **upload an audio file** or **paste a YouTube link**
- Uses **Demucs AI** to separate vocals and instrumentals
- Optionally applies **noise reduction** for cleaner sound
- Returns the extracted **instrumental** as a `.wav` file

---

## 🚀 Features
- **Upload from device** (`.mp3`, `.wav`, etc.)
- **Download from YouTube** using `yt-dlp`
- **AI vocal separation** with Demucs
- **Noise reduction** for smoother instrumentals
- Simple **web interface** (HTML + JavaScript + FastAPI backend)

---
---

## 🛠 Requirements
- Python 3.9+
- `pip install -r requirements.txt`
- [Demucs](https://github.com/facebookresearch/demucs)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)  
  *(place `yt-dlp.exe` somewhere accessible and update the path in `main.py`)*

---

## 📦 Installation
1. Clone the repo (or download ZIP)
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
3. Ensure yt-dlp is installed and YTDLP_PATH in main.py is correct.

4. Run the app: uvicorn main:app --reload

5. Open browser at http://127.0.0.1:8000