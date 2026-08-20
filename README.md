# Ginger Media Assignment

An image-processing pipeline for checking vehicle image quality and extracting possible license-plate text.

The project has three parts:

- **Frontend:** React + Vite upload interface.
- **Backend:** Spring Boot API that stores jobs in PostgreSQL and publishes them to RabbitMQ.
- **Worker:** A separate Python process that reads RabbitMQ jobs, analyses images with OpenCV and Tesseract, and saves the results.

## Why RabbitMQ + Python worker?

We chose RabbitMQ with a small Python worker instead of an in-memory queue or a single-language application for a few practical reasons:

Better reliability: RabbitMQ keeps jobs safe even if the Java backend crashes or is restarted.
Best tool for the job: Java handles the API and database, while Python handles image processing and OCR using tools like OpenCV, Tesseract, and NumPy.
Easy to scale: We can run multiple Python workers at the same time when the workload increases.
Reliable processing: RabbitMQ supports acknowledgements, retries, and monitoring through its management UI.
Failure isolation: If image processing or Tesseract crashes, it won't bring down the main API.

In short: RabbitMQ gives us reliable and scalable job processing, while Python provides the right tools for image and OCR tasks. This keeps the system more reliable, scalable, and easier to maintain.

## How It Works

1. Select an image in the frontend.
2. The frontend sends it to `POST /api/v1/images/upload`.
3. The Spring Boot API saves the file and creates a `PENDING` job.
4. RabbitMQ sends the job ID to the Python worker.
5. The worker marks the job `PROCESSING`, analyses the image, and prints the raw JSON response in its terminal.
6. The worker stores the response in PostgreSQL and marks the job `COMPLETED` or `FAILED`.
7. The frontend polls the job and displays the results, including the expandable raw response.


## Start Supporting Services

From the `gingermedia` directory:


cd gingermedia
docker compose up -d


This starts:

- PostgreSQL on port `5432`
- RabbitMQ on port `5672`
- RabbitMQ management UI on port `15672`

The default local database settings are:


Database: mediadb
Username: postgres
Password: postgrespassword


## Install Python Dependencies

From the repository root:


python -m pip install pika psycopg2-binary opencv-python pytesseract numpy


Install Tesseract on Ubuntu/Debian:


sudo apt-get update
sudo apt-get install -y tesseract-ocr


Check the OCR installation:


tesseract --version


## Run the Backend

In a terminal:


cd gingermedia
./mvnw spring-boot:run


The API runs at `http://localhost:8080`.

## Run the Python Worker

In a second terminal from the repository root:


python worker.py


You should see:


[*] Python OpenCV Worker Waiting for Messages. To exit press CTRL+C


When a job completes, the worker prints a formatted raw response like this:


[+] Raw analysis response for Job ID: <job-id>
{
	"blur_score": 1483.27,
	"is_blurry": false,
	"brightness_score": 121.23,
	"is_low_light": false,
	"is_suspected_screenshot": false,
	"detected_text": "...",
	"is_valid_plate_format": false
}


## Run the Frontend

In a third terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

For GitHub Codespaces, the frontend automatically derives the forwarded backend URL from the forwarded frontend URL. Make sure both forwarded ports are public or accessible from your browser.

## Test with curl

Use a real image path in place of the example path:

```bash
curl -X POST http://localhost:8080/api/v1/images/upload \
	-F "file=@/path/to/test_vehicle_image.jpg"
```

The response contains a `jobId`:

```json
{
	"jobId": "a1b2c3d4-e5f6-7890-1234-56789abcdef0",
	"status": "PENDING"
}
```

Use that ID to check status:

```bash
curl http://localhost:8080/api/v1/images/<job-id>/status
```

Fetch the saved analysis:

```bash
curl http://localhost:8080/api/v1/images/<job-id>/results
```

Expected lifecycle:

```text
PENDING -> PROCESSING -> COMPLETED
```

If processing fails, the status becomes `FAILED` and `failureReason` explains why.

## Checks Performed

The worker returns:

- `blur_score` and `is_blurry`
- `brightness_score` and `is_low_light`
- `is_suspected_screenshot`
- OCR text in `detected_text`
- Indian license-plate format validation in `is_valid_plate_format`

## Troubleshooting

### `Failed to fetch` in the browser

Confirm the backend is running on port `8080`. For a hosted Codespaces frontend, confirm the forwarded `8080` port is available and refresh the page after rebuilding the frontend.

### Job remains `PENDING`

Confirm RabbitMQ is running and that `python worker.py` is active in a separate terminal.

### OCR is unavailable

Install the native `tesseract-ocr` package. The worker can still complete image-quality checks without it, but `detected_text` will be empty.

### Database connection errors

Confirm PostgreSQL is running with `docker compose ps` and that the credentials in `gingermedia/src/main/resources/application.properties` match the Docker Compose configuration.

## Stop Services

```bash
cd gingermedia
docker compose down
```

Add `-v` only when you intentionally want to delete the PostgreSQL Docker volume and all stored database data.
