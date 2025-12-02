// socket.server.js
import { Server } from "socket.io";
import { Attendance, Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

let connections = {};
let messages = {};
let timeOnline = {};
let usermap = {};
let hostMap = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploads_dir = path.join(__dirname, "..", "..", "..", "uploads");

export const connectToSocket = (server) => {
	const io = new Server(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"],
			allowedHeaders: ["*"],
			credentials: true,
		},
	});

	io.on("connection", (socket) => {
		// ---- JOIN CALL ----
		// note: use `roomPath` rather than `path` to avoid shadowing the `path` module
		socket.on("join-call", async (roomPath, username) => {
			try {
				if (!roomPath) return;

				const meetingCode = String(roomPath).split("/").pop();
				const meeting = await Meeting.findOne({ meetingCode: meetingCode });

				const host = meeting ? await User.findById(meeting.user_id) : null;

				if (connections[roomPath] === undefined) {
					connections[roomPath] = [];
					usermap[roomPath] = {};
				}

				// register connection
				connections[roomPath].push(socket.id);
				usermap[roomPath][socket.id] = username;

				// find host socket id if present in this room
				const hostSocketId = Object.entries(usermap[roomPath]).find(
					([, name]) => name === host?.username
				)?.[0];

				hostMap[roomPath] = hostSocketId;
				timeOnline[socket.id] = new Date();

				// notify everyone already in the room about the new user
				for (let i = 0; i < connections[roomPath].length; i++) {
					io.to(connections[roomPath][i]).emit(
						"user-joined",
						socket.id,
						connections[roomPath],
						usermap[roomPath],
						host?.username,
						hostSocketId
					);
				}

				// replay recent messages to the newly joined user
				if (messages[roomPath] !== undefined) {
					for (let i = 0; i < messages[roomPath].length; ++i) {
						io.to(socket.id).emit(
							"chat-message",
							messages[roomPath][i]["data"],
							messages[roomPath][i]["sender"],
							messages[roomPath][i]["socket-id-sender"]
						);
					}
				}
			} catch (err) {
				console.error("Error in join-call:", err);
				io.to(socket.id).emit("error", "Failed to join call");
			}
		});

		// ---- SIGNAL ----
		socket.on("signal", (toId, message) => {
			try {
				if (!toId) return;
				io.to(toId).emit("signal", socket.id, message);
			} catch (err) {
				console.error("Error in signal:", err);
			}
		});

		// ---- CHAT MESSAGE ----
		socket.on("chat-message", (data, sender) => {
			try {
				const [matchingRoom, found] = Object.entries(connections).reduce(
					([room, isFound], [roomKey, roomValue]) => {
						if (
							!isFound &&
							Array.isArray(roomValue) &&
							roomValue.includes(socket.id)
						) {
							return [roomKey, true];
						}
						return [room, isFound];
					},
					["", false]
				);

				if (found === true) {
					if (messages[matchingRoom] === undefined) {
						messages[matchingRoom] = [];
					}

					messages[matchingRoom].push({
						sender: sender,
						data: data,
						"socket-id-sender": socket.id,
					});

					connections[matchingRoom].forEach((elem) => {
						io.to(elem).emit("chat-message", data, sender, socket.id);
					});
				}
			} catch (err) {
				console.error("Error in chat-message:", err);
			}
		});

		// ---- DISCONNECT ----
		socket.on("disconnect", () => {
			try {
				const startTime = timeOnline[socket.id];
				const diffTime = startTime ? Math.abs(startTime - new Date()) : 0;

				// find which room(s) this socket belonged to
				for (const [k, v] of Object.entries(connections)) {
					for (let a = 0; a < v.length; ++a) {
						if (v[a] === socket.id) {
							// notify others in this room
							for (let i = 0; i < connections[k].length; ++i) {
								io.to(connections[k][i]).emit("user-left", socket.id);
							}

							const index = connections[k].indexOf(socket.id);
							if (index !== -1) connections[k].splice(index, 1);

							if (connections[k].length === 0) {
								delete connections[k];
							}
						}
					}
				}

				// cleanup maps
				delete timeOnline[socket.id];
				for (const r in usermap) {
					if (usermap[r] && usermap[r][socket.id]) {
						delete usermap[r][socket.id];
					}
				}
			} catch (err) {
				console.error("Error on disconnect:", err);
			}
		});

		// ---- END MEETING ----
		// rename 'path' arg to 'roomPath' here as well
		socket.on("end-meeting", (requestorSocketId, roomPath) => {
			const meetingCode = roomPath.split("/").pop();

			//check permission here before ending meeting
			const hostSocketId = hostMap[roomPath];
			if (hostSocketId !== requestorSocketId) {
				return io
					.to(requestorSocketId)
					.emit("error", "Only the host can end the meeting");
			}
			for (let a = 0; a < connections[roomPath].length; a++) {
				io.to(connections[roomPath][a]).emit("meeting-ended");
			}
		});
		// socket.on("end-meeting", (requestorSocketId, roomPath) => {
		//   (async () => {
		//     try {
		//       if (!roomPath) return;

		//       const meetingCode = String(roomPath).split("/").pop();

		//       // permission check
		//       const hostSocketId = hostMap[roomPath];
		//       if (hostSocketId !== requestorSocketId) {
		//         return io
		//           .to(requestorSocketId)
		//           .emit("error", "Only the host can end the meeting");
		//       }

		//       const meeting = await Meeting.findOne({ meetingCode: meetingCode });
		//       if (!meeting) {
		//         console.warn("Meeting not found for code:", meetingCode);
		//         return;
		//       }

		//       meeting.isCompleted = true;
		//       meeting.endedAt = new Date();

		//       await meeting.save();
		//       console.log("Meeting ended successfully");

		//       // fetch latest meeting data (in case save changed fields)
		//       const meetingData = await Meeting.findOne({
		//         meetingCode: meetingCode,
		//       });
		//       if (!meetingData) {
		//         console.warn(
		//           "No meetingData after ending meeting for code:",
		//           meetingCode
		//         );
		//       } else {
		//         try {
		//           console.log("Processing attendance for ended meeting...");

		//           const meetingIdStr = meetingData._id.toString();
		//           const folderPath = path.join(uploads_dir, "images", meetingIdStr);
		//           console.log("Folder path for attendance:", folderPath);

		//           // read directory safely
		//           let filenames = [];
		//           try {
		//             filenames = await fs.readdir(folderPath);
		//           } catch (e) {
		//             if (e.code === "ENOENT") {
		//               console.warn("Attendance folder does not exist:", folderPath);
		//               filenames = [];
		//             } else {
		//               throw e;
		//             }
		//           }

		//           console.log("Filenames in folder:", filenames);

		//           // Extract Unique User IDs (pattern: <userId>_<timestamp>.<ext>)
		//           const uniqueUserIds = new Set();
		//           filenames.forEach((filename) => {
		//             try {
		//               if (!filename || filename.startsWith(".")) return;
		//               // only jpg/png (case-insensitive)
		//               if (!/\.(jpe?g|png)$/i.test(filename)) return;

		//               // split at first underscore
		//               const firstUnderscore = filename.indexOf("_");
		//               if (firstUnderscore === -1) return;

		//               const userIdPart = filename.slice(0, firstUnderscore);

		//               // timestamp portion (rest of name after underscore, remove extension)
		//               const tsWithExt = filename.slice(firstUnderscore + 1);
		//               const tsStr = tsWithExt.replace(/\.[^.]+$/, "");

		//               // try numeric timestamp first, then Date.parse
		//               let tsMillis = Number(tsStr);
		//               if (Number.isNaN(tsMillis)) {
		//                 const parsed = Date.parse(tsStr);
		//                 if (!Number.isNaN(parsed)) tsMillis = parsed;
		//               }

		//               // compare with meeting times if available
		//               if (
		//                 !Number.isNaN(tsMillis) &&
		//                 meetingData.joinedAt &&
		//                 meetingData.endedAt
		//               ) {
		//                 const joinedMillis = new Date(
		//                   meetingData.joinedAt
		//                 ).getTime();
		//                 const endedMillis = new Date(meetingData.endedAt).getTime();
		//                 if (tsMillis >= joinedMillis && tsMillis <= endedMillis) {
		//                   uniqueUserIds.add(userIdPart);
		//                 }
		//               } else {
		//                 // optional fallback: add user id if we cannot parse timestamp
		//                 // uniqueUserIds.add(userIdPart);
		//               }
		//             } catch (innerErr) {
		//               console.warn(
		//                 "Skipping filename due to parse error:",
		//                 filename,
		//                 innerErr
		//               );
		//             }
		//           });

		//           console.log(
		//             "Unique User IDs for attendance:",
		//             Array.from(uniqueUserIds)
		//           );

		//           // TODO: persist attendance to DB if required

		//           for (const userId of uniqueUserIds) {
		//             await Attendance.create({
		//               meeting_id: meetingData._id,
		//               user_id: userId,
		//               final_percent: 0, // put final percentage formula
		//             });
		//           }
		//         } catch (err) {
		//           console.error("Error processing attendance:", err);
		//         }
		//       }

		//       // notify connected sockets in this room about meeting end (guard if connections missing)
		//       if (connections[roomPath]) {
		//         for (let i = 0; i < connections[roomPath].length; i++) {
		//           io.to(connections[roomPath][i]).emit("meeting-ended");
		//         }
		//       }
		//     } catch (err) {
		//       console.error("Error in end-meeting handler:", err);
		//     }
		//   })();
		// });
	});

	return io;
};
