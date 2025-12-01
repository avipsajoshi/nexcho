import httpStatus from "http-status";
import { User, Otp } from "../models/user.model.js";
import bcrypt from "bcrypt";
// import crypto from "crypto"; // REMOVE: No longer needed for token generation
import { Meeting } from "../models/meeting.model.js";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recordingsDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "uploads",
  "recordings"
);
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}
}

/**
 * STORAGE: write temp file first (so multer doesn't depend on req.body during streaming).
 * We'll rename the file in the controller once req.body.meetingId is available.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, recordingsDir),

  filename: (req, file, cb) => {
    // Use a safe temporary name; extension based on mimetype so players can detect it
    const mime = file.mimetype || "";
    const ext = mime === "video/mp4" ? ".mp4" : ".webm"; // default to .webm

    // temp name ensures no dependency on req.body during streaming
    const tempName = `tmp-${Date.now()}${Math.floor(Math.random() * 10000)}${ext}`;
    cb(null, tempName);
  },
});

const upload = multer({ storage });

/* ----------------- Auth & user functions (unchanged) ----------------- */

// login
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Please provide username and password" });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (isPasswordCorrect) {
      // START OF SESSION CHANGE
      // 1. Remove token generation and saving to DB
      // 2. Set user ID on session (This requires express-session setup in app.js/server.js)
      req.session.userId = user._id; // <-- ASSUMPTION: session middleware is configured
      // END OF SESSION CHANGE
      return res.status(httpStatus.OK).json({
        _id: user._id,
        // REMOVE: token from response
        name: user.name,
        username: user.username,
        email: user.email,
      });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid username or password" });
    }
  } catch (e) {
    return res.status(500).json({ message: `Something went wrong: ${e}` });
  }
};

// register
const register = async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      username,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    // START OF SESSION CHANGE
    // 1. Remove token generation and saving to DB
    req.session.userId = newUser._id; // <-- ASSUMPTION: session middleware is configured
    // END OF SESSION CHANGE

    res.status(httpStatus.CREATED).json({
      _id: newUser._id,
      // REMOVE: token from response
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      message: "User registered and logged in",
    });
  } catch (e) {
    res.status(500).json({ message: `broSomething went wrong: ${e}` });
  }
};

// logout (New function for session destruction)
const logout = async (req, res) => {
  req.session.destroy(err => { // <-- ASSUMPTION: session middleware is configured
    if (err) {
      return res.status(500).json({ message: "Could not log out: " + err.message });
    }
    res.clearCookie('connect.sid'); // Assuming default express-session cookie name
    res.status(200).json({ message: "Logged out successfully" });
  });
};


// HELPER FUNCTION: Get user ID from session (simulate auth middleware)
const getUserIdFromSession = (req) => {
  return req.session.userId; // <-- ASSUMPTION: session middleware is configured
}

// get user meeting history (all meetings)
const getUserHistory = async (req, res) => {
  // const { token } = req.query; // REMOVE token from query
  // console.log("getUserHistory - Token from query:", token); // Remove debug log

  const userId = getUserIdFromSession(req); // Use session
  console.log("getUserHistory - User ID from session:", userId); // Debug log

  try {
    // const user = await User.findOne({ token }); // REMOVE token check
    // if (!user) {
    //   console.log("getUserHistory - No user found with token:", token); // Debug log
    //   return res.status(404).json({ message: "User not found" });
    // }
    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }

    const meetings = await Meeting.find({ user_id: userId }); // Use userId from session
    res.json(meetings);
  } catch (e) {
    console.error("getUserHistory error:", e); // Better error logging
    res.status(500).json({ message: `Something went wrong: ${e}` });
  }
};

// add to history (creates a meeting record)
const addToHistory = async (req, res) => {
  // const { token, meeting_code, scheduled_date } = req.body; // REMOVE token
  const { meeting_code, scheduled_date } = req.body;
  const userId = getUserIdFromSession(req); // Use session
  try {
    // const user = await User.findOne({ token }); // REMOVE token check
    // if (!user) {
    //   return res.status(404).json({ message: "User not found" });
    // }
    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }

    const newMeeting = new Meeting({
      user_id: userId, // Use userId from session
      meetingCode: meeting_code,
      scheduledFor: scheduled_date ? new Date(scheduled_date) : new Date(),
    });
    await newMeeting.save();
    res
      .status(httpStatus.CREATED)
      .json({ message: "Added meeting to history" });
  } catch (e) {
    res.json({ message: `Something went wrong: ${e}` });
  }
};

// update profile (example placeholder)
const updateProfile = async (req, res) => {
  // const { token, name, email } = req.body; // REMOVE token
  const { name, email } = req.body;
  const userId = getUserIdFromSession(req); // Use session
  try {
    // const user = await User.findOne({ token }); // REMOVE token check
    // if (!user) {
    //   return res.status(404).json({ message: "User not found" });
    // }
    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name || user.name;
    // user.email = email || user.email;
    await user.save();
    res.status(200).json({ message: "Profile updated", user });
  } catch (e) {
    res.status(500).json({ message: `Failed to update profile: ${e}` });
  }
};

// Reset user password using OTP verification (No session change needed here)
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  // Input validation
  if (!email || !newPassword) {
    return res.status(400).json({
      message: "Email, and new password are required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters long",
    });
  }

  try {
    // Verify OTP first

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    // Delete the used OTP

    res.status(200).json({ message: "Password reset successfully" });
  } catch (e) {
    console.error("Error resetting password:", e);
    res.status(500).json({ message: `Failed to reset password: ${e}` });
  }
};

// Generate OTP and send email (No session change needed here)
const generateOtp = async (req, res) => {
// ... (rest of the function is the same)
  const { email } = req.body;
  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "User with this email does not exist",
      });
    }

    await Otp.create({ email, otp });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "nexcho.vid.a@gmail.com",
        pass: "tfomoozdealupgri",
        // pass: "meczbrfobhcuaiuc", // Your app password here
      },
    });
    console.log(email);

    await transporter.sendMail({
      from: "nexcho.vid.a@gmail.com",
      to: email,
      subject: "OTP Verification",
      text: `Your OTP for verification is: ${otp}`,
    });

    res.status(200).send("OTP sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error sending OTP");
  }
};

const verifyOtp = async (req, res) => {
// ... (rest of the function is the same)
  const { email, otp } = req.body;

  try {
    const otpRecord = await Otp.findOne({ email, otp });
    if (otpRecord) {
      res.status(200).send("OTP verified successfully");
    } else {
      res.status(400).send("Invalid OTP");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error verifying OTP");
  }
};

/* ---- New Meeting Controller Functions ---- */

// Create or schedule a meeting
const createMeeting = async (req, res) => {
  try {
    // const { token, meetingCode, scheduledFor, meetingTitle } = req.body; // REMOVE token
    const { meetingCode, scheduledFor, meetingTitle } = req.body;
    const userId = getUserIdFromSession(req); // Use session

    // Input validation
    // if (!token) {
    //   return res.status(400).json({ message: "Token is required" });
    // }
    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }

    if (!meetingCode) {
      return res.status(400).json({ message: "Meeting code is required" });
    }

    // console.log("Looking for user with token:", token); // Debug log // REMOVE
    // const user = await User.findOne({ token }); // REMOVE token check
    const user = await User.findById(userId); // Use userId from session
    if (!user) {
      // console.log("No user found with token:", token); // Debug log // REMOVE
      // console.log(
      //   "Available users:",
      //   await User.find({}, { username: 1, token: 1 })
      // ); // Debug log // REMOVE
      return res.status(404).json({
        message: "User not found",
        debug: "Invalid or expired session", // UPDATE debug message
      });
    }

    console.log("User found:", user.username); // Debug log

    const existingMeeting = await Meeting.findOne({ meetingCode });
    if (existingMeeting) {
      return res.status(400).json({ message: "Meeting code already exists" });
    }

    const newMeeting = new Meeting({
      user_id: user._id,
      meetingCode,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      meetingTitle: meetingTitle || "Meeting",
      joinedAt: null,
      isCompleted: false,
      duration: 0,
      chatHistory: [],
    });

    const meetingSaved = await newMeeting.save();
    const meetingDetails = {
      meetingId: meetingSaved._id,
      meetingCode: meetingSaved.meetingCode,
      meetingHost: meetingSaved.user_id,
    };

    res.status(201).json({
      message: "Meeting created successfully",
      data: meetingDetails,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res
      .status(500)
      .json({ message: "Failed to create meeting", error: error.message });
  }
};

const joinCreatedMeeting = async (req, res) => {
  try {
    // const { token, meetingCode, meetingHost } = req.body; // REMOVE token
    const { meetingCode, meetingHost } = req.body;
    const userId = getUserIdFromSession(req); // Use session

    // Input validation
    // if (!token) {
    //   return res.status(400).json({ message: "Token is required" });
    // }
    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }


    if (!meetingCode) {
      return res.status(400).json({ message: "Meeting code is required" });
    }

    // console.log("Looking for user with token:", token); // Debug log // REMOVE

    // const user = await User.findOne({ token }); // REMOVE token check
    const user = await User.findById(userId); // Use userId from session
    if (!user) {
      // console.log("No user found with token:", token); // Debug log // REMOVE
      // console.log(
      //   "Available users:",
      //   await User.find({}, { username: 1, token: 1 })
      // ); // Debug log // REMOVE
      return res.status(404).json({
        message: "User not found",
        debug: "Invalid or expired session", // UPDATE debug message
      });
    }

    // console.log("User found:", user.username); // Debug log
    console.log("User id:", user._id); // Debug log
    console.log("Meeting host:", meetingHost); // Debug log

    const existingMeeting = await Meeting.findOne({
      user_id: meetingHost,
      meetingCode,
    });

    if (
      existingMeeting &&
      existingMeeting.joinedAt &&
      existingMeeting.isCompleted
    ) {
      return res.status(400).json({
        message: "Meeting has ended already. Create another one.",
      });
    }

    if (
      existingMeeting &&
      existingMeeting.joinedAt &&
      !existingMeeting.user_id.equals(user._id)
    ) {
      return res.status(201).json({
        message: "Meeting open to join successfully",
      });
    }

    if (
      existingMeeting &&
      !existingMeeting.joinedAt &&
      existingMeeting.user_id.equals(user._id)
    ) {
      existingMeeting.joinedAt = new Date();
      await existingMeeting.save();
      return res.status(201).json({
        message: "Meeting updated successfully",
      });
    }

    if (
      existingMeeting &&
      !existingMeeting.joinedAt &&
      !existingMeeting.user_id.equals(user._id)
    ) {
      console.log("meeting host from if block ", existingMeeting.user_id);
      console.log("user from if block ", user._id);
      return res.status(400).json({
        message: "Meeting not in session. Please wait for host to start.",
      });
    }
    return res.status(400).json({
      message: "Meeting not found.",
    });
  } catch (error) {
    console.error("Error joining meeting:", error);
    res
      .status(500)
      .json({ message: "Failed to join meeting", error: error.message });
  }
};

// Join meeting - validate meeting code and return meeting info
const joinMeeting = async (req, res) => {
  try {
    // const { token, meetingCode } = req.body; // REMOVE token
    const { meetingCode } = req.body;
    const userId = getUserIdFromSession(req); // Use session

    // if (!token || !meetingCode) { // UPDATE validation
    if (!userId || !meetingCode) {
      return res.status(400).json({ message: "User not authenticated or MeetingCode is required" });
    }

    // const user = await User.findOne({ token }); // REMOVE token check
    const user = await User.findById(userId); // Use userId from session
    if (!user) {
      return res.status(404).json({ message: "User not found or invalid session" });
    }

    const meeting = await Meeting.findOne({ meetingCode });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting code not found" });
    }

    // Condition: Meeting ended
    if (meeting.joinedAt && meeting.isCompleted) {
      return res.status(400).json({ message: "Meeting has already ended" });
    }

    // Condition: Meeting ongoing, anyone can join EXCEPT host after start
    if (meeting.joinedAt && meeting.user_id.toString() !== user._id.toString()) {
      return res.status(200).json({ message: "Meeting open to join successfully" });
    }

    console.log("User found:", user.username); // Debug log

    const existingMeeting = await Meeting.findOne({
      meetingCode,
    });

    if (
      existingMeeting &&
      existingMeeting.joinedAt &&
      existingMeeting.isCompleted
    ) {
      return res.status(400).json({
        message: "Meeting ended already. Create another",
      });
    }

    if (
      existingMeeting &&
      existingMeeting.joinedAt &&
      existingMeeting.user_id != user._id
    ) {
      return res.status(201).json({
        message: "Meeting open to join successfully",
      });
    }

    if (
      existingMeeting &&
      !existingMeeting.joinedAt &&
      existingMeeting.user_id != user._id
    ) {
      return res.status(400).json({
        message: "Meeting not in session. Please wait host to start.",
      });
    }
  } catch (error) {
    console.error("Error joining meeting:", error);
    return res.status(500).json({ message: "Failed to join meeting", error: error.message });
  }
};


// Update meeting history after meeting ends (No session check needed if called by the host during meeting flow)
const updateMeetingHistory = async (req, res) => {
// ... (no changes needed for session here, focuses on meetingCode)
  try {
    const { meetingCode, duration, chatHistory } = req.body;

    const meeting = await Meeting.findOne({ meetingCode });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

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
};

// Get upcoming meetings for user (This function already uses req.params.userId, but should use session)
const getUpcomingMeetings = async (req, res) => {
  try {
    // const userId = req.params.userId; // REMOVE params-based ID
    const userId = getUserIdFromSession(req); // Use session

    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }
    const now = new Date();

    const upcoming = await Meeting.find({
      user_id: userId,
      scheduledFor: { $gt: now },
      isCompleted: false,
    });

    res.status(200).json(upcoming);
  } catch (error) {
    console.error("Error fetching upcoming meetings:", error);
    res.status(500).json({ message: "Failed to fetch upcoming meetings" });
  }
};

// Get completed meetings for user (This function already uses req.params.userId, but should use session)
const getCompletedMeetings = async (req, res) => {
  try {
    // const userId = req.params.userId; // REMOVE params-based ID
    const userId = getUserIdFromSession(req); // Use session
    
    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }

    const completed = await Meeting.find({
      user_id: userId,
      isCompleted: true,
    });

    res.status(200).json(completed);
  } catch (error) {
    console.error("Error fetching completed meetings:", error);
    res.status(500).json({ message: "Failed to fetch completed meetings" });
  }
};

const endMeeting = async (req, res) => {
  try {
    const {
      token,
      meetingId,
      enableAttendance,
      enableRecording,
      enableSummary,
    } = req.body;

    // Input validation
    // if (!token) {
    //   return res.status(400).json({ message: "Token is required" });
    // }
    if (!userId) {
       return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated (No session)" });
    }


    if (!meetingId) {
      return res.status(400).json({ message: "MeetingId is required" });
    }

    // const user = await User.findOne({ token }); // REMOVE token check
    const user = await User.findById(userId); // Use userId from session
    if (!user) {
      // console.log("No user found with token:", token); // Debug log // REMOVE
      // console.log(
      //   "Available users:",
      //   await User.find({}, { username: 1, token: 1 })
      // ); // Debug log // REMOVE
      return res.status(404).json({
        message: "User not found",
        debug: "Invalid or expired session", // UPDATE debug message
      });
    }
    const meetingData = await Meeting.findById(meetingId);

    if (meetingData && meetingData.user_id != user._id) {
      return res.status(200).json({
        message: "Meeting has been ended.",
      });
    }
    if (
      meetingData &&
      meetingData.joinedAt &&
      !meetingData.isCompleted &&
      meetingData.user_id == user._id
    ) {
      meetingData.endedAt = new Date();
      meetingData.isCompleted = true;
      //.getTime() is in miliseconds
      const durationMs =
        meetingData.endedAt.getTime() - meetingData.joinedAt.getTime();
      // meetingData.duration = Math.floor(durationMs / 1000); //convert ms to sec
      meetingData.duration = durationMs;
      await meetingData.save();
      if (enableAttendance || enableRecording || enableSummary) {
        const attendanceResponse = await fetch(
          `${server_url}/api/v1/attendance/meeting_ended`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetingId: meetingData._id,
              enableAttendance,
              enableRecording,
              enableSummary,
            }),
          }
        );
      }

      // 4. Check if the attendance service call was successful
      if (!attendanceResponse.ok) {
        console.error("Attendance service failed to process meeting end.");
        // Log the error but proceed with success response for the main action
      }

      return res.status(201).json({
        message: "Meeting ended and updated successfully",
      });
    }

    if (!meetingData) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }
  } catch (error) {
    console.error("Error ending meeting:", error);
    res
      .status(500)
      .json({ message: "Failed to end meeting", error: error.message });
  }
};

/* ------------- Recording upload middleware & controller ------------- */

/**
 * Use upload.single("recording") — the uploaded file will be at req.file
 * meetingId should be passed in the same multipart/form-data body as a string field.
 */
const recordMeeting = upload.single("recording");

const saveRecording = async (req, res) => {
  let tempFilePath = null;
  try {
    // meetingId comes from the form field (multipart/form-data)
    const meetingId = req.body?.meetingId || req.headers["x-meeting-id"] || null;
    if (!meetingId) {
      // remove temp file if present
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      return res.status(400).json({ message: "meetingId is required in the form data (field: meetingId) or header x-meeting-id" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No recording file uploaded" });
    }

    // req.file.filename is the temp name we generated in storage.filename()
    tempFilePath = path.join(recordingsDir, req.file.filename);

    // Determine extension from mimetype
    const mime = req.file.mimetype || "";
    const ext = mime === "video/mp4" ? ".mp4" : ".webm"; // default .webm

    const finalFilename = `${meetingId}${ext}`;
    const finalPath = path.join(recordingsDir, finalFilename);

    // If a file with finalFilename already exists, you may choose to overwrite or keep both.
    // Here we'll overwrite the old one (use fs.renameSync to move/replace).
    // But first, if there is an existing file, remove it to avoid rename errors on some platforms:
    if (fs.existsSync(finalPath)) {
      try {
        fs.unlinkSync(finalPath);
      } catch (e) {
        console.warn("Could not remove existing final file:", finalPath, e);
      }
    }

    // rename temp file to final filename
    fs.renameSync(tempFilePath, finalPath);

    // Save recording URL to DB
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      // cleanup finalPath if meeting not found
      try { fs.unlinkSync(finalPath); } catch (_) {}
      return res.status(404).json({ message: "Meeting not found" });
    }

    meeting.recordingUrl = `/uploads/recordings/${finalFilename}`;
    await meeting.save();

    res.status(200).json({
      message: "Recording uploaded successfully",
      recordingUrl: meeting.recordingUrl,
    });
  } catch (error) {
    console.error("Error uploading recording:", error);
    // cleanup temp if exists
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn("Cleanup failed:", e);
    }
    res.status(500).json({ message: "Failed to upload recording", error: error.message });
  }
};

export {
  login,
  register,
  logout,
  getUserHistory,
  addToHistory,
  updateProfile,
  resetPassword,
  generateOtp,
  verifyOtp,
  createMeeting,
  joinCreatedMeeting,
  joinMeeting,
  updateMeetingHistory,
  getUpcomingMeetings,
  getCompletedMeetings,
  endMeeting,
  recordMeeting,
  saveRecording,
};