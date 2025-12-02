import { Meeting } from "../models/meeting.model.js";
import VideoFile from "../models/file.model.js";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";

// --- GridFS Setup Assumption ---
// In a real application, gfsBucket would be initialized and exported from your database file.
// We are assuming a mongoose connection has been made.
const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
	bucketName: "recordings",
});
// ------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories for local file storage (relative path assumed for uploads)
const uploads_dir = path.join(__dirname, "..", "..", "uploads");

// Helper function for GridFS streaming (used for both recordings and images)
const saveFileToGridFS = async (filePath, filename, metadata) => {
	const fileStream = await fs.open(filePath, "r");
	const readableStream = fileStream.createReadStream();

	const uploadStream = gfsBucket.openUploadStream(filename, {
		metadata: metadata,
		contentType: metadata.contentType || "application/octet-stream",
	});

	return new Promise((resolve, reject) => {
		readableStream
			.pipe(uploadStream)
			.on("error", (error) => {
				fileStream.close();
				reject(error);
			})
			.on("finish", () => {
				fileStream.close();
				resolve(uploadStream.id);
			});
	});
};

// --- API Endpoints ---

/**
 * Endpoint: /api/files/recording
 * Uploads the meeting's recording from local disk to MongoDB GridFS.
 */
const saveRecording = async (req, res) => {
	const { meetingId } = req.body;
	if (!meetingId) {
		return res.status(400).json({ message: "Meeting ID is required." });
	}

	const filename = `${meetingId}.webm`;
	const filePath = path.join(uploads_dir, "recordings", filename);

	try {
		await fs.access(filePath); // Check if file exists

		const fileId = await saveFileToGridFS(filePath, filename, {
			meetingId,
			fileType: "recording", // Metadata field as requested
			contentType: "video/webm",
		});

		// Save the GridFS metadata reference to the VideoFile model
		const videoFile = new VideoFile({
			fileId: fileId,
			filename: filename,
			contentType: "video/webm",
			metadata: { meetingId, fileType: "recording" },
			// Note: length and uploadDate are handled by GridFS but can be set here if needed
		});
		await videoFile.save();

		// Optional: Remove the local file after successful GridFS upload
		await fs.unlink(filePath);

		res.status(201).json({
			message: "Recording uploaded successfully to GridFS.",
			fileId,
		});
	} catch (error) {
		console.error("Error saving recording:", error);
		res.status(500).json({
			message: "Failed to save recording.",
			error: error.message,
		});
	}
};

/**
 * Endpoint: /api/files/recording/:meetingId
 * Retrieves and streams the recording from GridFS to be playable media.
 */
const getRecording = async (req, res) => {
	const { meetingId } = req.params;

	try {
		const fileRecord = await VideoFile.findOne({
			"metadata.meetingId": meetingId,
			"metadata.fileType": "recording",
		});

		if (!fileRecord) {
			return res.status(404).json({ message: "Recording not found." });
		}

		// Set headers for streaming video
		res.set({
			"Content-Type": fileRecord.contentType,
			"Content-Length": fileRecord.length,
			"Content-Disposition": `inline; filename="${fileRecord.filename}"`,
		});

		// Open download stream from GridFS
		gfsBucket.openDownloadStream(fileRecord.fileId).pipe(res);
	} catch (error) {
		console.error("Error retrieving recording:", error);
		res.status(500).json({
			message: "Failed to retrieve recording.",
			error: error.message,
		});
	}
};

/**
 * Endpoint: /api/files/images
 * Uploads all images for a meeting from local disk to MongoDB GridFS.
 * Filenames are expected to be 'userId_timestamp.ext'.
 */
const saveImages = async (req, res) => {
	const { meetingId } = req.body;
	if (!meetingId) {
		return res.status(400).json({ message: "Meeting ID is required." });
	}

	const folderPath = path.join(uploads_dir, "images", meetingId);
	let uploadedCount = 0;

	try {
		const filenames = await fs.readdir(folderPath);

		for (const filename of filenames) {
			if (filename.match(/\.(jpg|jpeg|png)$/i)) {
				const parts = filename.split("_", 2);
				const userId = parts[0];
				const filePath = path.join(folderPath, filename);
				const contentType =
					path.extname(filename) === ".png" ? "image/png" : "image/jpeg";

				const fileId = await saveFileToGridFS(filePath, filename, {
					meetingId,
					userId,
					fileType: "image",
					contentType,
				});

				// Save the GridFS metadata reference
				const videoFile = new VideoFile({
					fileId: fileId,
					filename: filename,
					contentType: contentType,
					metadata: { meetingId, userId, fileType: "image" },
				});
				await videoFile.save();
				uploadedCount++;

				// Optional: Remove the local file after successful GridFS upload
				await fs.unlink(filePath);
			}
		}

		// Remove the empty directory after processing all files
		await fs.rmdir(folderPath, { recursive: true });

		res.status(201).json({
			message: `${uploadedCount} images saved successfully to GridFS.`,
			uploadedCount,
		});
	} catch (error) {
		console.error("Error saving images:", error);
		res.status(500).json({
			message: "Failed to save images.",
			error: error.message,
		});
	}
};

/**
 * Endpoint: /api/files/text/:fileType
 * Saves a plain text file (summary or transcript) to the local file system.
 */
const saveTextFile = async (req, res) => {
	const { meetingId, content } = req.body;
	const { fileType } = req.params; // 'summary' or 'transcripts'

	if (!meetingId || !content) {
		return res
			.status(400)
			.json({ message: "Meeting ID and content are required." });
	}
	if (fileType !== "summary" && fileType !== "transcript") {
		return res.status(400).json({
			message: "Invalid fileType. Must be 'summary' or 'transcripts'.",
		});
	}

	// Save the file to a dedicated text directory
	const textDir = path.join(uploads_dir, fileType);
	const filename = `${fileType}_${meetingId}.txt`;
	const filePath = path.join(textDir, filename);

	try {
		await fs.mkdir(textDir, { recursive: true }); // Ensure directory exists
		await fs.writeFile(filePath, content, "utf-8");

		// NOTE: No GridFS is used. The path/metadata must be saved on the Meeting model
		// or a new TextFile model for future retrieval.
		// For simplicity, we assume file system persistence is sufficient.

		res.status(201).json({
			message: `${fileType} saved successfully to ${filePath}.`,
		});
	} catch (error) {
		console.error(`Error saving ${fileType}:`, error);
		res.status(500).json({
			message: `Failed to save ${fileType}.`,
			error: error.message,
		});
	}
};

/**
 * Endpoint: /api/files/text/:meetingId/:fileType
 * Retrieves the content of a saved text file.
 */
const getFile = async (req, res) => {
	const { meetingId, fileType } = req.params;

	if (fileType !== "summary" && fileType !== "transcript") {
		return res.status(400).json({
			message: "Invalid fileType. Must be 'summary' or 'transcript'.",
		});
	}

	const filename = `${fileType}.txt`;
	const filePath = path.join(uploads_dir, "text_files", meetingId, filename);

	try {
		const content = await fs.readFile(filePath, "utf-8");
		res.status(200).set("Content-Type", "text/plain").send(content);
	} catch (error) {
		if (error.code === "ENOENT") {
			return res.status(404).json({ message: `${fileType} file not found.` });
		}
		console.error(`Error retrieving ${fileType}:`, error);
		res.status(500).json({
			message: `Failed to retrieve ${fileType}.`,
			error: error.message,
		});
	}
};

/**
 * Endpoint: /api/files/download-pdf/:meetingId/:fileType
 * Reads a text file and generates a PDF for download. (Requires a PDF library like 'pdfkit')
 */
const downloadFileAsPdf = async (req, res) => {
	const { meetingId, fileType } = req.params;

	if (fileType !== "summary" && fileType !== "transcript") {
		return res.status(400).json({
			message: "Invalid fileType. Must be 'summary' or 'transcript'.",
		});
	}

	const filename = `${fileType}.txt`;
	const filePath = path.join(uploads_dir, "text_files", meetingId, filename);

	try {
		const content = await fs.readFile(filePath, "utf-8");

		// --- PDF Generation Logic (Placeholder) ---
		// In a real application, you would use a library like 'pdfkit' here.

		// Example with a placeholder text:
		const pdfPlaceholderContent = `--- ${fileType.toUpperCase()} for Meeting ${meetingId} ---\n\n${content}`;

		// Simulating PDF generation and streaming
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${fileType}_${meetingId}.pdf"`
		);

		// For a real library, you would pipe the PDF document stream to res
		const pdfBuffer = Buffer.from(pdfPlaceholderContent); // Replace with actual PDF Buffer
		res.send(pdfBuffer);
		// ------------------------------------------
	} catch (error) {
		if (error.code === "ENOENT") {
			return res
				.status(404)
				.json({ message: `${fileType} file not found for PDF generation.` });
		}
		console.error(`Error generating PDF for ${fileType}:`, error);
		res.status(500).json({
			message: `Failed to download ${fileType} as PDF.`,
			error: error.message,
		});
	}
};

export {
	saveRecording,
	getRecording,
	saveImages,
	saveTextFile as saveTranscripts, // Use alias for clearer mapping
	saveTextFile as saveSummary, // Use alias for clearer mapping
	getFile,
	downloadFileAsPdf,
};
