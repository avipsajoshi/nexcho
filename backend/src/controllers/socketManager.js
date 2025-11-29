import { Server } from "socket.io";
import { Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";

let connections = {};
let messages = {};
let timeOnline = {};
let usermap = {};
let hostMap = {};

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
    // console.log("SOMETHING CONNECTED");

    socket.on("join-call", async (path, username) => {
      const meetingCode = path.split("/").pop();
      const meeting = await Meeting.findOne({ meetingCode: meetingCode });

      const host = await User.findById(meeting.user_id);

      if (connections[path] === undefined) {
        connections[path] = [];
        usermap[path] = {};
      }
      connections[path].push(socket.id);
      usermap[path][socket.id] = username;

      const hostSocketId = Object.entries(usermap[path]).find(
        ([, name]) => name === host?.username
      )?.[0];

      hostMap[path] = hostSocketId;

      timeOnline[socket.id] = new Date();

      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit(
          "user-joined",
          socket.id,
          connections[path],
          usermap[path],
          host?.username,
          hostSocketId
        );
      }

      if (messages[path] !== undefined) {
        for (let a = 0; a < messages[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][a]["data"],
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"]
          );
        }
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
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
        // console.log("message", matchingRoom, ":", sender, data);

        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    socket.on("disconnect", () => {
      var diffTime = Math.abs(timeOnline[socket.id] - new Date());

      var key;

      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections))
      )) {
        for (let a = 0; a < v.length; ++a) {
          if (v[a] === socket.id) {
            key = k;

            for (let a = 0; a < connections[key].length; ++a) {
              io.to(connections[key][a]).emit("user-left", socket.id);
            }

            var index = connections[key].indexOf(socket.id);

            connections[key].splice(index, 1);

            if (connections[key].length === 0) {
              delete connections[key];
            }
          }
        }
      }
    });

    socket.on("end-meeting", (requestorSocketId, path) => {
      const meetingCode = path.split("/").pop();

      //check permission here before ending meeting
      const hostSocketId = hostMap[path];

      if (hostSocketId !== requestorSocketId) {
        return io
          .to(requestorSocketId)
          .emit("error", "Only the host can end the meeting");
      }

      Meeting.findOne({ meetingCode: meetingCode }).then((meeting) => {
        if (meeting) {
          meeting.isCompleted = true;
          meeting.endedAt = new Date();
          meeting
            .save()
            .then(() => {
              console.log("Meeting ended successfully");
            })
            .catch((error) => {
              console.error("Error ending meeting:", error);
            });
        }
      });

      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit("meeting-ended");
      }
    });
  });

  return io;
};
