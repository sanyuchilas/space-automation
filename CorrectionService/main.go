package main

import (
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"log"
	"math"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// adjustColors корректирует цвета изображения, приводя среднюю яркость к общему уровню.
func adjustColors(img image.Image) *image.RGBA {
	bounds := img.Bounds()
	corrected := image.NewRGBA(bounds)

	var sumR, sumG, sumB float64
	var count float64

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			sumR += float64(r >> 8)
			sumG += float64(g >> 8)
			sumB += float64(b >> 8)
			count++
		}
	}

	if count == 0 {
		return corrected
	}

	avgR := sumR / count
	avgG := sumG / count
	avgB := sumB / count
	avgLight := (avgR + avgG + avgB) / 3

	scaleR := avgLight / avgR
	scaleG := avgLight / avgG
	scaleB := avgLight / avgB

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()
			newR := uint8(math.Min(float64(r>>8)*scaleR, 255))
			newG := uint8(math.Min(float64(g>>8)*scaleG, 255))
			newB := uint8(math.Min(float64(b>>8)*scaleB, 255))
			corrected.Set(x, y, color.RGBA{newR, newG, newB, uint8(a >> 8)})
		}
	}
	return corrected
}

// whiteBalance выполняет коррекцию баланса белого изображения с заданным масштабом.
func whiteBalance(img image.Image, scale float64) *image.RGBA {
	bounds := img.Bounds()
	corrected := image.NewRGBA(bounds)

	var sumR, sumG, sumB float64
	var count float64

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			sumR += float64(r >> 8)
			sumG += float64(g >> 8)
			sumB += float64(b >> 8)
			count++
		}
	}

	if count == 0 {
		return corrected
	}

	avgR := sumR / count
	avgG := sumG / count
	avgB := sumB / count
	maxAvg := math.Max(avgR, math.Max(avgG, avgB))
	scaleR := (maxAvg + (scale/100.0 * maxAvg)) / avgR
	scaleG := (maxAvg + (scale/100.0 * maxAvg)) / avgG
	scaleB := (maxAvg + (scale/100.0 * maxAvg)) / avgB

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()
			newR := uint8(math.Min(float64(r>>8)*scaleR, 255))
			newG := uint8(math.Min(float64(g>>8)*scaleG, 255))
			newB := uint8(math.Min(float64(b>>8)*scaleB, 255))
			corrected.Set(x, y, color.RGBA{newR, newG, newB, uint8(a >> 8)})
		}
	}
	return corrected
}

// processImage выполняет декодирование, обработку и сохранение изображения.
func processImage(localFilePath, processedFolderPath string) error {
	file, err := os.Open(localFilePath)
	if err != nil {
		return fmt.Errorf("ошибка открытия изображения: %w", err)
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return fmt.Errorf("ошибка декодирования изображения: %w", err)
	}

	balanced := whiteBalance(img, -30)
	corrected := adjustColors(balanced)

	outputFileName := "processed_" + filepath.Base(localFilePath)
	outputFilePath := filepath.Join(processedFolderPath, outputFileName)
	out, err := os.Create(outputFilePath)
	if err != nil {
		return fmt.Errorf("ошибка создания выходного файла: %w", err)
	}
	defer out.Close()

	if err := jpeg.Encode(out, corrected, nil); err != nil {
		return fmt.Errorf("ошибка сохранения обработанного изображения: %w", err)
	}

	log.Printf("Обработанное изображение сохранено: %s", outputFilePath)
	return nil
}

// downloadFile загружает файл с SFTP-сервера по указанным путям.
func downloadFile(sftpClient *sftp.Client, remoteFilePath, localFilePath string) error {
	remoteFile, err := sftpClient.Open(remoteFilePath)
	if err != nil {
		return fmt.Errorf("ошибка открытия файла %s: %w", remoteFilePath, err)
	}
	defer remoteFile.Close()

	localFile, err := os.Create(localFilePath)
	if err != nil {
		return fmt.Errorf("ошибка создания локального файла %s: %w", localFilePath, err)
	}
	defer localFile.Close()

	if _, err = io.Copy(localFile, remoteFile); err != nil {
		return fmt.Errorf("ошибка скачивания файла %s: %w", remoteFilePath, err)
	}

	log.Printf("Файл скачан: %s", localFilePath)
	return nil
}

// setupSFTP устанавливает SFTP-соединение с сервером.
func setupSFTP(host string, port int, user, password string) (*sftp.Client, error) {
	config := &ssh.ClientConfig{
		User: user,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}
	conn, err := ssh.Dial("tcp", fmt.Sprintf("%s:%d", host, port), config)
	if err != nil {
		return nil, fmt.Errorf("ошибка подключения к SSH: %w", err)
	}
	// Важно: SSH-соединение будет закрыто при закрытии SFTP-клиента.
	sftpClient, err := sftp.NewClient(conn)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("ошибка открытия SFTP-сессии: %w", err)
	}
	return sftpClient, nil
}

func main() {
	// Загружаем переменные окружения из файла .env
	if err := godotenv.Load(); err != nil {
		log.Print("Файл .env не найден")
	}

	// Параметры подключения SFTP и пути хранятся в переменных окружения
	host := os.Getenv("SFTP_HOST")
	port := 22 // При необходимости можно вынести в .env и распарсить
	user := os.Getenv("SFTP_USER")
	password := os.Getenv("SFTP_PASSWORD")
	remoteFolderPath := os.Getenv("SFTP_REMOTE_FOLDER")
	localFolderPath := os.Getenv("LOCAL_FOLDER")
	processedFolderPath := os.Getenv("PROCESSED_FOLDER")

	// Создание необходимых директорий, если их нет
	for _, folder := range []string{localFolderPath, processedFolderPath} {
		if _, err := os.Stat(folder); os.IsNotExist(err) {
			if err := os.MkdirAll(folder, os.ModePerm); err != nil {
				log.Fatalf("Ошибка создания папки %s: %v", folder, err)
			}
		}
	}

	sftpClient, err := setupSFTP(host, port, user, password)
	if err != nil {
		log.Fatalf("Ошибка настройки SFTP: %v", err)
	}
	defer sftpClient.Close()

	files, err := sftpClient.ReadDir(remoteFolderPath)
	if err != nil {
		log.Fatalf("Ошибка чтения содержимого папки %s: %v", remoteFolderPath, err)
	}

	// Используем горутины и WaitGroup для параллельной обработки файлов.
	// Семофор (канал sem) ограничивает число одновременных горутин.
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5) // максимум 5 параллельных задач

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(fileName string) {
			defer wg.Done()
			defer func() { <-sem }()
			remoteFilePath := filepath.Join(remoteFolderPath, fileName)
			localFilePath := filepath.Join(localFolderPath, fileName)

			if err := downloadFile(sftpClient, remoteFilePath, localFilePath); err != nil {
				log.Printf("Ошибка загрузки файла %s: %v", remoteFilePath, err)
				return
			}

			if err := processImage(localFilePath, processedFolderPath); err != nil {
				log.Printf("Ошибка обработки изображения %s: %v", localFilePath, err)
			}
		}(file.Name())
	}

	wg.Wait()
	log.Println("Все файлы обработаны.")
}
