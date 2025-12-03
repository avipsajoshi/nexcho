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
UPLOAD_BASE_DIR = './uploads'
# recognizer = FacialRecognizer()
# summarizer = Summarizer()

# Global tracking inside flask
status = ''

# @app.route('/getAttendance', methods=['POST'])
# def get_attendance():
#     logging.debug("hit get attendacn api ml")
#     print("hit get attendance api")
#     model_path = "mlmodels/haar_model.npz"
#     recognizer = FacialRecognizer()
#     positiveCounter = 0 
#     negativeCounter = 0
#     semipositiveCounter = 0
#     prevStatus = ''


#  # 1. Receive and Parse JSON Payload
#     try:
#         # Flask automatically parses the JSON body if Content-Type is application/json
#         data: Dict[str, Any] = request.json
#     except Exception as e:
#         return jsonify({"error": f"Invalid JSON payload: {e}"}), 400

#     # The Node.js `attendance.js` sends: userId, meetingId, and images
#     if not data or 'images' not in data or 'userId' not in data or 'meetingId' not in data:
#         return jsonify({"error": "Missing required fields: 'userId', 'meetingId', or 'images' array in payload."}), 400

#     user_id: str = data.get('userId')
#     meeting_id: str = data.get('meetingId')
#     image_list: List[str] = data.get('images', [])
    
#     # print(f"Received {len(image_list)} screenshots for User: {user_id} in Meeting: {meeting_id}")
    
#     total_images = len(image_list)
    
#     # Initialize metrics for the single user being processed (based on user's logic)
#     user_metrics: Dict[str, Any] = {
#         'positive': 0, 
#         'negative': 0, 
#         'semipositive': 0,
#         'prevStatus': '', 
#         'semipositive_buffer': 0
#     }
    
#     current_metrics = user_metrics
    
#     # 2. Iterate, Decode, and Process Images
#     for i, base64_string in enumerate(image_list):
        
#         try:
#             # --- 2a. Decode Base64 and Convert to OpenCV format ---
            
#             # The Node.js app sends the clean base64 string without the prefix
#             image_binary_data = base64.b64decode(base64_string)
            
#             # Convert binary data to a NumPy array for OpenCV (cv2) processing
#             img_array = np.frombuffer(image_binary_data, np.uint8)
#             # cv2.IMREAD_COLOR attempts to decode the image format (PNG, JPG, etc.)
#             img_cv2 = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

#             if img_cv2 is None:
#                 raise ValueError("Could not decode image data from binary buffer.")
            
#             status = recognizer.evaluate_frame(img_cv2)
            
#             # Track status changes and buffer
#             if status == 'semi-positive' and current_metrics['prevStatus'] == 'semi-positive':
#                 current_metrics['semipositive_buffer'] += 1
#                 current_metrics['semipositive'] += 1  
#             elif status == 'positive': 
#                 current_metrics['positive'] += 1
#             elif status == 'negative': 
#                 current_metrics['negative'] += 1
                
            
#             if current_metrics['semipositive_buffer'] >= 17:
#                 current_metrics['positive'] += 1
#                 current_metrics['semipositive_buffer'] = 0
            
#             current_metrics['prevStatus'] = status 
            
#             print(f" -> Image {i+1} for User {user_id} processed. Status: {status}, Total P={current_metrics['positive']}")

#         except Exception as e:
#             print(f"Error decoding or processing image {i} for user {user_id}: {e}")
#             current_metrics['negative'] += 1 # Assume error means negative status for this image
#             continue
    
#     # 3. Compile the Final ML Result (matching the expected Node.js structure)
#     ml_result = {
#         "positive": current_metrics['positive'],
#         "negative": current_metrics['negative'],
#         "semipositive": current_metrics['semipositive'],
#         # Send the final status back, or 'N/A' if the array was empty
#         "prevStatus": current_metrics['prevStatus'] if current_metrics['prevStatus'] else "N/A", 
#         "total_processed": total_images
#     }
    
#     print(f"ML Processing complete for {user_id}. Result: {ml_result}")

#     # 4. Send the Response
#     return jsonify(ml_result), 200


#     # data: Dict[str, Any] = request.json()

#     # # meeting_id = request.json.get('meeting')
#     # # user_ids = request.json.get('userIds', [])
#     # meeting_id: str = data.get('meeting')
#     # user_ids: List[str] = data.get('userIds', [])
#     # if not meeting_id:
#     #     return jsonify({
#     #         'error': 'Missing required field: "meeting" ID is mandatory.'
#     #     }), 400
    
    
#     # meeting_dir_path = os.path.join(UPLOAD_BASE_DIR, 'images', meeting_id)
#     # if not os.path.isdir(meeting_dir_path):
#     #     return jsonify({
#     #         'error': f'Meeting directory not found: {meeting_dir_path}'
#     #     }), 404
    
#     # attendance_results = {}
#     # user_metrics = {}
#     # print(f"Processing Images in Directory: {meeting_dir_path}")

#     # for filename in os.listdir(meeting_dir_path):
#     #     if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
#     #         print(f"Skipping non-image file: {filename}")
#     #         continue

#     #     file_path = os.path.join(meeting_dir_path, filename)
#     #     try:
#     #         base_name = os.path.splitext(filename)[0]
#     #         user_id = base_name.split('_')[0] 
            
#     #         if not user_id:
#     #              raise ValueError("User ID part is empty after splitting.")

#     #         if user_id not in user_ids:
#     #             print(f"Skipping file {filename}: User ID '{user_id}' not requested by frontend.")
#     #             continue

#     #     except Exception as e:
#     #         print(f"Warning: Could not parse user ID from filename {filename}. Skipping. Error: {e}")
#     #         continue
        
#     #     try:
#     #         # 5. Read and decode the base64 image data
#     #         with open(file_path, 'r', encoding='utf-8') as f:
#     #             image_base64_string = f.read()

#     #         if ',' in image_base64_string:
#     #             image_base64_string = image_base64_string.split(',')[1]

#     #         image_bytes = base64.b64decode(image_base64_string)
#     #         img_array = np.frombuffer(image_bytes, np.uint8)
#     #         img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

#     #         if img is None:
#     #             print(f"Error: Could not decode image data from base64 string in file {filename}")
#     #             continue
            
#     #         if user_id not in user_metrics:
#     #             user_metrics[user_id] = {
#     #                 'positive': 0, 
#     #                 'negative': 0, 
#     #                 'semipositive': 0,
#     #                 'prevStatus': '', 
#     #                 'semipositive_buffer': 0
#     #             }

#     #         current_metrics = user_metrics[user_id]
 
#     #         status = recognizer.evaluate_frame(img)
             
#     #         if status == 'semi-positive' and current_metrics['prevStatus'] == 'semi-positive':
#     #             current_metrics['semipositive_buffer'] += 1
#     #             current_metrics['semipositive'] += 1  
#     #         elif status == 'positive': 
#     #             current_metrics['positive'] += 1
#     #         elif status == 'negative': 
#     #             current_metrics['negative'] += 1
            
#     #         if current_metrics['semipositive_buffer'] >= 17:
#     #             current_metrics['positive'] += 1
#     #             current_metrics['semipositive_buffer'] = 0
            
#     #         current_metrics['prevStatus'] = status 
            
#     #         print(f"  -> User {user_id} processed. Status: {status}, Total P={current_metrics['positive']}")

#     #     except Exception as e:
#     #         print(f"Error processing image {filename}: {str(e)}")
#     #         continue
 
#     # attendance_results = {}
#     # for user_id, metrics in user_metrics.items(): 
#     #     attendance_results[user_id] = {
#     #         'positive': metrics['positive'],
#     #         'negative': metrics['negative'], 
#     #         'semipositive': metrics['semipositive'],  
#     #         # 'prevStatus': metrics['prevStatus'] 
#     #     }

#     # # result = recognizer.evaluate_image(img)
#     # # print("Image evaluation:", result)
#     # # status = result 

#     # return jsonify(attendance_results)
    

# @app.route('/getSummary', methods=['POST'])
def summarizeMeeting(meeting_id):
    logging.debug("hit get attendacn api ml")
    print("hit summarize meeting api")
    meeting_id = request.json.get('meeting')
    vid_path = saveVideo(meeting_id)
    audio = AudioProcessor(meeting_id)
    trans,summ = audio.process()
    summarizer = Summarizer(meeting_id)
    # summ = summarizer.process()
    # Clean up local file
    os.remove(vid_path)
    update_url = f"{backend}/api/v1/file/save_texts" 
    response = requests.post(update_url, json={
        "meetingId": meeting_id,
        "transcript": trans,
        "summary": summ
    })
    
    response.raise_for_status()
    print("Transcription and summary successfully sent back to main server.")

    return response.json()


if __name__ == '__main__':
    port = int(os.getenv("PORT", 8000))
    app.run(debug=True, port = port)
    # app.run(host="0.0.0.0", port=port)
    # app.run(host="127.0.0.1", port=port)



def saveVideo(file_id: str):
    """
    Downloads video stream from Node.js
    """
    stream_url = f"{backend}/api/v1/file/video/stream/{file_id}"
    
    # 1. Download/Receive the video stream
    with requests.get(stream_url, stream=True) as r:
        r.raise_for_status()
        
        # NOTE: For very large files, save to disk immediately for processing
        temp_video_path = f"{UPLOAD_BASE_DIR}/{OUTPUT_DIR}/{file_id}.webm"
        with open(temp_video_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                
    print(f"Video saved to {temp_video_path}. Starting processing...")
    return temp_video_path
    