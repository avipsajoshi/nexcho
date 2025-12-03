import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
	addToHistory,
	getUserHistory,
	login,
	register,
	updateProfile,
	resetPassword,
	generateOtp,
	verifyOtp,
	createMeeting,
	joinCreatedMeeting,
	joinMeeting,
	endMeeting,
	recordMeeting,
	saveRecording,
} from "../controllers/user.controller.js";

import { Meeting, Attendance } from "../models/meeting.model.js";

const router = Router();

// === User Routes ===
router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);
router.route("/update_profile").post(updateProfile);
router.route("/reset_password").post(resetPassword);
router.route("/generate-otp").post(generateOtp);
router.route("/verify-otp").post(verifyOtp);
router.route("/create_meeting").post(createMeeting);
router.route("/join_created_meeting").post(joinCreatedMeeting);
router.route("/join_meeting").post(joinMeeting);
router.route("/end_meeting").post(endMeeting);
router.post(
	"/upload_meeting_recording",
	recordMeeting, // multer middleware
	saveRecording // actual handler
);

// router.get("/get_meeting_details/:meetingId", async (req, res) => {
// 	try {
// 		console.log("HIT");
// 		const meetingId = req.params.meetingId;
// 		const meeting = await Meeting.findById(meetingId)
// 			.populate("user_id", "name") // Populates the host details
// 			.lean();
// 		if (!meeting) return res.status(404).json({ message: "Meeting not found" });
// 		let fullMeetingDetails = [];
// 		if (meeting.hasAttendance) {
// 			const attendanceRecords = await Attendance.find({
// 				meetingId: meetingId,
// 			})
// 				.populate("user_id", "name")
// 				.lean();
// 			fullMeetingDetails = {
// 				...meeting,
// 				fullAttendance: attendanceRecords,
// 			};
// 		} else {
// 			fullMeetingDetails = {
// 				...meeting,
// 			};
// 		}

// 		res.status(200).json(fullMeetingDetails);
// 	} catch (error) {
// 		console.error("Error fetching meeting:", error);
// 		res.status(500).json({ message: "Failed to fetch meeting" });
// 	}
// });
router.get("/get_meeting_details/:meetingId", async (req, res) => {
	try {
		const meetingId = req.params.meetingId;

		const meeting = await Meeting.findById(meetingId)
			.populate("user_id", "name") // host details
			.lean();

		if (!meeting) {
			return res.status(404).json({ message: "Meeting not found" });
		}

		// Fetch attendance if it exists
		let fullAttendance = [];
		if (meeting.hasAttendance) {
			fullAttendance = await Attendance.find({ meeting_id: meeting._id })
				.populate("user_id", "name")
				.lean();
		}

		const fullMeetingDetails = {
			...meeting,
			fullAttendance, // empty array if none
		};

		res.status(200).json(fullMeetingDetails);
	} catch (error) {
		console.error("Error fetching meeting:", error);
		res.status(500).json({ message: "Failed to fetch meeting" });
	}
});

// === Meeting routes ===
router.get("/get_meetings/:userId", async (req, res) => {
	try {
		const userId = req.params.userId;
		let meetings;
		try {
			meetings = await Meeting.find({ user_id: userId });
		} catch {
			const { User } = await import("../models/user.model.js");
			const user = await User.findOne({ username: userId });
			if (!user) return res.status(404).json({ message: "User not found" });
			meetings = await Meeting.find({ user_id: user._id }).sort({
				createdAt: -1,
			});
		}
		res.status(200).json(meetings);
	} catch (error) {
		console.error("Error fetching meetings:", error);
		res.status(500).json({ message: "Failed to fetch meetings" });
	}
});

router.get("/get_meeting/:meetingCode", async (req, res) => {
	try {
		const meetingCode = req.params.meetingCode;
		const meeting = await Meeting.findOne({ meetingCode, isCompleted: false });
		if (!meeting) return res.status(404).json({ message: "Meeting not found" });
		res.status(200).json(meeting);
	} catch (error) {
		console.error("Error fetching meeting:", error);
		res.status(500).json({ message: "Failed to fetch meeting" });
	}
});

// router.post("/join_meeting", async (req, res) => {
//   try {
//     const { meetingCode } = req.body;
//     const meeting = await Meeting.findOne({ meetingCode });
//     if (!meeting)
//       return res.status(404).json({ message: "Meeting code not found" });
//     res.status(200).json(meeting);
//   } catch (error) {
//     console.error("Error joining meeting:", error);
//     res.status(500).json({ message: "Failed to join meeting" });
//   }
// });

router.post("/update_meeting_history", async (req, res) => {
	try {
		const { meetingCode, duration, chatHistory } = req.body;
		const meeting = await Meeting.findOne({ meetingCode });
		if (!meeting) return res.status(404).json({ message: "Meeting not found" });

		meeting.isCompleted = true;
		meeting.duration = duration;
		meeting.chatHistory = chatHistory;
		meeting.joinedAt = meeting.joinedAt || new Date();

		await meeting.save();
		res.status(200).json({ message: "Meeting history updated" });
	} catch (error) {
		console.error("Error updating meeting history:", error);
		res.status(500).json({ message: "Failed to update meeting history" });
	}
});

router.get("/get_upcoming_meetings/:userId", async (req, res) => {
	try {
		const userId = req.params.userId;
		const now = new Date();
		let upcoming;
		try {
			upcoming = await Meeting.find({
				user_id: userId,
				scheduledFor: { $gt: now },
				isCompleted: false,
			});
		} catch {
			const { User } = await import("../models/user.model.js");
			const user = await User.findOne({ username: userId });
			if (!user) return res.status(404).json({ message: "User not found" });
			upcoming = await Meeting.find({
				user_id: user._id,
				scheduledFor: { $gt: now },
				isCompleted: false,
			});
		}
		res.status(200).json(upcoming);
	} catch (error) {
		console.error("Error fetching upcoming meetings:", error);
		res.status(500).json({ message: "Failed to fetch upcoming meetings" });
	}
});

router.get("/get_completed_meetings/:userId", async (req, res) => {
	try {
		const userId = req.params.userId;
		let completed;
		try {
			completed = await Meeting.find({ user_id: userId, isCompleted: true });
		} catch {
			const { User } = await import("../models/user.model.js");
			const user = await User.findOne({ username: userId });
			if (!user) return res.status(404).json({ message: "User not found" });
			completed = await Meeting.find({ user_id: user._id, isCompleted: true });
		}
		res.status(200).json(completed);
	} catch (error) {
		console.error("Error fetching completed meetings:", error);
		res.status(500).json({ message: "Failed to fetch completed meetings" });
	}
});

// === NEW: Upload recording ===
// router.post(
//   "/upload_recording",
//   upload.single("recording"),
//   async (req, res) => {
//     try {
//       const { meetingCode } = req.body;
//       const file = req.file;

//       if (!file)
//         return res.status(400).json({ message: "No recording file uploaded" });

//       const meeting = await Meeting.findOne({ meetingCode });
//       if (!meeting)
//         return res.status(404).json({ message: "Meeting not found" });

//       meeting.recordingUrl = `/uploads/recordings/${file.filename}`;
//       await meeting.save();

//       res.status(200).json({
//         message: "Recording uploaded successfully",
//         recordingUrl: meeting.recordingUrl,
//       });
//     } catch (error) {
//       console.error("Error uploading recording:", error);
//       res.status(500).json({ message: "Failed to upload recording" });
//     }
//   }
// );

// === NEW: Get recording link ===
router.get("/get_recording/:meetingCode", async (req, res) => {
	try {
		const meeting = await Meeting.findOne({
			meetingCode: req.params.meetingCode,
		});
		if (!meeting || !meeting.recordingUrl) {
			return res.status(404).json({ message: "Recording not found" });
		}
		res.status(200).json({ recordingUrl: meeting.recordingUrl });
	} catch (error) {
		console.error("Error retrieving recording:", error);
		res.status(500).json({ message: "Failed to retrieve recording" });
	}
});

export default router;
