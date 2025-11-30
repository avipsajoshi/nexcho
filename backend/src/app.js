import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { Server } from "socket.io";
import { connectToSocket } from "./controllers/socketManager.js";

import userRoutes from "./routes/users.routes.js";
import screenshotRoutes from "./routes/screenshot.js";
import attendanceRoutes from "./routes/attendance.route.js";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

const PORT = process.env.PORT || 8000;
const PY_SERVER = process.env.PYTHON_APP_SERVER_URL;
const DB_URL = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/screenshot", screenshotRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/attendance", attendanceRoutes);

app.get("/", (req, res) => {
  res.send("API is running ✅");
});

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(DB_URL);
    console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);

    server.listen(PORT, () => {
      console.log(`LISTENING ON PORT ${PORT}`);
    });
  } catch (error) {
    console.error("DB connection error:", error);
    process.exit(1);
  }
};

start();
