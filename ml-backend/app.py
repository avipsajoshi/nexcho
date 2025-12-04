from flask import Flask, request, Response, jsonify
from typing import Dict, Any, List
from flask_cors import CORS
import numpy as np
import base64
import cv2
import os
from models.FacialRecognizer import FacialRecognizer
from models.Summarizer import Summarizer
from models.AudioProcessor import AudioProcessor
import logging
app = Flask(__name__)
CORS(app)
backend = os.getenv("NODE_SERVER_URL")
OUTPUT_DIR = "temp_video_files"
UPLOAD_BASE_DIR = './uploads/recordings'
# Global tracking inside flask
status = ''
if not os.path.exists(UPLOAD_BASE_DIR):
    # Use os.makedirs with exist_ok=True to create all intermediate directories
    os.makedirs(UPLOAD_BASE_DIR, exist_ok=True)
    print(f"Created directory: {UPLOAD_BASE_DIR}")

    
@app.route('/getAttendance', methods=['POST'])
def get_attendance():
    logging.debug("hit get attendacn api ml")
    print("hit get attendance api")
    model_path = "mlmodels/haar_model.npz"
    recognizer = FacialRecognizer()
    positiveCounter = 0 
    negativeCounter = 0
    semipositiveCounter = 0
    prevStatus = ''


    # 1. Receive and Parse JSON Payload
    try:
        # Flask automatically parses the JSON body if Content-Type is application/json
        data: Dict[str, Any] = request.json
    except Exception as e:
        return jsonify({"error": f"Invalid JSON payload: {e}"}), 400

    # The Node.js `attendance.js` sends: userId, meetingId, and images
    if not data or 'images' not in data or 'userId' not in data or 'meetingId' not in data:
        return jsonify({"error": "Missing required fields: 'userId', 'meetingId', or 'images' array in payload."}), 400

    user_id: str = data.get('userId')
    meeting_id: str = data.get('meetingId')
    image_list: List[str] = data.get('images', [])
    
    # print(f"Received {len(image_list)} screenshots for User: {user_id} in Meeting: {meeting_id}")
    
    total_images = len(image_list)
    
    # Initialize metrics for the single user being processed (based on user's logic)
    user_metrics: Dict[str, Any] = {
        'positive': 0, 
        'negative': 0, 
        'semipositive': 0,
        'prevStatus': '', 
        'semipositive_buffer': 0
    }
    
    current_metrics = user_metrics
    
    # 2. Iterate, Decode, and Process Images
    for i, base64_string in enumerate(image_list):
        
        try:
            # --- 2a. Decode Base64 and Convert to OpenCV format ---
            
            # The Node.js app sends the clean base64 string without the prefix
            image_binary_data = base64.b64decode(base64_string)
            
            # Convert binary data to a NumPy array for OpenCV (cv2) processing
            img_array = np.frombuffer(image_binary_data, np.uint8)
            # cv2.IMREAD_COLOR attempts to decode the image format (PNG, JPG, etc.)
            img_cv2 = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if img_cv2 is None:
                raise ValueError("Could not decode image data from binary buffer.")
            
            status = recognizer.evaluate_frame(img_cv2)
            
            # Track status changes and buffer
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
            
            print(f" -> Image {i+1} for User {user_id} processed. Status: {status}, Total P={current_metrics['positive']}")

        except Exception as e:
            print(f"Error decoding or processing image {i} for user {user_id}: {e}")
            current_metrics['negative'] += 1 # Assume error means negative status for this image
            continue
    
    # 3. Compile the Final ML Result (matching the expected Node.js structure)
    ml_result = {
        "positive": current_metrics['positive'],
        "negative": current_metrics['negative'],
        "semipositive": current_metrics['semipositive'],
        # Send the final status back, or 'N/A' if the array was empty
        "prevStatus": current_metrics['prevStatus'] if current_metrics['prevStatus'] else "N/A", 
        "total_processed": total_images
    }
    
    print(f"ML Processing complete for {user_id}. Result: {ml_result}")

    # 4. Send the Response
    return jsonify(ml_result), 200
    
@app.route('/summarize', methods=['POST'])
def summariseMeeting():
    print("Python /summarize hit")

    # Get meetingId from form-data
    meeting_id = request.form.get("meetingId")
    if not meeting_id:
        return jsonify({"error": "meetingId missing"}), 400

    print(f"Processing meetingId: {meeting_id}")

    # Get video path from uploaded file (optional, if you want to use uploaded file instead of saveVideo)
    video_file = request.files.get("video")
    if video_file:
        video_path = os.path.join(UPLOAD_BASE_DIR, f"{meeting_id}.webm")
        video_file.save(video_path)
    else:
        # fallback if video not sent, use your saveVideo function
        video_path = saveVideo(meeting_id)
    print(f"Video saved: {video_path}")
    audio = AudioProcessor(meeting_id, video_path)
    transcript, summary = audio.process()

    # Clean temporary file
    if os.path.exists(video_path):
        os.remove(video_path)

    # # Send transcript & summary back to Node.js backend
    # update_url = f"{backend}/api/v1/file/save_texts"
    # response = requests.post(update_url, json={
    
    summary_result={
        "meetingId": meeting_id,
        "transcript": transcript,
        "summary": summary
    }
    return jsonify(summary_result), 200


if __name__ == '__main__':
    port = int(os.getenv("PORT", 8000))
    # app.run(host="0.0.0.0", port=port)
    # app.run(host="127.0.0.1", port=port)
    # app.run() #production
    app.run(debug=True, port = port)



def saveVideo(file_id: str):
    """
    Downloads video stream from Node.js
    """
    vid_path = ""
    try:
        stream_url = f"{backend}/api/v1/file/video/stream/{file_id}"
        with requests.get(stream_url, stream=True) as r:
            r.raise_for_status()  # will raise HTTPError if status != 200
            
            temp_video_path = f"{UPLOAD_BASE_DIR}/{OUTPUT_DIR}/{file_id}.webm"
            with open(temp_video_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
                    
            print(f"Video saved to {temp_video_path}. Starting processing...")
            vid_path = temp_video_path
            
    except requests.RequestException as e:
        print(f"Video download failed: {e}")
        vid_path = ""  # mark as failed
    
    return vid_path
    