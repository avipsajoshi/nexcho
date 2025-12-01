import os
import datetime
from pymongo import MongoClient
from gridfs import GridFS
from urllib.parse import urlparse
from dotenv import load_dotenv

class FileProcessor:
    def __init__(self):
        # Load environment variables (MongoDB URI)
        load_dotenv()
        self.mongo_uri = os.getenv("MONGODB_URI")

        # Connect to MongoDB
        self.client = MongoClient(self.mongo_uri)

        # Extract DB name automatically like Mongoose
        parsed = urlparse(self.mongo_uri)
        db_name = parsed.path.lstrip("/") or "test"  # fallback "test"
        self.db = self.client[db_name]

        print(f"Connected to MongoDB Database: {db_name}")

        # Create separate GridFS buckets

        # Separate GridFS buckets for transcripts and summaries
        self.transcript_fs = GridFS(self.db, collection="uploads.transcripts")
        self.summary_fs = GridFS(self.db, collection="uploads.summaries")

    def save_text_file_to_gridfs(self, filename, content, metadata=None, file_type="transcript"):
        """
        Save text content to the correct GridFS bucket:
        file_type="transcript" → uploads/transcripts bucket
        file_type="summary" → uploads/summaries bucket
        """

        metadata = metadata or {}

        # Select appropriate bucket based on file_type
        if file_type == "transcript":
            fs = self.transcript_fs
        elif file_type == "summary":
            fs = self.summary_fs
        else:
            raise ValueError("Invalid file_type. Use 'transcript' or 'summary'.")

        file_id = fs.put(
            content.encode("utf-8"),
            filename=filename,
            contentType="text/plain",
            metadata=metadata,
            uploadDate=datetime.datetime.utcnow()
        )

        return str(file_id)

    def save_both_files(self, transcript_text, summary_text, meetingId, userId):
        """
        Saves transcript and summary in separate buckets.
        Returns their respective file IDs.
        """

        transcript_id = self.save_text_file_to_gridfs(
            filename=f"transcript_{meetingId}.txt",
            content=transcript_text,
            metadata={"meetingId": meetingId, "userId": userId},
            file_type="transcript"
        )

        summary_id = self.save_text_file_to_gridfs(
            filename=f"summary_{meetingId}.txt",
            content=summary_text,
            metadata={"meetingId": meetingId, "userId": userId},
            file_type="summary"
        )

        return {
            "transcriptFileId": transcript_id,
            "summaryFileId": summary_id
        }
