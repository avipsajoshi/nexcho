# import os
# import speech_recognition as sr
# from moviepy import AudioFileClip
# def get_uploads_path_os(): 
#     current_file_abs_path = os.path.abspath(__file__)
#     project_root = os.path.join(
#         os.path.dirname(os.path.dirname(os.path.dirname(current_file_abs_path)))
#     )
#     # 3. Join with the target folder
#     uploads_dir = os.path.join(project_root, 'uploads')
#     return uploads_dir

# class AudioProcessor:
#     def __init__(self, meeting_id):
#         self.recognizer = sr.Recognizer()
#         self.uploads_dir = get_uploads_path_os()
#         self.meeting_id = meeting_id
#         self.recordings_path = f"{self.uploads_dir}/recordings/recording_{meeting_id}"
#         self.transcript_path = f"{self.uploads_dir}/transcriptions"
#         os.makedirs(self.transcript_path, exist_ok=True)

#     def extract_audio(self): 
#         input_file = None

#         # Check if .webm or .mp4 exists
#         if os.path.exists(self.recordings_path + ".webm"):
#             input_file = self.recordings_path + ".webm"
#         elif os.path.exists(self.recordings_path + ".mp4"):
#             input_file = self.recordings_path + ".mp4"
#         else:
#             raise FileNotFoundError("Recording file not found (.webm or .mp4)")

#         output_audio_file = f"{self.transcript_path}/audio_{self.meeting_id}.wav"
        
#         # Extract audio
#         audio_clip = AudioFileClip(input_file)
#         audio_clip.write_audiofile(output_audio_file, codec="pcm_s16le")
#         audio_clip.close()

#         return output_audio_file

#     def speech_to_text(self, audio_file_path):
#         recognizer = sr.Recognizer()
#         with sr.AudioFile(audio_file_path) as source:
#             audio_data = recognizer.record(source)

#         try:
#             text = recognizer.recognize_google(audio_data)
#             return text
#         except sr.UnknownValueError:
#             return "Could not understand audio."
#         except sr.RequestError as e:
#             return f"Could not process request: {e}"

#     def save_transcription(self, text):
#         transcript_file = f"{self.transcript_path}/transcript_{self.meeting_id}.txt"
#         with open(transcript_file, "w", encoding="utf-8") as f:
#             f.write(text)
#         return transcript_file
    
#     def process(self):
#         audio_file = self.extract_audio()
#         transcription = self.speech_to_text(audio_file)
#         transcript_file = self.save_transcription(transcription)

#         if os.path.exists(audio_file):
#             os.remove(audio_file)

#         return transcript_file
    


import os
from faster_whisper import WhisperModel
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words
from typing import Optional, Tuple


WHISPER_MODEL_SIZE = "base"
DEVICE = "cpu"
COMPUTE_TYPE = "int8"
LANGUAGE = "en"
SUMMARY_SENTENCE_COUNT = 5

def get_uploads_path_os(): 
    current_file_abs_path = os.path.abspath(__file__)
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(current_file_abs_path)), 'uploads')
    return uploads_dir

class AudioProcessor:
    def __init__(self, meeting_id: str, vidPath):
        self.uploads_dir = get_uploads_path_os()
        self.meeting_id = meeting_id
        if(vidPath != ""): self.recordings_path = f"{self.uploads_dir}/recordings"
        else: self.recordings_path = vidPath
        self.transcript_path = f"{self.uploads_dir}/transcriptions/"
        self.summary_path = f"{self.uploads_dir}/summaries/"
        os.makedirs(self.transcript_path, exist_ok=True)
        os.makedirs(self.summary_path, exist_ok=True)

    def get_input_file_path(self):
        print(self.recordings_path)
        if os.path.exists(self.recordings_path):
            input_file = self.recordings_path
            return input_file
        elif os.path.exists(self.recordings_path):
            input_file = self.recordings_path
            return input_file
        else:
            raise FileNotFoundError("Recording file not found (.webm or .mp4)")

    def faster_whisper_to_text(self, file_path: str) -> str:
        if not os.path.exists(file_path):
            return "Error: Input file not found for transcription."
        try:
            model = WhisperModel(
                WHISPER_MODEL_SIZE, 
                device=DEVICE, 
                compute_type=COMPUTE_TYPE,
                local_files_only=False
            )
            
            segments, info = model.transcribe(
                file_path, 
                beam_size=5, 
                language=LANGUAGE,
                vad_filter=True 
            )

            full_transcript = []
            for segment in segments:
                full_transcript.append(segment.text.strip())

            return " ".join(full_transcript)

        except Exception as e:
            error_message = f"Error during Whisper transcription: {e}"
            return f"Transcription Failed: {error_message}"

    def summarize_text_extractive(self, text: str, sentence_count: int) -> str:
        if not text.strip():
            return "Cannot summarize empty text."

        parser = PlaintextParser.from_string(text, Tokenizer(LANGUAGE))
        stemmer = Stemmer(LANGUAGE)
        summarizer = LsaSummarizer(stemmer)
        summarizer.stop_words = get_stop_words(LANGUAGE)

        available_sentences = len(list(parser.document.sentences))
        final_sentence_count = min(sentence_count, available_sentences)

        summary_sentences = summarizer(parser.document, final_sentence_count)
        summary = " ".join([str(sentence) for sentence in summary_sentences])
        return summary

    def save_output(self, content: str, filepath: str) -> str:
        os.makedirs(os.path.dirname(filepath) or '.', exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return filepath

    def process(self) -> Tuple[str, str]:
        input_file = self.get_input_file_path()
        if not input_file:
            return "No input file found.", "Summary generation skipped."

        transcription = self.faster_whisper_to_text(input_file)
        
        if transcription.startswith("Error") or transcription.startswith("Transcription Failed"):
            return transcription, "Summary generation failed."
        
        transcript_path = self.save_output(transcription, self.transcript_path)
        extractive_summary = self.summarize_text_extractive(transcription, SUMMARY_SENTENCE_COUNT)
        summary_path = self.save_output(extractive_summary, self.summary_path)
        
        return transcription, extractive_summary