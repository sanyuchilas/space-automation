import os
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Request, HTTPException, Form, status
from fastapi.staticfiles import StaticFiles
import shutil
from src.api.schemas import FilePath
from src.service.image_segmentation import segmentate_image
from urllib.parse import urljoin
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы
    allow_headers=["*"],  # Разрешаем все заголовки
)

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

def get_api_base_url(request: Request) -> str:
    """Возвращает базовый URL API (со схемой и доменом)"""
    base_url = str(request.base_url)
    return base_url[:-1] if base_url.endswith("/") else base_url

def get_path(filename: str, request: Request) -> str:
    base_url = get_api_base_url(request)
    
    print(f"Base url from get_path: {base_url}")
    
    if (filename.startswith("n_")):
        return urljoin(base_url, f"/normal-images/{filename}")
    elif (filename.startswith("c_")):
        return urljoin(base_url, f"/corrected-images/{filename}")
    else:
        return urljoin(base_url, f"/processed-images/{filename}")

@app.post("/segment-clouds")
async def segment_clouds(request: Request, file_path: FilePath):
    path = os.path.join(os.getenv("NORMAL_IMAGES_DIR"), file_path.path)
    segmentated_image = segmentate_image(path)
    filename = segmentated_image["filename"]
    cloud_percentage = segmentated_image["cloud_percentage"]
    return {"path": get_path(filename, request), "cloud_percentage": cloud_percentage}

@app.post("/load_image")
async def load_image(
    request: Request,
    uploadFile: Optional[UploadFile] = File(None),
    previewFileName: Optional[str] = Form(None)
):
    normal_dir = os.getenv("NORMAL_IMAGES_DIR")
    corrected_dir = os.getenv("CORRECTED_IMAGES_DIR")
    processed_dir = os.getenv("PROCESSED_IMAGES_DIR")
    
    if uploadFile is not None:
        filename = f"n_{generate_unique_filename(uploadFile.filename)}"
        normal_path = os.path.join(normal_dir, filename)
        
        print(f"Unique filename: {filename}")
        print(f"File: {uploadFile}")
        print(f"Filename: {uploadFile.filename}")
        
        with open(normal_path, "wb") as buffer:
            shutil.copyfileobj(uploadFile.file, buffer)
        
        return {"imageUrl": get_path(filename, request)}
    
    # Если uploadFile отсутствует, работаем с previewFileName
    if not previewFileName:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either uploadFile or previewFileName must be provided"
        )

    # Проверяем первые два символа previewFileName
    if previewFileName.startswith("n_"):
        # Проверяем существование файла в normal-images
        normal_path = os.path.join(normal_dir, previewFileName)
        if os.path.exists(normal_path):
            return {"imageUrl": f"/normal-images/{previewFileName}"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {previewFileName} not found in normal images"
            )
    else:
        # Ищем файл в corrected и processed
        source_path = None
        
        # Проверяем corrected-images
        corrected_path = os.path.join(corrected_dir, previewFileName)
        if os.path.exists(corrected_path):
            source_path = corrected_path
        else:
            # Проверяем processed-images
            processed_path = os.path.join(processed_dir, previewFileName)
            if os.path.exists(processed_path):
                source_path = processed_path
        
        if not source_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {previewFileName} not found in corrected or processed images"
            )
        
        # Копируем файл в normal-images с префиксом n_
        new_filename = f"n_{previewFileName}"
        dest_path = os.path.join(normal_dir, new_filename)
        
        try:
            shutil.copy2(source_path, dest_path)
            return {"imageUrl": f"/normal-images/{new_filename}"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to copy file: {str(e)}"
            )

@app.get("/server_images", response_model=Dict[str, List[Dict[str, Optional[str]]]])
async def get_server_images(request: Request):
    try:
        # Получаем пути к директориям из переменных окружения
        normal_dir = os.getenv("NORMAL_IMAGES_DIR")
        corrected_dir = os.getenv("CORRECTED_IMAGES_DIR")
        processed_dir = os.getenv("PROCESSED_IMAGES_DIR")

        # Получаем список файлов в каждой директории
        normal_images = set(os.listdir(normal_dir))
        corrected_images = set(os.listdir(corrected_dir)) if os.path.exists(corrected_dir) else set()
        processed_images = set(os.listdir(processed_dir)) if os.path.exists(processed_dir) else set()

        server_images = []

        # Для каждого нормального изображения ищем соответствующие corrected и processed
        for img_name in normal_images:
            # Пропускаем временные файлы и скрытые файлы
            if img_name.startswith('.') or img_name.startswith('temp_'):
                continue

            # Получаем базовое имя файла без префикса 'n_' если он есть
            base_name = img_name[2:] if img_name.startswith('n_') else img_name
            corrected_name = f"c_{base_name}"  # предполагаемый формат имени corrected
            processed_name = f"p_{base_name}"  # предполагаемый формат имени processed

            # Формируем URL для каждого типа изображения
            normal_url = get_path(img_name, request)
            corrected_url = get_path(corrected_name, request) if corrected_name in corrected_images else None
            processed_url = get_path(processed_name, request) if processed_name in processed_images else None

            server_images.append({
                "normal": normal_url,
                "corrected": corrected_url,
                "processed": processed_url
            })

        return {"serverImages": server_images}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving server images: {str(e)}")