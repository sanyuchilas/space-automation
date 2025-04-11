import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.staticfiles import StaticFiles
import shutil
from src.api.schemas import FilePath
from src.service.image_segmentation import segmentate_image
from urllib.parse import urljoin
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы
    allow_headers=["*"],  # Разрешаем все заголовки
)

def get_api_base_url(request: Request) -> str:
    """Возвращает базовый URL API (со схемой и доменом)"""
    base_url = str(request.base_url)
    return base_url[:-1] if base_url.endswith("/") else base_url

# Создаем директории, если они не существуют
os.makedirs("normal-images", exist_ok=True)
os.makedirs("corrected-images", exist_ok=True)
os.makedirs("processed-images", exist_ok=True)

# Монтируем статические файлы для доступа через nginx
app.mount("/normal-images", StaticFiles(directory="normal-images"), name="normal-images")
app.mount("/corrected-images", StaticFiles(directory="corrected-images"), name="corrected-images")
app.mount("/processed-images", StaticFiles(directory="processed-images"), name="processed-images")

def generate_unique_filename(original_filename: str) -> str:
    """Генерирует уникальное имя файла с текущей датой и временем"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    name, ext = os.path.splitext(original_filename)
    return f"{name}_{timestamp}{ext}"

@app.post("/segment-clouds")
async def segment_clouds(file_path: FilePath):
    path = file_path.path
    segmentated_image = segmentate_image(path)
    path = segmentated_image["path"]
    cloud_percentage = segmentated_image["cloud_percentage"]
    return {"path": path, "cloud_percentage": cloud_percentage}

@app.post("/load_image")
async def load_image(request: Request, uploadFile: UploadFile = File(...)):
    # Генерируем уникальное имя файла
    unique_filename = generate_unique_filename(uploadFile.filename)
    normal_path = f"normal-images/{unique_filename}"
    print(f"Unique filename: {unique_filename}")
    
    # Сохраняем файл
    with open(normal_path, "wb") as buffer:
        shutil.copyfileobj(uploadFile.file, buffer)
        
    base_url = get_api_base_url(request)
    image_url = urljoin(base_url, f"/normal-images/{unique_filename}")
    
    # Возвращаем URL до файла
    return {"imageUrl": image_url}