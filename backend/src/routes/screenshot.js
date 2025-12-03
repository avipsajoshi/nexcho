import express from "express";
import fs from "fs"; // Still needed for directory checks
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { promisify } from "util";

// To get __dirname in ES Modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);
const router = express.Router();

// Define the absolute root path where 'uploads' is located
// Assuming /src/routes/ is two levels deep from nexcho/backend/
const uploadDir = path.join(__dirname, "..", "..", "uploads", "images");
const tempUploadDir = path.join(uploadDir, "temp");
if (!fs.existsSync(tempUploadDir)) {
	fs.mkdirSync(tempUploadDir, { recursive: true });
}

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		// 1. Always use the TEMPORARY directory.
		// This runs first and requires NO data from req.body or req.query.
		cb(null, tempUploadDir);
	},
	filename: (req, file, cb) => {
		// 2. Use a unique temporary name based on timestamp to avoid collisions
		const extension = path.extname(file.originalname);
		const tempName = `temp-${Date.now()}-${Math.floor(
			Math.random() * 10000
		)}${extension}`;
		cb(null, tempName);
	},
});

// Configure the Multer middleware
// The single('screenshot') must match the formData.append('screenshot', ...) key in the frontend

const upload = multer({ storage: storage }).single("screenshot");

router.post("/", (req, res) => {
	upload(req, res, async (err) => {
		const uploadedFile = req.file;
		let tempFilePath = uploadedFile ? uploadedFile.path : null;

		if (err) {
			console.error("Multer upload error:", err);
			// Clean up the temporary file if Multer failed after saving it
			if (tempFilePath && fs.existsSync(tempFilePath)) {
				await unlinkAsync(tempFilePath).catch(console.error);
			}
			return res
				.status(500)
				.json({ error: err.message || "Failed to upload image" });
		}

		// *** THIS BLOCK RUNS AFTER req.body IS POPULATED ***
		const { meeting, user } = req.body;

		// 1. Validate that the critical data is present
		if (!uploadedFile || !meeting || !user) {
			console.log("Missing file or user data:", {
				uploadedFile,
				meeting,
				user,
			});
			if (tempFilePath && fs.existsSync(tempFilePath)) {
				await unlinkAsync(tempFilePath).catch(console.error);
			}
			return res
				.status(400)
				.json({ error: "Missing image or necessary user data" });
		}

		try {
			// 2. Define the FINAL meeting-specific directory
			const finalFolder = path.join(uploadDir, String(meeting));
			if (!fs.existsSync(finalFolder)) {
				fs.mkdirSync(finalFolder, { recursive: true });
			}

			// 3. Define the final filename using reliable IDs
			const finalFilename = `${user}_${Date.now()}${path.extname(
				uploadedFile.originalname
			)}`;
			const finalPath = path.join(finalFolder, finalFilename);

			// 4. Move the file from the temporary location to the final location
			await renameAsync(tempFilePath, finalPath);

			// --- Database Logic Placeholder ---
			console.log(`Screenshot saved successfully: ${finalPath}`);
			// You would save finalPath or finalFilename to the database here.

			res.status(200).json({
				message: "Screenshot saved and metadata ready for DB",
				filePath: finalPath,
			});
		} catch (moveError) {
			console.error("Error moving or saving file:", moveError);
			// Attempt to clean up the temporary file path in case of failure
			if (tempFilePath && fs.existsSync(tempFilePath)) {
				await unlinkAsync(tempFilePath).catch(console.error);
			}
			res.status(500).json({ error: "Failed to process and save image." });
		}
	});
});

export default router;
