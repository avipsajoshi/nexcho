import { Meeting, Attendance } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ml_url = process.env.PYTHON_APP_SERVER_URL;
const uploads_dir = path.join(__dirname, "..", "..", "..", "uploads");
const meetingEnded = async (req, res) => {
	try {
		const { meetingId, enableAttendance, enableRecording, enableSummary } =
			req.body;
		if (!meetingId) {
			return res.status(400).json({ message: "MeetingId is empty" });
		}
		const meetingData = await Meeting.findById(meetingId);
		if (!meetingData) {
			return res.status(404).json({ message: "Meeting not found" });
		}

		//if attendance, send meeting id, list of userids
		// if (true) {
		if (enableAttendance) {
			try {
				const folderPath = path.join(uploads_dir, "images", meetingId);
				// read directory contents
				const filenames = await fs.readdir(folderPath);
				//Extract Unique User IDs
				const uniqueUserIds = new Set();
				// Example filenames: user1_image1.jpg, user2_image2.jpg, user1_image3.jpg
				filenames.forEach((filename) => {
					// Check if the file is a standard image file and not a hidden file
					if (
						filename.endsWith(".jpg") ||
						filename.endsWith(".jpeg") ||
						filename.endsWith(".png")
					) {
						// Split the filename by the first underscore to get the user ID part
						// 'user1_image1.jpg'.split('_') -> ['user1', 'image1.jpg']
						const parts = filename.split("_", 2);
						if (parts.length > 0) {
							uniqueUserIds.add(parts[0]);
						}
					}
				});
				console.log("user-unique ids ~~~", uniqueUserIds);

				const response = await fetch(`${ml_url}/getAttendance`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						meeting: meetingData._id,
						userIds: Array.from(uniqueUserIds),
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error(`ML Server Error: ${response.status} - ${errorText}`);
					return res.status(502).json({
						message: "Failed to get attendance data from ML service.",
						detail: errorText,
					});
				}
				const mlData = await response.json();
				for (const [userId, mlResults] of Object.entries(mlData)) {
					// user = await User.findById(userId);
					// userid = user._id;
					console.log("for user : ", userId);
					const { positive, negative, semipositive } = mlResults;
					const totalInteractions = positive + negative + semipositive;
					if (totalInteractions > 0) {
						percent =
							((positive + semipositive * 0.5) / totalInteractions) * 100;
					}
					finalPercent = Math.min(100, parseFloat(percent.toFixed(2)));
					const attendanceRecord = new Attendance({
						user_id: userId,
						meeting_id: meetingId,
						final_percent: finalPercent,
					});

					await Attendance.save(attendanceRecord);
					savedRecords += 1;
				}

				return res.status(200).json({
					status: "Success",
					message: savedRecords,
				});
			} catch (error) {
				return res.status(500).json({
					message: "Cannot save attendance",
				});
			}
		}

		if (enableRecording) {
			try {
				const response = await fetch(`${ml_url}/getSummary`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						meeting: meetingData._id,
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error(`ML Server Error: ${response.status} - ${errorText}`);
					return res.status(502).json({
						message: "Failed to get attendance data from ML service.",
						detail: errorText,
					});
				}
			} catch (error) {}
		}
	} catch (error) {}
};

export { meetingEnded };
