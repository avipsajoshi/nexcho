import { Router } from "express";
import { meetingEnded } from "../controllers/attendance.controller.js";

import { Meeting, Attendance } from "../models/meeting.model.js";

const router = Router();

router.route("/meeting_ended").post(meetingEnded);


export default router;