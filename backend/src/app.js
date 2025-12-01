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

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.DATABASE_URL;


app.use(cors());
// const allowedOrigins = [
//   "https://nexcho-frontend.onrender.com",
//   "http://nexcho.local:3000",
//   "http://localhost:3000",
//   "https://nexcho-ml-backend.onrender.com",
//   "http://nexcho.local:8000",    
//   "http://localhost:8000"    
// ];
// app.use(
//   cors({
//     origin: allowedOrigins,
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );
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
    const connectionDb = await mongoose.connect(
      "mongodb+srv://nexchovida:Z6dzPqQy5Me4HVlE@cluster0.rwbfboa.mongodb.net/nexcho?appName=Cluster0"
    );
    console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);

    server.listen(PORT, () => {
      console.log(`NODE LISTENING ON PORT ${PORT}`);
    });
    // server.listen(PORT, "0.0.0.0", () => {
    //   console.log(`NODE LISTENING ON PORT ${PORT}`);
    // });
  } catch (error) {
    console.error("DB connection error:", error);
    // process.exit(1);
    try{
      const connectionDb = await mongoose.connect("mongodb://127.0.0.1:27017/nexcho");
      console.log(`MONGO Local Connected DB Host: ${connectionDb.connection.host}`);

      server.listen(PORT, () => {
        console.log(`NODE LISTENING ON PORT ${PORT}`);
      });

    } catch (error) {
      console.error("DB connection error:", error);
      process.exit(1);
    }
  }

}

start();
