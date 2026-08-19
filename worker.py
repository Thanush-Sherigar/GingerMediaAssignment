import pika
import psycopg2
import json
import cv2
import re
import pytesseract
from datetime import datetime

# DB Setup
DB_CONFIG = {
    "dbname": "mediadb",
    "user": "postgres",
    "password": "postgrespassword",
    "host": "localhost",
    "port": "5432"
}

def analyze_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        return False, "Could not open or read image file", None

    # Check 1: Blur Detection (Variance of Laplacian)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_blurry = bool(blur_score < 100.0)

    # Check 2: Brightness / Low-Light
    brightness_score = float(gray.mean())
    is_low_light = bool(brightness_score < 40.0)

    # Check 3: Dimension & Aspect Ratio (Screenshot detection heuristic)
    height, width, _ = image.shape
    aspect_ratio = float(width) / height
    is_suspected_screenshot = bool(width < 500 or height < 500 or aspect_ratio > 2.2)

    # Check 4: Indian License Plate Validation
    try:
        extracted_text = pytesseract.image_to_string(gray)
    except pytesseract.TesseractNotFoundError:
        extracted_text = ""
    plate_pattern = r'[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{1,2}\s?[0-9]{4}'
    is_valid_plate = bool(re.search(plate_pattern, extracted_text))

    analysis = {
        "blur_score": round(blur_score, 2),
        "is_blurry": is_blurry,
        "brightness_score": round(brightness_score, 2),
        "is_low_light": is_low_light,
        "is_suspected_screenshot": is_suspected_screenshot,
        "detected_text": extracted_text.strip(),
        "is_valid_plate_format": is_valid_plate
    }
    print(analysis)
    return True, None, analysis

def process_message(ch, method, properties, body):
    job_id = body.decode('utf-8')
    print(f"[*] Processing Job ID: {job_id}")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # Set status = PROCESSING
        cur.execute("UPDATE image_jobs SET status = %s, updated_at = %s WHERE id = %s",
                    ('PROCESSING', datetime.now(), job_id))
        conn.commit()

        # Get image path
        cur.execute("SELECT file_path FROM image_jobs WHERE id = %s", (job_id,))
        row = cur.fetchone()
        
        if not row:
            print(f"[!] Job {job_id} not found in DB.")
            return

        file_path = row[0]
        success, error_msg, metrics = analyze_image(file_path)

        if success:
            raw_response = json.dumps(metrics, indent=2)
            cur.execute("""
                UPDATE image_jobs 
                SET status = %s, analysis_results = %s, updated_at = %s 
                WHERE id = %s
            """, ('COMPLETED', raw_response, datetime.now(), job_id))
            print(f"[+] Raw analysis response for Job ID: {job_id}")
            print(raw_response)
        else:
            cur.execute("""
                UPDATE image_jobs 
                SET status = %s, failure_reason = %s, updated_at = %s 
                WHERE id = %s
            """, ('FAILED', error_msg, datetime.now(), job_id))

        conn.commit()
        print(f"[+] Completed Job ID: {job_id}")

    except Exception as e:
        conn.rollback()
        cur.execute("""
            UPDATE image_jobs 
            SET status = %s, failure_reason = %s, updated_at = %s 
            WHERE id = %s
        """, ('FAILED', str(e), datetime.now(), job_id))
        conn.commit()
        print(f"[-] Failed Job ID: {job_id} with error: {e}")

    finally:
        cur.close()
        conn.close()
        ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
    channel = connection.channel()
    channel.queue_declare(queue='image_processing_queue', durable=True)
    
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='image_processing_queue', on_message_callback=process_message)

    print('[*] Python OpenCV Worker Waiting for Messages. To exit press CTRL+C')
    channel.start_consuming()

if __name__ == '__main__':
    main()