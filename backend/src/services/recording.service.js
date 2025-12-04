import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import VideoFile from "../models/file.model.js";
import { Meeting } from "../models/meeting.model.js";
import { initGridFS, getBucket } from "./gridfs.js";
import axios from "axios";
import FormData from "form-data";
import { saveText } from "../controllers/file.controller.js";
const ml_url = process.env.ML_BACKEND_URL;
const uploadsPath = path.join(process.cwd(), "uploads", "recordings");
let vidId;
export const saveRecordingToGridFS = async (meetingId) => {
	const bucket = getBucket();
	if (!bucket) throw new Error("GridFS not initialized");

	const filename = `${meetingId}.webm`;
	const filePath = path.join(uploadsPath, filename);

	await fsp.access(filePath);

	return new Promise((resolve, reject) => {
		const uploadStream = bucket.openUploadStream(filename, {
			contentType: "video/webm",
			metadata: { meetingId, fileType: "recording" },
		});

		fs.createReadStream(filePath)
			.pipe(uploadStream)
			.on("error", reject)
			.on("finish", async () => {
				vidId = uploadStream.id;
				await new VideoFile({
					fileId: uploadStream.id, // ← FIXED
					filename,
					contentType: "video/webm",
					metadata: { meetingId, fileType: "recording" },
				}).save();

				resolve(uploadStream.id);
			});
	});
};

const sendToPython = async (meetingId) => {
	try {
		const res = await axios.post(`${ml_url}/summarize`, {
			meetingId: meetingId,
			vidId: vidId,
		});
		return res.data;
	} catch (err) {
		console.error("Error sending to Python:", err.message);
		throw err;
	}
};

export async function runRecordingUpload(meetingId, enableSummary) {
	console.log("runRecordingUpload");
	if (!meetingId) {
		console.error("runRecordingUpload: meetingId missing");
		return;
	}
	try {
		const fileId = await saveRecordingToGridFS(meetingId);
		console.log("Uploaded to GridFS:", fileId);

		if (enableSummary) {
			// send file to python API
			console.log("going to ml");
			sendToPython(meetingId);
		}
	} catch (err) {
		console.error("Upload failed:", err);
	}
}

export async function runRecordingSave(meetingId) {
	try {
		const filePath = path.join(uploadsPath, `${meetingId}.webm`);
		const form = new FormData();
		form.append("meetingId", meetingId);
		form.append("video", fs.createReadStream(filePath));

		const response = await axios.post(`${ml_url}/summarize`, form, {
			headers: form.getHeaders(),
		});
		try {
			const { meetingId, transcript, summary } = response.data;
			if (!meetingId) {
				console.log("MeetingId is empty");
			}
			const meetingData = await Meeting.findById(meetingId);
			// if (!meetingData.isSummarized) {
			// 	console.log("Meeting Summary exists already");
			// }
			meetingData.isSummarized = true;
			meetingData.processedDetails.timestamp = Date.now();
			meetingData.processedDetails.summary = summary;
			meetingData.processedDetails.transcript = transcript;
			await meetingData.save();
			processingCompleteCallback(meetingId, "recording", "");
			console.log("Meeting details updated");
		} catch (error) {
			console.error("Error updating meeting details:", error);
			console.log("Failed to save meeting details");
		}

		console.log("Python server response:", response.data);
	} catch (err) {
		console.error("Error sending video:", err);
	}
}
