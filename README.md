# Ginger Media Assignment

An image-processing pipeline for checking vehicle image quality and extracting possible license-plate text.

The project has three parts:

- **Frontend:** React + Vite upload interface.
- **Backend:** Spring Boot API that stores jobs in PostgreSQL and publishes them to RabbitMQ.
- **Worker:** A separate Python process that reads RabbitMQ jobs, analyses images with OpenCV and Tesseract, and saves the results.

## Why RabbitMQ + Python worker?

We chose RabbitMQ plus a small Python worker process rather than an in-memory queue or a single-language monolith for a few practical reasons:

- Decoupling and resilience: a message broker isolates the web/API process from long-running CPU-bound image analysis. If the backend crashes or is redeployed, queued jobs remain safe in RabbitMQ instead of being lost with an in-memory queue.
- Language fit: Python has a rich ecosystem for image processing and OCR (OpenCV, pytesseract, NumPy) and is fast to iterate on for this kind of task. Keeping the backend in Java for API/DB concerns and the worker in Python lets each part use the best tool for the job.
- Scalability: RabbitMQ makes it easy to run multiple workers in parallel to consume jobs when throughput increases. An in-memory queue tied to a single process can't be shared between machines or containers without additional work.
- Observability & delivery guarantees: RabbitMQ provides delivery acknowledgements, retries, and a management UI for monitoring queues. Implementing similar guarantees correctly in an in-memory queue or ad-hoc retry logic is error-prone.
- Failure isolation: heavy image analysis and native dependencies (like Tesseract) can be kept outside the API process so worker crashes, memory growth, or native package issues don't bring down the whole service.

In short: using RabbitMQ plus a small Python worker gives us durability, easier scaling, safer operations, and the ability to use Python's strong image/OCR tooling without forcing the entire project into a single language or single process.

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
