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
    def __init__(self, meeting_id: str, video_path: str):
        self.meeting_id = meeting_id
        self.video_path = video_path  

        self.uploads_dir = get_uploads_path_os()
        self.transcript_path = os.path.join(self.uploads_dir, "transcriptions", f"{meeting_id}.txt")
        self.summary_path = os.path.join(self.uploads_dir, "summaries", f"{meeting_id}.txt")

        os.makedirs(os.path.dirname(self.transcript_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.summary_path), exist_ok=True)

    def get_input_file_path(self):
        print("Using input file:", self.video_path)
        if not os.path.isfile(self.video_path):
            raise FileNotFoundError(f"Video file not found: {self.video_path}")
        return self.video_path

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

            return " ".join(segment.text.strip() for segment in segments)

        except Exception as e:
            return f"Transcription Failed: Error during Whisper transcription: {e}"

    def summarize_text_extractive(self, text: str, sentence_count: int) -> str:
        if not text.strip():
            return "Cannot summarize empty text."

        parser = PlaintextParser.from_string(text, Tokenizer(LANGUAGE))
        stemmer = Stemmer(LANGUAGE)
        summarizer = LsaSummarizer(stemmer)
        summarizer.stop_words = get_stop_words(LANGUAGE)

        available_sentences = len(list(parser.document.sentences))
        final_count = min(sentence_count, available_sentences)

        summary_sentences = summarizer(parser.document, final_count)
        return " ".join(str(sentence) for sentence in summary_sentences)

    def save_output(self, content: str, filepath: str) -> str:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return filepath

    def process(self) -> Tuple[str, str]:
        input_file = self.get_input_file_path()

        transcription = self.faster_whisper_to_text(input_file)

        if transcription.startswith("Error") or transcription.startswith("Transcription Failed"):
            return transcription, "Summary generation failed."

        self.save_output(transcription, self.transcript_path)
        summary = self.summarize_text_extractive(transcription, SUMMARY_SENTENCE_COUNT)
        self.save_output(summary, self.summary_path)

        return transcription, summary
