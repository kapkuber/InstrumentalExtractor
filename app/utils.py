import os
import shutil
from app.config import UPLOAD_DIR

def save_file(upload_file) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, upload_file.filename)

    with open(file_path, "wb") as f:
        f.write(upload_file.file.read())

    return file_path

def cleanup_files(*file_paths):
    for path in file_paths:
        if os.path.exists(path):
            os.remove(path)

    # clean up all previous outputs
    if os.path.exists("separated"):
        shutil.rmtree("separated", ignore_errors=True)
