import { ChangeEventHandler, MouseEventHandler, useRef, useState } from "react";
import styles from "./App.module.css";
import {
  getCorrectionServiceUrl,
  getMainServiceUrl,
  makeRequest,
} from "@/shared";

type ProcessingStatus =
  | "correction"
  | "cloud-segmentation"
  | "processed"
  | "uploaded"
  | "error";

interface Image {
  file: File | null;
  url: string;
}

interface ServerImage {
  normal: string;
  corrected: string | null;
  processed: string | null;
}

function App() {
  const [uploadedImage, setUploadedImage] = useState<Image | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<null | string>(
    null,
  );
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>("uploaded");
  const [serverImages, setServerImages] = useState<ServerImage[]>([]);
  const [isServerImagesLoaded, setIsServerImagesLoaded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null!);

  const onInputChange: ChangeEventHandler<HTMLInputElement> = event => {
    const [file] = event.target.files ?? [null];

    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);

    setUploadedImage({
      url,
      file,
    });
    setProcessingStatus("uploaded");
    setProcessedImageUrl(null);
  };

  const getStatusText = () => {
    if (!uploadedImage) {
      return "Ожидается загрузка";
    }

    switch (processingStatus) {
      case "cloud-segmentation":
        return "Сегментация облаков...";

      case "correction":
        return "Корректировка изображения...";

      case "uploaded":
        return "Изображение загружено";

      case "processed":
        return "Изображение обработано";

      case "error":
        return "Ошибка обработки";
    }
  };

  const getServerImages = async (): Promise<ServerImage[]> => {
    const { data, systemError } = await makeRequest<{
      serverImages: ServerImage[];
    }>(`${getMainServiceUrl()}/server_images`, {
      method: "GET",
    });

    setIsServerImagesLoaded(true);

    if (systemError) {
      return [];
    }

    return data.serverImages;
  };

  const postLoadImage = async (image: Image) => {
    const body = new FormData();

    if (image.file) {
      body.append("uploadFile", image.file);
    }

    body.append("previewFileName", getImageNameFromUrl(image.url));

    const { data, systemError } = await makeRequest<{
      imageUrl: string;
    }>(`${getMainServiceUrl()}/load_image`, {
      method: "POST",
      body,
      contentType: "formatdata",
    });

    if (systemError) {
      return null;
    }

    return data.imageUrl;
  };

  const postCorrectImage = async (url: string) => {
    const { data, systemError } = await makeRequest<{
      path: string;
      cloud_precentage: number;
    }>(`${getCorrectionServiceUrl()}/correct`, {
      method: "POST",
      body: JSON.stringify({
        path: getImageNameFromUrl(url),
      }),
    });

    if (systemError) {
      return null;
    }

    return data.path;
  };

  const postSegmentCloudsImage = async (url: string) => {
    const { data, systemError } = await makeRequest<{
      path: string;
      cloud_precentage: number;
    }>(`${getMainServiceUrl()}/segment-clouds`, {
      method: "POST",
      body: JSON.stringify({
        path: getImageNameFromUrl(url),
      }),
    });

    if (systemError) {
      return null;
    }

    return data.path;
  };

  const handleImage = async (image: Image | null): Promise<void> => {
    if (!image) {
      return;
    }

    setProcessingStatus("correction");
    setProcessedImageUrl(null);

    const normalImageUrl = await postLoadImage(image);

    if (!normalImageUrl) {
      setProcessingStatus("error");
      return;
    }

    const correctedImageUrl = await postCorrectImage(normalImageUrl);

    if (!correctedImageUrl) {
      setProcessingStatus("error");
      return;
    }

    setProcessedImageUrl(correctedImageUrl);
    setProcessingStatus("cloud-segmentation");

    const processedImageUrl = await postSegmentCloudsImage(correctedImageUrl);

    if (!processedImageUrl) {
      setProcessingStatus("error");
      return;
    }

    setProcessingStatus("processed");
    setProcessedImageUrl(processedImageUrl);
    setServerImages(await getServerImages());
  };

  const getLastImage = async () => {
    const { data, systemError } = await makeRequest<{
      path: string;
    }>(`${getCorrectionServiceUrl()}/last-image`, {
      method: "GET",
    });

    if (systemError) {
      return null;
    }

    return data.path;
  };

  const onServerImagesClick: MouseEventHandler<
    HTMLDetailsElement
  > = async () => {
    if (serverImages.length) {
      return;
    }

    setServerImages(await getServerImages());
  };

  const getImageNameFromUrl = (url: string) => {
    const splittedUrl = url.split("/");

    return splittedUrl[splittedUrl.length - 1];
  };

  const onServerImageClick: MouseEventHandler<HTMLAnchorElement> = event => {
    event.preventDefault();

    const target = event.target as HTMLAnchorElement;

    setUploadedImage({
      file: null,
      url: target.href,
    });
    setProcessedImageUrl(null);
    formRef.current.reset();
  };

  const onGetLastButtonClick = async () => {
    const maybeUrl = await getLastImage();

    if (!maybeUrl) {
      return;
    }

    setUploadedImage({
      file: null,
      url: maybeUrl,
    });
    setProcessedImageUrl(null);
    formRef.current.reset();
  };

  const getTimeFromFilename = (filename: string) => {
    const parts = filename.split("_"); // Разделяем по '_'
    const datePart = parts[parts.length - 3]; // "20250413"
    const timePart = parts[parts.length - 2]; // "133423"
    const msPart = parts[parts.length - 1].split(".")[0]; // "104666" (убираем .jpg)

    return [parseInt(datePart), parseInt(timePart), parseInt(msPart)];
  };

  return (
    <>
      <div className={styles.controls}>
        <details onClick={onServerImagesClick}>
          <summary>Есть на сервере</summary>
          {isServerImagesLoaded && serverImages.length !== 0 && (
            <p className={styles.server_image}>
              <span>0</span> <span>normal</span>| <span>corrected</span>|
              <span>processed</span>
            </p>
          )}
          {!isServerImagesLoaded && <p>Загрузка...</p>}
          {isServerImagesLoaded && (
            <>
              {serverImages.length === 0 && <p>Пока пусто ;(</p>}
              {serverImages
                .sort(({ normal: a }, { normal: b }) => {
                  const [aDate, aTime, aMs] = getTimeFromFilename(a);
                  const [bDate, bTime, bMs] = getTimeFromFilename(b);

                  // Сравниваем дату -> время -> миллисекунды
                  if (aDate !== bDate) return aDate - bDate;
                  if (aTime !== bTime) return aTime - bTime;
                  return aMs - bMs;
                })
                .map(({ normal, corrected, processed }, i) => (
                  <p className={styles.server_image} key={normal}>
                    <span>{i + 1}</span>
                    <a href={normal} onClick={onServerImageClick}>
                      {getImageNameFromUrl(normal)}
                    </a>
                    |
                    {corrected ? (
                      <a href={corrected} onClick={onServerImageClick}>
                        {getImageNameFromUrl(corrected)}
                      </a>
                    ) : (
                      <span>null</span>
                    )}
                    |
                    {processed ? (
                      <a href={processed} onClick={onServerImageClick}>
                        {getImageNameFromUrl(processed)}
                      </a>
                    ) : (
                      <span>null</span>
                    )}
                  </p>
                ))}
            </>
          )}
        </details>
        <hr />
        <form ref={formRef} className={styles.load}>
          <button type="button" onClick={onGetLastButtonClick}>
            Выгрузить последнее со спутника
          </button>
          <input
            type="file"
            name="image"
            accept="image/png, image/jpeg, image/jpg"
            onChange={onInputChange}
          />
        </form>
        <hr />
        <button type="button" onClick={() => handleImage(uploadedImage)}>
          Обработать изображение
        </button>
      </div>
      <div className={styles.images}>
        <div>
          <h2>Загруженное изображение</h2>
          <img
            src={uploadedImage?.url ?? "#"}
            id="uploaded-image"
            alt="Uploaded Image"
            width={512}
          />
        </div>
        <div>
          <h2>{getStatusText()}</h2>
          {processingStatus === "error" ? (
            <div>Упс, попробуйте снова.</div>
          ) : (
            <img
              src={processedImageUrl ?? "#"}
              id="processed-image"
              alt="Processed Image"
              width={512}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
