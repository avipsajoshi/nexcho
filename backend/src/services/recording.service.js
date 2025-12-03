import path from "path";
import fs from "fs/promises";
import VideoFile from "../models/file.model.js";
import { saveFileToGridFS } from "../controllers/helper.js";
import { fileURLToPath } from "url";
import { callText } from "../controllers/file.controller.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ml_url = process.env.ML_BACKEND;
const uploads_dir = path.join(__dirname, "..", "..", "uploads");
export async function runRecordingUpload(meetingId) {
	console.log(runRecordingUpload);
	if (!meetingId) {
		console.error("runRecordingUpload: meetingId missing");
		return;
	}
	console.log(runRecordingUpload);

	const filename = `${meetingId}.webm`;
	const filePath = path.join(uploads_dir, "recordings", filename);
	callText(meetingId);
	// try {
	// 	// Ensure file exists
	// 	await fs.access(filePath);

	// 	// Upload video to GridFS
	// 	const fileId = await saveFileToGridFS(filePath, filename, {
	// 		meetingId,
	// 		contentType: "video/webm",
	// 		fileType: "recording",
	// 	});

	// 	// Save metadata in DB
	// 	await new VideoFile({
	// 		fileId,
	// 		filename,
	// 		contentType: "video/webm",
	// 		metadata: { meetingId, fileType: "recording" },
	// 	}).save();

	// 	console.log("Recording uploaded to GridFS");

	// 	// Run transcription pipeline

	// 	// Remove local copy
	// 	await fs.unlink(filePath);

	// 	console.log(`Recording upload & processing completed for ${meetingId}`);
	// } catch (err) {
	// 	console.error(
	// 		`runRecordingUpload failed for meeting ${meetingId}:`,
	// 		err.message
	// 	);
	// }
}
