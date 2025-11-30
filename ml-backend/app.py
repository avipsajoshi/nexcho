from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import numpy as np
import base64
import cv2
import os
from models.FacialRecognizer import FacialRecognizer
from models.Summarizer import Summarizer
from models.AudioProcessor import AudioProcessor

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": [
        "https://nexcho-frontend.onrender.com",
        "http://localhost:3000",
        "https://nexcho-backend.onrender.com",
        "http://localhost:5000",
    ]}}
)

UPLOAD_BASE_DIR = './uploads'
recognizer = FacialRecognizer()
# summarizer = Summarizer()

# Global tracking inside flask
status = ''

@app.route('/getAttendance', methods=['POST'])
def get_attendance():
    model_path = "mlmodels/haar_model.npz"
    recognizer = FacialRecognizer(model_path)
    positiveCounter = 0 
    negativeCounter = 0
    semipositiveCounter = 0
    prevStatus = ''

    meeting_id = request.json.get('meeting')
    user_ids = request.json.get('userIds', [])
    if not meeting_id:
        return jsonify({
            'error': 'Missing required field: "meeting" ID is mandatory.'
        }), 400
    
    
    meeting_dir_path = os.path.join(UPLOAD_BASE_DIR, 'images', meeting_id)
    if not os.path.isdir(meeting_dir_path):
        return jsonify({
            'error': f'Meeting directory not found: {meeting_dir_path}'
        }), 404
    
    attendance_results = {}
    user_metrics = {}
    print(f"Processing Images in Directory: {meeting_dir_path}")

    for filename in os.listdir(meeting_dir_path):
        if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            print(f"Skipping non-image file: {filename}")
            continue

        file_path = os.path.join(meeting_dir_path, filename)
        try:
            base_name = os.path.splitext(filename)[0]
            user_id = base_name.split('_')[0] 
            
            if not user_id:
                 raise ValueError("User ID part is empty after splitting.")

            if user_id not in user_ids:
                print(f"Skipping file {filename}: User ID '{user_id}' not requested by frontend.")
                continue

        except Exception as e:
            print(f"Warning: Could not parse user ID from filename {filename}. Skipping. Error: {e}")
            continue
        
        try:
            # 5. Read and decode the base64 image data
            with open(file_path, 'r', encoding='utf-8') as f:
                image_base64_string = f.read()

            if ',' in image_base64_string:
                image_base64_string = image_base64_string.split(',')[1]

            image_bytes = base64.b64decode(image_base64_string)
            img_array = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if img is None:
                print(f"Error: Could not decode image data from base64 string in file {filename}")
                continue
            
            if user_id not in user_metrics:
                user_metrics[user_id] = {
                    'positive': 0, 
                    'negative': 0, 
                    'semipositive': 0,
                    'prevStatus': '', 
                    'semipositive_buffer': 0
                }

            current_metrics = user_metrics[user_id]
 
            status = recognizer.evaluate_frame(img)
             
            if status == 'semi-positive' and current_metrics['prevStatus'] == 'semi-positive':
                current_metrics['semipositive_buffer'] += 1
                current_metrics['semipositive'] += 1  
            elif status == 'positive': 
                current_metrics['positive'] += 1
            elif status == 'negative': 
                current_metrics['negative'] += 1
            
            if current_metrics['semipositive_buffer'] >= 17:
                current_metrics['positive'] += 1
                current_metrics['semipositive_buffer'] = 0
            
            current_metrics['prevStatus'] = status 
            
            print(f"  -> User {user_id} processed. Status: {status}, Total P={current_metrics['positive']}")

        except Exception as e:
            print(f"Error processing image {filename}: {str(e)}")
            continue
 
    attendance_results = {}
    for user_id, metrics in user_metrics.items(): 
        attendance_results[user_id] = {
            'positive': metrics['positive'],
            'negative': metrics['negative'], 
            'semipositive': metrics['semipositive'],  
            'prevStatus': metrics['prevStatus'] 
        }

    # result = recognizer.evaluate_image(img)
    # print("Image evaluation:", result)
    # status = result 

    return jsonify(attendance_results)
    

@app.route('/getSummary', methods=['POST'])
def summarizeMeeting():
    meeting_id = request.json.get('meeting')
    audio = AudioProcessor(meeting_id)
    transcriptFile = audio.process()

    summarizer = Summarizer(meeting_id)

    return jsonify()


if __name__ == '__main__':
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
    # app.run(debug=True, port = 8090)

