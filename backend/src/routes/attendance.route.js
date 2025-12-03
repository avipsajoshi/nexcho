import { Router } from "express";
import {
	calculateAttendance,
	getAttendance,
	meetingEnded,
} from "../controllers/attendance.controller.js";

const router = Router();

router.route("/meeting_ended").post(meetingEnded);
router.route("/calculate_attendance").post(calculateAttendance);
router.route("/get_attendance").post(getAttendance);

export default router;
