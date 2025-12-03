import { Meeting } from "../models/meeting.model.js";
import VideoFile from "../models/file.model.js";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });
const ml_url = process.env.ML_BACKEND_URL;
// --- GridFS Setup Assumption ---
// In a real application, gfsBucket would be initialized and exported from your database file.
// We are assuming a mongoose connection has been made.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories for local file storage (relative path assumed for uploads)
const uploads_dir = path.join(__dirname, "..", "..", "uploads");

// --- API Endpoints ---
/**
 * Endpoint: /api/files/recording/:meetingId
 * Retrieves and streams the recording from GridFS to be playable media.
 */
const getRecording = async (req, res) => {
	const { meetingId } = req.params;

	try {
		const fileRecord = await VideoFile.findOne({
			"metadata.meetingId": meetingId,
			"metadata.fileType": "recording",
		});

		if (!fileRecord) {
			return res.status(404).json({ message: "Recording not found." });
		}

		// Set headers for streaming video
		res.set({
			"Content-Type": fileRecord.contentType,
			"Content-Length": fileRecord.length,
			"Content-Disposition": `inline; filename="${fileRecord.filename}"`,
		});

		// Open download stream from GridFS
		gfsBucket.openDownloadStream(fileRecord.fileId).pipe(res);
	} catch (error) {
		console.error("Error retrieving recording:", error);
		res.status(500).json({
			message: "Failed to retrieve recording.",
			error: error.message,
		});
	}
};

const streamGridFSVideo = async (req, res) => {
	const { fileId } = req.params;
	try {
		const objectId = new mongoose.Types.ObjectId(fileId);

		// Find metadata to set content type
		const file = await gfsBucket.find({ _id: objectId }).toArray();
		if (!file || file.length === 0) {
			return res.status(404).json({ message: "Video not found." });
		}

		// Set necessary headers for streaming
		res.set("Content-Type", file[0].contentType || "video/webm");
		res.set(
			"Content-Disposition",
			`attachment; filename="${file[0].filename}"`
		);

		// Create the download stream and pipe it to the response
		const downloadStream = gfsBucket.openDownloadStream(objectId);
		downloadStream.pipe(res);

		downloadStream.on("error", (err) => {
			console.error("GridFS streaming error:", err);
			if (!res.headersSent) {
				res.status(500).json({ message: "Error during file streaming." });
			}
		});
	} catch (error) {
		console.error("Invalid fileId or stream setup error:", error);
		res.status(500).json({ message: "Internal server error." });
	}
};

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
		processingCompleteCallback(meetingId, "recording", "");
		res.status(200).json({ message: "Meeting details updated" });
	} catch (error) {
		onsole.error("Error updating meeting details:", error);
		res.status(500).json({ message: "Failed to save meeting details" });
	}
};

const callText = async (meetingId) => {
	try {
		console.log("get summary ml post");
		// call python

		axios.post(`${ml_url}/getSummary`, {
			meeting: meetingId,
		});
	} catch (error) {}
};

export { getRecording, callText, saveText, streamGridFSVideo };
