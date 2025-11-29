import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { IconButton, TextField, Button, Badge, Tooltip } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord"; // Recording indicator
import styles from "../styles/videoComponent.module.css";
import server from "../environment";
import { useUserData } from "../hooks/useUserData";
import axios from "axios";

const server_url = server;
// Store RTCPeerConnections by socket ID
let connections = {};
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  // Refs
  const socketRef = useRef(); // Socket.io client
  const socketIdRef = useRef(); // This client’s socket ID
  const localVideoRef = useRef(); // Local video element

  // Recording state and refs
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);

  // Video call states
  const [videos, setVideos] = useState([]); // Remote streams
  const [usernames, setUsernames] = useState({}); // Map socketId => username
  const [hostInfo, setHostInfo] = useState({}); // Host username and socket ID
  const [video, setVideo] = useState(true); // Local video on/off
  const [audio, setAudio] = useState(true); // Local audio on/off
  const [screen, setScreen] = useState(false); // Screen sharing active
  const [screenAvailable, setScreenAvailable] = useState(false); // Browser support

  // Chat states
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [showModal, setModal] = useState(false);

  // Lobby username states
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const storedData = useUserData();

  // Extract meeting code (room name) from URL path
  const meetingCode = window.location.pathname.slice(1);

  // On mount: request camera/mic and check screen share availability
  useEffect(() => {
    getPermissions();
  }, []);

  const meetingDataFetchRef = useRef(false);

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (meetingDataFetchRef.current) return;
      meetingDataFetchRef.current = true;

      await fetch(`${server_url}/api/v1/users/get_meeting/${meetingCode}`).then(
        async (res) => {
          if (!res.ok) {
            alert("Meeting not found or has ended.");
            window.location.href = "/home";
          }
        }
      );
    };
    fetchMeetingData();
  }, [meetingCode]);

  // Additional effect to handle video ref updates when stream changes
  useEffect(() => {
    const setupLocalVideo = async () => {
      if (window.localStream && localVideoRef.current && !askForUsername) {
        localVideoRef.current.srcObject = window.localStream;
        try {
          await localVideoRef.current.play();
        } catch (err) {
          console.log("Video play error (can be ignored):", err);
        }
      }
    };
    setupLocalVideo();
  }, [askForUsername, video]);

  // Ensure local video is always showing the current stream
  useEffect(() => {
    if (window.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = window.localStream;
      // Force the video to play
      localVideoRef.current.play().catch((err) => {
        console.log("Video play error (can be ignored):", err);
      });
    }
  }, [video, audio]);

  async function getPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      window.localStream = stream;

      // Ensure the local video ref is updated
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Force play after setting srcObject
        await localVideoRef.current.play().catch((err) => {
          console.log("Video play error (can be ignored):", err);
        });
        console.log("Local video stream set successfully");
      }

      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    } catch (err) {
      console.error("Permission error:", err);
      throw err; // Re-throw to handle in connect function
    }
  }

  // === Recording logic ===
  const startRecording = () => {
    if (!window.localStream) {
      alert("No media stream available to record.");
      return;
    }
    recordedChunks.current = [];
    const options = { mimeType: "video/webm" };

    try {
      const mediaRecorder = new MediaRecorder(window.localStream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks.current, { type: "video/webm" });
        const formData = new FormData();
        formData.append("video", blob);
        formData.append("meetingCode", meetingCode);

        try {
          const res = await fetch(`${server_url}/api/recording/upload`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (res.ok) alert("Recording uploaded successfully!");
          else {
            alert("Failed to upload recording");
            console.error(data);
          }
        } catch (error) {
          alert("Error uploading recording");
          console.error(error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("MediaRecorder not supported or error occurred");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // === Socket.io and WebRTC connection ===
  const connectToSocketServer = () => {
    // Double-check that we have a valid stream before connecting
    if (!window.localStream) {
      console.error(
        "No local stream available when connecting to socket server"
      );
      alert("Media stream not available. Please refresh and try again.");
      return;
    }

    socketRef.current = io.connect(server_url, { secure: false });

    // Listen for signaling messages from server
    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      // Join the meeting room on server
      socketRef.current.emit("join-call", window.location.href, username);
      socketIdRef.current = socketRef.current.id;

      // Chat message listener
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("meeting-ended", () => {
        alert("Meeting has been ended by the host.");
        handleEndCall();
      });

      // When a user leaves
      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((v) => v.socketId !== id));
        delete connections[id];
      });

      // When a user joins or when joining existing users info
      socketRef.current.on(
        "user-joined",
        (id, clients, usernamesObj, hostUsername, hostSocketId) => {
          setUsernames(usernamesObj);
          setHostInfo({
            hostUsername: hostUsername,
            hostSocketId: hostSocketId,
          });

          clients.forEach((socketListId) => {
            if (socketListId === socketIdRef.current) return; // skip self

            // Create peer connection per remote user
            connections[socketListId] = new RTCPeerConnection(
              peerConfigConnections
            );

            // Add local media tracks to the connection
            if (window.localStream) {
              window.localStream.getTracks().forEach((track) => {
                connections[socketListId].addTrack(track, window.localStream);
              });
            }

            // Send ICE candidates to remote peer via signaling server
            connections[socketListId].onicecandidate = (event) => {
              if (event.candidate) {
                socketRef.current.emit(
                  "signal",
                  socketListId,
                  JSON.stringify({ ice: event.candidate })
                );
              }
            };

            // When remote tracks received, add remote stream to videos state
            connections[socketListId].ontrack = (event) => {
              const stream = event.streams[0];
              if (stream) {
                setVideos((prev) => {
                  if (prev.find((v) => v.socketId === socketListId))
                    return prev;
                  return [...prev, { socketId: socketListId, stream }];
                });
              }
            };
          });

          // If this client just joined, create offers to others
          if (id === socketIdRef.current) {
            Object.keys(connections).forEach((id2) => {
              if (id2 === socketIdRef.current) return;
              connections[id2]
                .createOffer()
                .then((offer) => connections[id2].setLocalDescription(offer))
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                });
            });
          }
        }
      );
    });
  };

  // Handle incoming signaling messages from server
  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;

    if (signal.sdp) {
      connections[fromId]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromId]
              .createAnswer()
              .then((answer) => connections[fromId].setLocalDescription(answer))
              .then(() => {
                socketRef.current.emit(
                  "signal",
                  fromId,
                  JSON.stringify({ sdp: connections[fromId].localDescription })
                );
              });
          }
        });
    }

    if (signal.ice) {
      connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
    }
  };

  // Toggle local video on/off
  const handleVideo = () => {
    if (window.localStream) {
      const videoTracks = window.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        videoTrack.enabled = !videoTrack.enabled;
        setVideo(videoTrack.enabled);
      }
    }
  };

  // Toggle local audio on/off
  const handleAudio = () => {
    if (window.localStream) {
      const audioTracks = window.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        audioTrack.enabled = !audioTrack.enabled;
        setAudio(audioTrack.enabled);
      }
    }
  };

  // Screen sharing toggle
  const handleScreen = async () => {
    if (!screen) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        // Replace video track in all connections with screen stream track
        Object.values(connections).forEach((conn) => {
          const sender = conn
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenStream.getVideoTracks()[0]);
        });

        localVideoRef.current.srcObject = screenStream;
        window.localStream = screenStream;

        // When user stops screen sharing, revert to camera
        screenStream.getVideoTracks()[0].addEventListener("ended", () => {
          revertToCamera();
        });

        setScreen(true);
      } catch (e) {
        console.error("Screen share error:", e);
      }
    } else {
      revertToCamera();
    }
  };

  // Switch back from screen sharing to camera
  const revertToCamera = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio,
      });
      Object.values(connections).forEach((conn) => {
        const sender = conn
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(cameraStream.getVideoTracks()[0]);
      });

      localVideoRef.current.srcObject = cameraStream;
      window.localStream = cameraStream;

      setScreen(false);
      setVideo(true);
    } catch (e) {
      console.error("Revert to camera error:", e);
    }
  };

  // End call cleanup and redirect to home
  const handleEndCall = () => {
    try {
      window.localStream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    Object.values(connections).forEach((c) => c.close());
    connections = {};
    window.location.href = "/home";
  };

  const handleEndMeeting = () => {
    socketRef.current.emit(
      "end-meeting",
      socketIdRef.current,
      window.location.href
    );
  };

  // Add new chat message, increment unread count if from other user
  const addMessage = (data, sender, id) => {
    setMessages((prev) => [...prev, { sender, data }]);
    if (id !== socketIdRef.current) setNewMessages((prev) => prev + 1);
  };

  // Send chat message via socket
  const sendMessage = () => {
    if (message.trim() === "") return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  // Connect to socket server after username entered
  const connect = async () => {
    if (!username.trim()) return;

    // Ensure we have a valid stream before connecting
    if (!window.localStream) {
      try {
        await getPermissions();
      } catch (error) {
        console.error("Failed to get media permissions:", error);
        alert("Camera/microphone access is required to join the meeting");
        return;
      }
    }

    if (window.localStream) {
      const videoTracks = window.localStream.getVideoTracks();
      const audioTracks = window.localStream.getAudioTracks();

      if (videoTracks.length > 0) {
        videoTracks[0].enabled = video;
      }
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = audio;
      }

      // Ensure local video is displaying the stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = window.localStream;
        // Force play to ensure video starts immediately
        localVideoRef.current.play().catch((err) => {
          console.log("Video play error (can be ignored):", err);
        });
      }
    }

    setAskForUsername(false);
    connectToSocketServer();
  };

  // Copy meeting code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(meetingCode);
    alert("Meeting code copied!");
  };

  // If stored username exists, set it automatically in lobby
  useEffect(() => {
    if (storedData) {
      setUsername(storedData?.username);
    }
  }, [storedData]);

  return (
    <div>
      {askForUsername ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 p-6">
          <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-1">
              Welcome to Nexcho
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your username to join
            </p>

            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="outlined"
              fullWidth
            />

            <div className="mt-6 relative">
              <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!video && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white rounded-lg text-sm font-medium">
                    Video Off
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4">
              <IconButton
                onClick={handleVideo}
                className="bg-white hover:bg-gray-100 shadow-sm"
                aria-label="toggle video"
              >
                {video ? <VideocamIcon color="primary" /> : <VideocamOffIcon />}
              </IconButton>
              <IconButton
                onClick={handleAudio}
                className="bg-white hover:bg-gray-100 shadow-sm"
                aria-label="toggle audio"
              >
                {audio ? <MicIcon color="primary" /> : <MicOffIcon />}
              </IconButton>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="contained"
                onClick={connect}
                disabled={!username.trim()}
                className="lobby-button-primary"
              >
                Connect
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => (window.location.href = "/home")}
                className="lobby-button-secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-white to-sky-50 p-6 relative">
          {/* ScreenshotCapture (hidden UI) */}
          <ScreenshotCapture localStream={window.localStream} />

          {/* TOP-LEFT: Recording area */}
          <div className="absolute top-4 left-4 flex items-center gap-4 z-50">
            {isRecording ? (
              <>
                <div className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full font-semibold">
                  <FiberManualRecordIcon />
                  <span>Recording...</span>
                </div>
                {hostInfo.hostSocketId === socketIdRef.current && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={stopRecording}
                    className="shadow"
                  >
                    Stop Recording
                  </Button>
                )}
              </>
            ) : (
              <>
                {hostInfo.hostSocketId === socketIdRef.current && (
                  <Button
                    variant="contained"
                    onClick={startRecording}
                    className="shadow"
                  >
                    Start Recording
                  </Button>
                )}
              </>
            )}
          </div>

          {/* TOP-RIGHT: Meeting code + copy */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
            <Tooltip title="Copy meeting code">
              <IconButton
                onClick={handleCopyCode}
                size="small"
                className="bg-white/90 shadow-sm"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <span className="bg-white/90 px-3 py-1 rounded-md text-sm font-medium border border-gray-100">
              Code: {meetingCode}
            </span>
          </div>

          {/* MAIN: Responsive adaptive video grid (auto-resizes like Google Meet) */}
          {(() => {
            const participantsCount = videos.length + 1; // local + remotes
            // number of columns tends to square root for near-square layout
            const cols = Math.ceil(Math.sqrt(participantsCount));
            const rows = Math.ceil(participantsCount / cols);
            // height leftover: adjust 180px if you change header/toolbar heights
            const containerHeight = `calc(100vh - 180px)`;
            const gridStyle = {
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridAutoRows: `calc(${containerHeight} / ${rows})`,
              height: containerHeight,
            };

            return (
              <div className="w-full gap-4 grid" style={gridStyle}>
                {/* Local video - make it visually distinct */}
                <div
                  className="relative rounded-xl overflow-hidden shadow-md bg-black"
                  key="local-video"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover bg-black"
                  />
                  <div className="absolute left-3 bottom-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md">
                    {username} (You)
                  </div>
                </div>

                {/* Remote videos */}
                {videos.map(({ socketId, stream }) => (
                  <RemoteVideo
                    key={socketId}
                    stream={stream}
                    username={
                      usernames ? usernames[socketId] || "Unknown" : "Unknown"
                    }
                  />
                ))}
              </div>
            );
          })()}

          {/* TOOLBAR: centered, floating */}
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-full shadow-lg px-4 py-2 flex items-center gap-2 z-50">
            <IconButton
              onClick={handleVideo}
              color={video ? "primary" : "default"}
              className={`${video ? "" : ""}`}
              aria-label="toggle video"
            >
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton
              onClick={handleAudio}
              color={audio ? "primary" : "default"}
              aria-label="toggle audio"
            >
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            <IconButton
              onClick={handleScreen}
              disabled={!screenAvailable}
              aria-label="screen share"
            >
              {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>

            <IconButton
              onClick={() => setModal((v) => !v)}
              aria-label="open chat"
            >
              <Badge badgeContent={newMessages} color="secondary">
                <ChatIcon />
              </Badge>
            </IconButton>

            <IconButton
              onClick={() => {
                if (hostInfo.hostSocketId === socketIdRef.current) {
                  handleEndMeeting();
                } else {
                  handleEndCall();
                }
              }}
              color="error"
              aria-label="end call"
            >
              <CallEndIcon />
            </IconButton>
          </div>

          {/* Chat modal */}
          {showModal && (
            <div className="fixed right-0 top-0 h-full w-80 shadow-xl flex flex-col bg-white text-black z-50">
              <div className="flex items-center justify-between border-b p-2">
                <h3 className="p-2 font-bold text-lg">Chat</h3>
                <IconButton
                  onClick={() => setModal(false)}
                  aria-label="close chat"
                >
                  <CloseIcon />
                </IconButton>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] p-2 rounded-lg ${
                      msg.sender === username
                        ? "ml-auto bg-indigo-600 text-white rounded-tl-none"
                        : "bg-gray-100 text-gray-800 rounded-tr-none"
                    }`}
                  >
                    <b className="block text-xs opacity-80">{msg.sender}:</b>
                    <span className="block mt-1">{msg.data}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t bg-white/95">
                <div className="flex gap-2">
                  <TextField
                    variant="outlined"
                    fullWidth
                    size="small"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Separate component to render remote video
function RemoteVideo({ stream, username }) {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-md bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover bg-black"
        muted={false}
      />
      <div className="absolute left-3 bottom-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md">
        {username}
      </div>
    </div>
  );
}

// ScreenshotCapture component - takes periodic screenshots and sends to backend
const ScreenshotCapture = ({ localStream }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const timerRef = useRef();

  useEffect(() => {
    if (!localStream) return;

    if (videoRef.current) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(() => {});
    }

    // Random interval between 3-10 seconds
    const randomInterval = () => Math.floor(Math.random() * 10000) + 5000;

    const takeScreenshot = () => {
      if (
        !canvasRef.current ||
        !videoRef.current ||
        videoRef.current.readyState < 2 // HAVE_CURRENT_DATA
      )
        return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64data = canvas.toDataURL("image/png");

      // Send to backend
      axios
        .post(`${server_url}/api/screenshot`, {
          image: base64data,
          username: localStorage.getItem("username") || "unknown_user",
        })
        .then(() => {
          // Success - do nothing
        })
        .catch((e) => {
          console.error("Screenshot upload error:", e);
        });
    };

    const scheduleNext = () => {
      timerRef.current = setTimeout(() => {
        takeScreenshot();
        scheduleNext();
      }, randomInterval());
    };

    scheduleNext();

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [localStream]);

  return (
    // hidden with Tailwind so markup is present but visually removed
    <div className="hidden" aria-hidden="true">
      <video ref={videoRef} muted playsInline className="hidden"></video>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};
