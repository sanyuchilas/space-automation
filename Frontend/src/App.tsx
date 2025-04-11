import { ChangeEventHandler, MouseEventHandler, useState } from "react";
import styles from "./App.module.css";
import { getMainServiceUrl, makeRequest } from "@/shared";

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

  const onServerImagesClick: MouseEventHandler<
    HTMLDetailsElement
  > = async () => {
    if (serverImages.length) {
      return;
    }

    setServerImages(await getServerImages());
  };

  const getServerImageName = (url: string) => {
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
  };

  return (
    <>
      <div className={styles.controls}>
        <details onClick={onServerImagesClick}>
          <summary>Есть на сервере</summary>
          {isServerImagesLoaded && (
            <p className={styles.server_image}>
              <span>0</span> <span>normal</span>| <span>corrected</span>|
              <span>processed</span>
            </p>
          )}
          {!isServerImagesLoaded && <p>Загрузка...</p>}
          {isServerImagesLoaded &&
            serverImages.map(({ normal, corrected, processed }, i) => (
              <p className={styles.server_image} key={normal}>
                <span>{i + 1}</span>
                <a href={normal} onClick={onServerImageClick}>
                  {getServerImageName(normal)}
                </a>
                |
                {corrected ? (
                  <a href={corrected} onClick={onServerImageClick}>
                    {getServerImageName(corrected)}
                  </a>
                ) : (
                  <span>null</span>
                )}
                |
                {processed ? (
                  <a href={processed} onClick={onServerImageClick}>
                    {getServerImageName(processed)}
                  </a>
                ) : (
                  <span>null</span>
                )}
              </p>
            ))}
        </details>
        <hr />
        <div className={styles.load}>
          <button type="button">Выгрузить последнее со спутника</button>
          <input
            type="file"
            name="image"
            accept="image/png, image/jpeg"
            onChange={onInputChange}
          />
        </div>
        <hr />
        <button type="button">Обработать изображение</button>
      </div>
      <div className={styles.images}>
        <div>
          <h2>Загруженное изображение</h2>
          <img
            src={uploadedImage?.url ?? "#"}
            id="uploaded-image"
            alt="Uploaded Image"
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
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
