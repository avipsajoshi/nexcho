import { Router } from "express";
import { getRecording, saveText } from "../controllers/file.controller.js";
import { runRecordingUpload } from "../services/recording.service.js";
import { getBucket } from "../services/gridfs.js";

const router = Router();

router.route("/get_recording/:meetingId").get(getRecording);
router.get("/get_recording_local/:id", (req, res) => {
	const id = req.params.id;
	const filePath = `D:/E/8th sem/project III/nex/nexcho/backend/uploads/recordings/${id}.webm`;
	res.setHeader("Content-Type", "video/webm");
	res.sendFile(filePath);
});
router.route("/save_texts").post(saveText);
router.get("/video/stream/:id", async (req, res) => {
	const bucket = getBucket;
	const id = new mongoose.Types.ObjectId(req.params.id);

	const downloadStream = bucket.openDownloadStream(id);

	res.set("Content-Type", "video/webm");

	downloadStream.on("error", () => res.sendStatus(404));
	downloadStream.pipe(res);
});

router.route("/getsummary/:meetingId", async (req, res) => {
	const { meetingId } = req.params;

	try {
		await runRecordingUpload(meetingId);
		res
			.status(200)
			.json({ message: `Recording upload triggered for meeting ${meetingId}` });
	} catch (err) {
		console.error("Error running recording upload:", err);
		res.status(500).json({ message: "Failed to run recording upload" });
	}
});
export default router;
