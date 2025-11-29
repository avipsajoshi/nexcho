from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import numpy as np
import base64
import cv2
from models import FacialRecognizer, AudioProcessor 

app = Flask(__name__)
CORS(app)


recognizer = FacialRecognizer()
# summarizer = Summarizer()

# Global tracking inside flask
status = ''

# @app.route('/getAttendance', methods=['POST'])
# def get_attendance():
#     global status
#     data = request.json
#     image_data = data.get('image')

#     if not image_data:
#         return jsonify({'error': 'No image provided'}), 400

#     try:
#         # image_bytes = base64.b64decode(image_data.split(',')[-1])
#         image_bytes = base64.b64decode(image_data)
#         img_array = np.frombuffer(image_bytes, np.uint8)
#         img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
#     except Exception as e:
#         return jsonify({'error': f'Failed to decode image: {str(e)}'}), 400

#     recognizer = FacialRecognizer("haar_model.npz")
#     result = recognizer.evaluate_image(img)
#     print("Image evaluation:", result)
#     status = result


#     status = recognizer.evaluate_frame(img)
#     print(f"status{status}")
#     return jsonify({
#         'status': status
#     })


# @app.route('/getSummary', methods=['GET'])
# def summarizeMeeting():

if __name__ == '__main__':
    app.run(debug=True, port = 8090)
    # get_attendance()
    processor = AudioProcessor(meeting_id="m001")
    stt_file = processor.process()
    print("Transcript saved at:", stt_file)

