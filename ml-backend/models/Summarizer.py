import os
def get_uploads_path_os(): 
	current_file_abs_path = os.path.abspath(__file__)
	project_root = os.path.join(
		os.path.dirname(os.path.dirname(os.path.dirname(current_file_abs_path)))
	)
	# 3. Join with the target folder
	uploads_dir = os.path.join(project_root, 'uploads')
	return uploads_dir

class Summarizer:
	def __init__(self, meeting_id):
		self.uploads_dir = get_uploads_path_os()
		self.meeting_id = meeting_id
		self.transcript_path = f"{self.uploads_dir}/transcriptions/transcript_{meeting_id}.txt"
		self.summary_path = f"{self.uploads_dir}/summaries"
		os.makedirs(self.transcript_path, exist_ok=True)

	def load_file(self):
		input_file = None
		if os.path.exists(self.transcript_path + ".txt"):
			input_file = self.transcript_path + ".txt"
		else:
			raise FileNotFoundError("Transcript file not found (.txt)")

		output_audio_file = f"{self.summary_path}/summary_{self.meeting_id}.txt"
        

	