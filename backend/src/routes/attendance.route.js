import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { meetingEnded } from "../controllers/attendance.controller.js";

import { Meeting, Attendance } from "../models/meeting.model.js";

const router = Router();
const upload = multer({ storage });

router.route("/meeting_ended").post(meetingEnded);


export default router;