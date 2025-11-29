import os
from speech_recognition import speech_recognition as sr
from moviepy.editor import AudioFileClip
def get_uploads_path_os(): 
    current_file_abs_path = os.path.abspath(__file__)
    project_root = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(current_file_abs_path)))
    )
    # 3. Join with the target folder
    uploads_dir = os.path.join(project_root, 'uploads')
    return uploads_dir

class AudioProcessor:
    def __init__(self, meeting_id):
        self.uploads_dir = get_uploads_path_os()
        self.meeting_id = meeting_id
        self.recordings_path = f"{self.uploads_dir}/recordings/recording_{meeting_id}"
        self.transcript_path = f"{self.uploads_dir}/transcriptions"
        os.makedirs(self.transcript_path, exist_ok=True)

    def extract_audio(self): 
        input_file = None

        # Check if .webm or .mp4 exists
        if os.path.exists(self.recordings_path + ".webm"):
            input_file = self.recordings_path + ".webm"
        elif os.path.exists(self.recordings_path + ".mp4"):
            input_file = self.recordings_path + ".mp4"
        else:
            raise FileNotFoundError("Recording file not found (.webm or .mp4)")

        output_audio_file = f"{self.transcript_path}/audio_{self.meeting_id}.wav"
        
        # Extract audio
        audio_clip = AudioFileClip(input_file)
        audio_clip.write_audiofile(output_audio_file, codec="pcm_s16le")
        audio_clip.close()

        return output_audio_file

    def speech_to_text(self, audio_file_path):
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_file_path) as source:
            audio_data = recognizer.record(source)

        try:
            text = recognizer.recognize_google(audio_data)
            return text
        except sr.UnknownValueError:
            return "Could not understand audio."
        except sr.RequestError as e:
            return f"Could not process request: {e}"

    def save_transcription(self, text):
        transcript_file = f"{self.transcript_path}/transcript_{self.meeting_id}.txt"
        with open(transcript_file, "w", encoding="utf-8") as f:
            f.write(text)
        return transcript_file
    
    def process(self):
        audio_file = self.extract_audio()
        transcription = self.speech_to_text(audio_file)
        transcript_file = self.save_transcription(transcription)

        if os.path.exists(audio_file):
            os.remove(audio_file)

        return transcript_file