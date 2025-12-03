import path from "path";
import fs from "fs/promises";
import axios from "axios";
import { Attendance } from "../models/meeting.model.js";
import {
	calculateFinalPercentage,
	groupFilesByUserId,
} from "../controllers/helper.js";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import * as dotenv from "dotenv";
import { processingCompleteCallback } from "../controllers/user.controller.js";
dotenv.config({ path: "./.env" });
const ml_url = process.env.ML_BACKEND_URL;
const uploads_dir = path.join(__dirname, "..", "..", "uploads");

export async function runAttendanceCalculation(meetingId) {
	console.log(runAttendanceCalculation);
	console.log("ml url  ", ml_url);
	if (!meetingId) {
		console.error("runAttendanceCalculation: meetingId is missing");
		return;
	}

	const meetingDir = path.join(uploads_dir, "images", meetingId);
	let savedRecords = 0;

	try {
		console.log("Reading images...");

		// 1. Read files from meeting folder
		const filenames = await fs.readdir(meetingDir);

		// Group images by userId: { userId: [paths] }
		const userImages = {};

		for (const filename of filenames) {
			if (!filename.match(/\.(jpg|jpeg|png)$/i)) continue;

			const [userId] = filename.split("_", 1);
			if (!userImages[userId]) userImages[userId] = [];

			userImages[userId].push(path.join(meetingDir, filename));
		}

		const userIds = Object.keys(userImages);
		console.log("Unique Users:", userIds);

		if (userIds.length === 0) {
			console.log(`No screenshots for meeting ${meetingId}`);
			await fs.rm(meetingDir, { recursive: true, force: true });
			return;
		}

		// 2. Loop through each user
		for (const userId of userIds) {
			const imagePaths = userImages[userId];
			const base64Images = [];

			console.log(
				`Processing images for ${userId} (${imagePaths.length} images)...`
			);

			// Convert to base64
			for (const imgPath of imagePaths) {
				const buffer = await fs.readFile(imgPath);
				base64Images.push(buffer.toString("base64"));
			}

			// 3. ML API call
			let mlResult;

			try {
				const mlResponse = await axios.post(`${ml_url}/getAttendance`, {
					userId,
					meetingId,
					images: base64Images,
				});

				mlResult = mlResponse.data;
			} catch (err) {
				console.error(`ML service failed for user ${userId}:`, err.message);

				mlResult = {
					positive: 0,
					negative: 0,
					semipositive: 0,
					prevStatus: 0,
				};
			}

			// 4. Calculate percentage
			const finalPercent = calculateFinalPercentage(mlResult);

			const attendanceRecord = new Attendance({
				user_id: userId,
				meeting_id: meetingId,
				final_percent: finalPercent,
			});

			await attendanceRecord.save();
			savedRecords++;
		}

		console.log(`Saved Records: ${savedRecords}`);
		processingCompleteCallback(meetingId, "attendance", "");
		// 5. Cleanup meeting folder
		// await fs.rm(meetingDir, { recursive: true, force: true });
		console.log(`Cleaned up ${meetingDir}`);
	} catch (err) {
		// Cleanup even on error
		console.error("Fatal attendance calculation error:", err.message);

		try {
			await fs.rm(meetingDir, { recursive: true, force: true });
			console.log(`Cleaned up folder after failure: ${meetingDir}`);
		} catch (cleanupError) {
			console.error("Cleanup failed:", cleanupError);
		}
	}
}
