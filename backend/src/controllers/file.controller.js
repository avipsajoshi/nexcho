import { Meeting } from "../models/meeting.model.js";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { getBucket } from "../services/gridfs.js";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories for local file storage (relative path assumed for uploads)
const uploads_dir = path.join(__dirname, "..", "..", "uploads");

const getRecording = async (req, res) => {
	const bucket = getBucket();
	if (!bucket) return res.status(500).send("Bucket not initialized");

	const fileId = new mongoose.Types.ObjectId(req.params.id);

	res.set("Content-Type", "video/webm");

	const downloadStream = bucket.openDownloadStream(fileId);
	downloadStream.on("error", () =>
		res.status(404).json({ message: "File not found" })
	);
	downloadStream.pipe(res);
};
//change thi slater
const saveText = async (req, res) => {
	try {
		const { meetingId, transcript, summary } = req.body;
		if (!meetingId) {
			return res.status(400).json({ message: "MeetingId is empty" });
		}
		const meetingData = await Meeting.findById(meetingId);
		if (!meetingData.isSummarized) {
			return res
				.status(400)
				.json({ message: "Meeting Summary exists already" });
		}
		meetingData.isSummarized = true;
		meetingData.processedDetails.timestamp = Date.now;
		meetingData.processedDetails.summary = summary;
		meetingData.processedDetails.transcript = transcript;
		await meetingData.save();
		// processingCompleteCallback(meetingId, "recording", "");
		res.status(200).json({ message: "Meeting details updated" });
	} catch (error) {
		console.error("Error updating meeting details:", error);
		res.status(500).json({ message: "Failed to save meeting details" });
	}
};

export { getRecording, saveText };
