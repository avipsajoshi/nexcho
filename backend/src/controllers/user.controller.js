import httpStatus from "http-status";
import { User, Otp } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";

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
      const token = crypto.randomBytes(20).toString("hex");
      user.token = token;
      await user.save();
      return res.status(httpStatus.OK).json({
        _id: user._id,
        token,
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

    // Generate token for new user
    const token = crypto.randomBytes(20).toString("hex");
    newUser.token = token;
    await newUser.save();

    res.status(httpStatus.CREATED).json({
      _id: newUser._id,
      token,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      message: "User registered and logged in",
    });
  } catch (e) {
    res.status(500).json({ message: `Something went wrong: ${e}` });
  }
};

// get user meeting history (all meetings)
const getUserHistory = async (req, res) => {
  const { token } = req.query;

  console.log("getUserHistory - Token from query:", token); // Debug log

  try {
    const user = await User.findOne({ token });
    if (!user) {
      console.log("getUserHistory - No user found with token:", token); // Debug log
      return res.status(404).json({ message: "User not found" });
    }
    const meetings = await Meeting.find({ user_id: user._id });
    res.json(meetings);
  } catch (e) {
    console.error("getUserHistory error:", e); // Better error logging
    res.status(500).json({ message: `Something went wrong: ${e}` });
  }
};

// add to history (creates a meeting record)
const addToHistory = async (req, res) => {
  const { token, meeting_code, scheduled_date } = req.body;
  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const newMeeting = new Meeting({
      user_id: user._id,
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
  const { token, name, email } = req.body;
  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();
    res.status(200).json({ message: "Profile updated", user });
  } catch (e) {
    res.status(500).json({ message: `Failed to update profile: ${e}` });
  }
};

// Reset user password using OTP verification
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

// Generate OTP and send email
const generateOtp = async (req, res) => {
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
    const { token, meetingCode, scheduledFor, meetingTitle } = req.body;

    // Input validation
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    if (!meetingCode) {
      return res.status(400).json({ message: "Meeting code is required" });
    }

    console.log("Looking for user with token:", token); // Debug log

    const user = await User.findOne({ token });
    if (!user) {
      console.log("No user found with token:", token); // Debug log
      console.log(
        "Available users:",
        await User.find({}, { username: 1, token: 1 })
      ); // Debug log
      return res.status(404).json({
        message: "User not found",
        debug: "Invalid or expired token",
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
    meetingDetails = {
      meetingId : meetingSaved._id,
      meetingCode : meetingSaved.meetingCode,
      meetingHost : meetingSaved.user_id
    }
    
    res.status(201).json({
      message: "Meeting created successfully",
      data: meetingDetails
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res
      .status(500)
      .json({ message: "Failed to create meeting", error: error.message });
  }
};

const joinCreatedMeeting = async(req, res) => {
  try {
    const { token, meetingCode, meetingHost } = req.body;

    // Input validation
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    if (!meetingCode) {
      return res.status(400).json({ message: "Meeting code is required" });
    }

    console.log("Looking for user with token:", token); // Debug log

    const user = await User.findOne({ token });
    if (!user) {
      console.log("No user found with token:", token); // Debug log
      console.log(
        "Available users:",
        await User.find({}, { username: 1, token: 1 })
      ); // Debug log
      return res.status(404).json({
        message: "User not found",
        debug: "Invalid or expired token",
      });
    }

    console.log("User found:", user.username); // Debug log

    const existingMeeting = await Meeting.findOne({
      user_id: meetingHost, 
      meetingCode 
      });
    
    if (existingMeeting && existingMeeting.joinedAt && existingMeeting.isCompleted) {
      return res.status(400).json({
        message: "Meeting has ended already. Create another one."
      });
    }

    if (existingMeeting && existingMeeting.joinedAt && existingMeeting.user_id != user._id) {
      return res.status(201).json({
        message: "Meeting open to join successfully"
      });
    }

    if (existingMeeting && !existingMeeting.joinedAt && existingMeeting.user_id == user._id) {
      existingMeeting.joinedAt = new Date();
      await existingMeeting.save()
      return res.status(201).json({
        message: "Meeting updated successfully"
      });
    }

    if (existingMeeting && !existingMeeting.joinedAt && existingMeeting.user_id != user._id) {
      return res.status(400).json({
        message: "Meeting not in session. Please wait for host to start."
      });
    } 
    return res.status(400).json({
      message: "Meeting not found."
    });
  } catch (error) {
    console.error("Error joining meeting:", error);
    res
      .status(500)
      .json({ message: "Failed to join meeting", error: error.message });
  }
}


// Join meeting - validate meeting code and return meeting info
const joinMeeting = async (req, res) => {
  try {
    const { meetingCode } = req.body;
    const meeting = await Meeting.findOne({ meetingCode });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting code not found" });
    }

    res.status(200).json(meeting);
  } catch (error) {
    console.error("Error joining meeting:", error);
    res.status(500).json({ message: "Failed to join meeting" });
  }
  try {
    const { token, meetingCode } = req.body;

    // Input validation
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    if (!meetingCode) {
      return res.status(400).json({ message: "Meeting code is required" });
    }

    console.log("Looking for user with token:", token); // Debug log

    const user = await User.findOne({ token });
    if (!user) {
      console.log("No user found with token:", token); // Debug log
      console.log(
        "Available users:",
        await User.find({}, { username: 1, token: 1 })
      ); // Debug log
      return res.status(404).json({
        message: "User not found",
        debug: "Invalid or expired token",
      });
    }

    console.log("User found:", user.username); // Debug log

    const existingMeeting = await Meeting.findOne({ 
      meetingCode 
      });
    
    if (existingMeeting && existingMeeting.joinedAt && existingMeeting.isCompleted) {
      return res.status(400).json({
        message: "Meeting ended already. Create another"
      });
    }

    if (existingMeeting && existingMeeting.joinedAt && existingMeeting.user_id != user._id) {
      return res.status(201).json({
        message: "Meeting open to join successfully"
      });
    }

    if (existingMeeting && !existingMeeting.joinedAt && existingMeeting.user_id != user._id) {
      return res.status(400).json({
        message: "Meeting not in session. Please wait host to start."
      });
    } 
  } catch (error) {
    console.error("Error joining meeting:", error);
    res
      .status(500)
      .json({ message: "Failed to create meeting", error: error.message });
  }
};

// Update meeting history after meeting ends
const updateMeetingHistory = async (req, res) => {
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

// Get upcoming meetings for user
const getUpcomingMeetings = async (req, res) => {
  try {
    const userId = req.params.userId;
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

// Get completed meetings for user
const getCompletedMeetings = async (req, res) => {
  try {
    const userId = req.params.userId;

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

const endMeeting = async (req, res) =>{
  try {
    const { token, meetingId, enableAttendance, enableRecording, enableSummary } = req.body;

    // Input validation
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    if (!meetingId) {
      return res.status(400).json({ message: "MeetingId is required" });
    }

    const user = await User.findOne({ token });
    if (!user) {
      console.log("No user found with token:", token); // Debug log
      console.log(
        "Available users:",
        await User.find({}, { username: 1, token: 1 })
      ); // Debug log
      return res.status(404).json({
        message: "User not found",
        debug: "Invalid or expired token",
      });
    }
    const meetingData = await Meeting.findById({ meetingId });
    
    if (meetingData  && meetingData.user_id != user._id) {
      return res.status(200).json({
        message: "Meeting has been ended."
      });
    }
    if (meetingData && meetingData.joinedAt && !meetingData.isCompleted && meetingData.user_id == user._id) {
      meetingData.endedAt = new Date();
      meetingData.isCompleted = true;
      //.getTime() is in miliseconds
      const durationMs = meetingData.endedAt.getTime() - meetingData.joinedAt.getTime(); 
      // meetingData.duration = Math.floor(durationMs / 1000); //convert ms to sec
      meetingData.duration = durationMs;
      await meetingData.save();
      if(enableAttendance || enableRecording || enableSummary){
        const attendanceResponse = await fetch(`${server_url}/api/v1/attendance/meeting_ended`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                meetingId: meetingData._id,
                enableAttendance, 
                enableRecording, 
                enableSummary 
            }),
        });
      }

      // 4. Check if the attendance service call was successful
      if (!attendanceResponse.ok ) {
          console.error("Attendance service failed to process meeting end.");
          // Log the error but proceed with success response for the main action
      }

      return res.status(201).json({
        message: "Meeting ended and updated successfully"
      });
    }

    if (!meetingData) {
      return res.status(404).json({
        message: "Meeting not found"
      });
    }
   
  } catch (error) {
    console.error("Error ending meeting:", error);
    res
      .status(500)
      .json({ message: "Failed to end meeting", error: error.message });
  }
}


export {
  login,
  register,
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
};
