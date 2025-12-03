import cv2
import numpy as np

class FacialRecognizer:
    # def __init__(self, model_path=None):
    #     self.strong_classifier = []
    #     self.haar_features = []
    #     if model_path:
    #         self.load_model(model_path)

    def load_model(self, npz_path):
        data = np.load(npz_path, allow_pickle=True)
        self.strong_classifier = data['classifier'].tolist()
        self.haar_features = data['features'].tolist()

    def evaluate_image(self, image_path, window_size=(64, 64), step=10):
        if self.strong_classifier is None or self.haar_features is None:
            self.load_model('mlmodels/haar_model.npz')
            # raise ValueError("Model not loaded. Call load_model() first.")

        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        rows, cols = img.shape

        face_found = False
        # Sliding window check
        for y in range(0, rows - window_size[1] + 1, step):
            for x in range(0, cols - window_size[0] + 1, step):
                bbox = (x, y, x + window_size[0], y + window_size[1])
                features = self.extract_features_from_image(img, bbox)
                pred = self.predict_with_adaboost(features)
                if pred == 1:
                    face_found = True
                    break
            if face_found:
                break
        
        avg_intensity = np.mean(img)
        if face_found and  avg_intensity > 151: 
            return "semi-positive"

        if face_found:
            return "positive"

        return "negative"


    def integral_image_optimized(self, image):
        rows, cols = image.shape
        integral_image = np.zeros((rows + 1, cols + 1), dtype=np.int32)

        for r in range(1, rows + 1):
            for c in range(1, cols + 1):
                integral_image[r, c] = (
                    image[r - 1, c - 1] +
                    integral_image[r - 1, c] +
                    integral_image[r, c - 1] -
                    integral_image[r - 1, c - 1]
                )
        return integral_image

    def predict_with_adaboost(self, features):
        total = 0
        for weak_clf in self.strong_classifier:
            idx = weak_clf['feature_idx']
            theta = weak_clf['threshold']
            polarity = weak_clf['polarity']
            alpha = weak_clf['alpha']

            pred = 1 if polarity * features[idx] < polarity * theta else -1
            total += alpha * pred
        return 1 if total >= 0 else 0  # 1 = face, 0 = no face

    def extract_features_from_image(self, img, bbox):
        x1, y1, x2, y2 = bbox
        crop = img[y1:y2, x1:x2]
        resized = cv2.resize(crop, (24, 24))

        ii = self.integral_image_optimized(resized)

        features = []
        for feature in self.haar_features:
            val = 0
            for (x, y, w, h, polarity) in feature['rects']:
                A = ii[y, x]
                B = ii[y, x + w]
                C = ii[y + h, x]
                D = ii[y + h, x + w]
                val += polarity * (D - B - C + A)
            features.append(val)
        return np.array(features)

 
    def evaluate_frame(self, img):
        self.load()
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            return "negative"

        for (x, y, w, h) in faces:
            roi_gray = gray[y:y + h, x:x + w]
            eyes = self.eye_cascade.detectMultiScale(roi_gray)
            if len(eyes) > 0:
                return "positive"
            else:
                return "semi-positive"

        return "negative"

    def load(self, face_cascade_path='./classifiers/haarcascade_frontalface_default.xml',
                 eye_cascade_path='./classifiers/haarcascade_eye.xml'):
        self.face_cascade = cv2.CascadeClassifier(face_cascade_path)
        self.eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
    