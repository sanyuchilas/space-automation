import { ChangeEventHandler, useState } from "react";
import styles from "./App.module.css";

type ProcessingStatus =
  | "correction"
  | "cloud-segmentation"
  | "processed"
  | "uploaded"
  | "error";

function App() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<null | string>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<null | string>(
    null,
  );
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>("uploaded");

  const onInputChange: ChangeEventHandler<HTMLInputElement> = event => {
    const [file] = event.target.files ?? [null];

    if (!file) {
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setUploadedImageUrl(imageUrl);
    setProcessedImageUrl(imageUrl);
  };

  const getStatusText = () => {
    if (!uploadedImageUrl) {
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

  return (
    <>
      <div className={styles.controls}>
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
            src={uploadedImageUrl ?? "#"}
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
