import { Meeting, Attendance } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ml_url = process.env.PYTHON_APP_SERVER_URL;
const uploads_dir = path.join(__dirname, "..", "..", "uploads");
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

/**
 * Endpoint: /api/attendance/calculate
 * Calculates attendance by accessing local images, sending user IDs to ML API,
 * saving the result, and removing the local image files.
 */
const calculateAttendance = async (req, res) => {
	const { meetingId } = req.body;
	if (!meetingId) {
		return res.status(400).json({ message: "MeetingId is empty" });
	}

	const folderPath = path.join(uploads_dir, "images", meetingId);
	let savedRecords = 0; // Initialize a counter

	try {
		// 1. Get unique user IDs from image files on disk
		const filenames = await fs.readdir(folderPath);
		const uniqueUserIds = new Set();

		filenames.forEach((filename) => {
			if (
				filename.match(/\.(jpg|jpeg|png)$/i) // Check for image extensions
			) {
				// Filename structure: userId_timestamp.ext
				const parts = filename.split("_", 2);
				if (parts.length > 0) {
					uniqueUserIds.add(parts[0]);
				}
			}
		});

		const userIdsArray = Array.from(uniqueUserIds);
		console.log("Unique Users for Attendance Calculation:", userIdsArray);

		if (userIdsArray.length === 0) {
			await fs.rmdir(folderPath, { recursive: true }); // Clean up empty folder
			return res.status(200).json({
				status: "Success",
				message: "No user images found to calculate attendance.",
			});
		}

		// 2. Send user IDs to ML API
		const response = await fetch(`${ml_url}/getAttendance`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				meeting: meetingId, // Use the provided meetingId
				userIds: userIdsArray, // Convert Set to Array for JSON serialization
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`ML Server Error: ${response.status} - ${errorText}`);
			// Log the error but continue to step 4 (file removal) for cleanup
			throw new Error(`ML Service failed: ${response.status} - ${errorText}`);
		}

		// 3. Process and save attendance records
		const mlData = await response.json();

		for (const [userId, mlResults] of Object.entries(mlData)) {
			console.log("Processing attendance for user:", userId);

			const { positive, negative, semipositive } = mlResults;
			const totalInteractions = positive + negative + semipositive;
			let percent = 0;

			if (totalInteractions > 0) {
				// Calculate attendance percentage based on positive and semi-positive interactions
				percent = ((positive + semipositive * 0.5) / totalInteractions) * 100;
			}

			const finalPercent = Math.min(100, parseFloat(percent.toFixed(2)));

			// Save attendance to DB
			const attendanceRecord = new Attendance({
				user_id: userId,
				meeting_id: meetingId,
				final_percent: finalPercent,
			});

			// NOTE: Mongoose uses .save() on an instance, not a static method on the Model.
			await attendanceRecord.save();
			savedRecords += 1;
		}

		// 4. Remove the image files under meetingId folder
		// Use fs.rm instead of rmdir for modern, safer recursive deletion
		await fs.rm(folderPath, { recursive: true, force: true });

		return res.status(200).json({
			status: "Success",
			message: `${savedRecords} attendance records saved. Image files deleted.`,
		});
	} catch (error) {
		// Attempt to clean up the folder path even if the ML call failed
		try {
			await fs.rm(folderPath, { recursive: true, force: true });
			console.log(`Cleaned up image folder: ${folderPath}`);
		} catch (cleanupError) {
			console.error("Failed to clean up image folder:", cleanupError);
		}

		console.error("Error calculating attendance:", error);
		return res.status(500).json({
			message: `Cannot save attendance: ${
				error.message || "An unknown error occurred"
			}`,
		});
	}
};

/**
 * Endpoint: /api/attendance/:meetingId
 * Retrieves all attendance records for a meeting, including user full names,
 * ordered by the highest final_percent.
 */
const getAttendance = async (req, res) => {
	const { meetingId } = req.params;

	if (!meetingId) {
		return res.status(400).json({ message: "MeetingId is required." });
	}

	try {
		// 1. Find all Attendance documents for the meeting
		const attendanceList = await Attendance.find({ meeting_id: meetingId })
			// 2. Populate the user_id field with data from the User collection
			.populate({
				path: "user_id",
				select: "fullname", // Select only the fullname field (assuming it exists)
				model: User, // Explicitly reference the User model
			})
			// 3. Sort by final_percent in descending order
			.sort({ final_percent: -1 })
			.lean(); // Use .lean() for faster query results

		// 4. Format the final output
		const formattedList = attendanceList.map((record) => ({
			userId: record.user_id._id,
			fullname: record.user_id.fullname || "User Not Found",
			finalPercent: record.final_percent,
		}));

		return res.status(200).json({
			status: "Success",
			message: `Found ${formattedList.length} attendance records.`,
			data: formattedList,
			total: attendanceList.length + 1,
		});
	} catch (error) {
		console.error("Error retrieving attendance:", error);
		return res.status(500).json({
			message: "Failed to retrieve attendance records.",
			error: error.message,
		});
	}
};

export { meetingEnded, calculateAttendance, getAttendance };
