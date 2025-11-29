import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// To get __dirname in ES Modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.post("/", (req, res) => {
  console.log("Screenshot POST received:", req.body);
  const { image, username } = req.body;

  if (!image || !username) {
    console.log("Missing image or username");
    return res.status(400).json({ error: "Missing image or username" });
  }

  // Remove data URL prefix if it's jpeg or png etc.
  const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
  const filename = `${username}_${Date.now()}.jpg`;
  const folderPath = path.join(__dirname, "..", "screenshots");

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  fs.writeFile(path.join(folderPath, filename), base64Data, "base64", (err) => {
    if (err) {
      console.error("Error saving screenshot:", err);
      return res.status(500).json({ error: "Failed to save image" });
    }

    res.status(200).json({ message: "Screenshot saved" });
  });
});

export default router;
