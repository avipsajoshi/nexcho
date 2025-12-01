import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// To get __dirname in ES Modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.post("/", (req, res) => {
  const { image, username, meeting, user } = req.body;

  if (!image || !username || !meeting || !user) {
    return res.status(400).json({ error: "Missing image or username" });
  }

  // Detect MIME type
  const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
  if (!mimeMatch) {
    return res.status(400).json({ error: "Invalid base64 image format" });
  }

  const mimeType = mimeMatch[1];                 // e.g. "image/png"
  const extension = mimeType.split("/")[1];      // e.g. "png"
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

  const filename = `${user}_${Date.now()}.${extension}`;
  const folderPath = path.join(__dirname, '..', '..', '..', 'uploads', 'images', meeting);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFile(path.join(folderPath, filename), base64Data, "base64", (err) => {
    if (err) {
      console.error("Error saving screenshot:", err);
      return res.status(500).json({ error: "Failed to save image" });
    }
    res.status(200).json({ message: "Screenshot saved", file: filename });
  });
});


export default router;
