import React, { useContext, useState, useEffect } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import {
  Button,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareIcon from "@mui/icons-material/Share";
import { AuthContext } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import server from "../environment";

const server_url = server;

function HomeComponent() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("userData"));
    setUser(storedUser);
  }, []);

  const [generatedCode, setGeneratedCode] = useState("");
  const [meetingCodeOrUrl, setMeetingCodeOrUrl] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [historyMeetings, setHistoryMeetings] = useState([]);
  const [activeTab, setActiveTab] = useState("join_schedule");
  const [loading, setLoading] = useState(false);

  const storedData = useUserData();
  const userId = storedData?._id || storedData?.username || null;

  // Tailwind helper classes for consistent button styling
  const btnBase =
    "rounded-lg px-4 py-2 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition";
  const primaryBtn = `${btnBase} bg-indigo-600 hover:bg-indigo-700 text-white`;
  const secondaryBtn = `${btnBase} bg-white hover:bg-gray-50 text-gray-800 border border-gray-200`;
  const iconBtnSubtle =
    "rounded-md p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700";
  const iconBtnSolid =
    "rounded-md p-1 bg-indigo-600 hover:bg-indigo-700 text-white";

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const pad = (n) => n.toString().padStart(2, "0");
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hour = pad(now.getHours());
    const minute = pad(now.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  useEffect(() => {
    if (!userId) return;

    fetch(`${server_url}/api/v1/users/get_upcoming_meetings/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUpcomingMeetings(data);
        else setUpcomingMeetings([]);
      })
      .catch(() => setUpcomingMeetings([]));

    fetch(`${server_url}/api/v1/users/get_completed_meetings/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistoryMeetings(data);
        else setHistoryMeetings([]);
      })
      .catch(() => setHistoryMeetings([]));
  }, [userId]);

  const handleCreateMeetingNow = async () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    try { 
      const response = await fetch(`${server_url}/api/v1/users/create_meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: localStorage.getItem("token"),
          meetingCode: code,
        }),
      });
      if (response.ok) {
        const result = await response.json(); 
        setGeneratedCode(code);
        setMessage({
          type: "success",
          text: "Meeting successfully created and code generated!",
        });
        localStorage.setItem("meetingData", JSON.stringify(result.data));

      } else { 
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.message || `Failed to create meeting: Status ${response.status}`,
        }); 
      }

    } catch (error) { 
      console.error("Fetch error:", error);
      setMessage({
        type: "error",
        text: "Network error: Could not connect to the server.",
      });
    }
  };

  const handleJoinCreatedMeeting = async () => {
    if (!generatedCode) return;
    try { 
      const meetingDataString = localStorage.getItem("meetingData");
      const meetingDetails = meetingDataString ? JSON.parse(meetingDataString) : '';
      const host = meetingDetails ? meetingDetails.meetingHost : '';
      const response = await fetch(`${server_url}/api/v1/users/join_created_meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: localStorage.getItem("token"),
          meetingCode: generatedCode,
          meetingHost: host
        }),
      });
      if (response.ok) {
        console.log(response);
        navigate(`/${generatedCode}`);
      }else{
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.message || `Failed to join created meeting: Status ${response.status}`,
        }); 
      }
    } catch (error) { 
      console.error("Fetch error:", error);
      setMessage({
        type: "error",
        text: "Network error: Could not connect to the server.",
      });
    }
  };

  const handleJoinMeeting = async () => {
    if (!meetingCodeOrUrl.trim()) {
      setMessage({ type: "error", text: "Please enter a meeting code or URL" });
      return;
    }
    let code = meetingCodeOrUrl.trim();
    if (code.includes("/")) {
      const parts = code.split("/");
      code = parts[parts.length - 1];
    }
    try { 
      const response = await fetch(`${server_url}/api/v1/users/join_meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: localStorage.getItem("token"),
          meetingCode: code,
        }),
      });
      if (response.ok) {
        console.log(response);
        navigate(`/${code}`);
      }else{
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.message || `Failed to join created meeting: Status ${response.status}`,
        }); 
      }
    } catch (error) { 
      console.error("Fetch error:", error);
      setMessage({
        type: "error",
        text: "Network error: Could not connect to the server.",
      });
    }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingTitle.trim() || !scheduledDate.trim()) {
      setMessage({
        type: "error",
        text: "Please enter meeting title and date/time",
      });
      return;
    }

    const selected = new Date(scheduledDate);
    const now = new Date();
    if (selected < now) {
      setMessage({
        type: "error",
        text: "Cannot schedule a meeting in the past. Please select a valid future date and time.",
      });
      return;
    }

    setLoading(true);

    const meetingCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    try {
      const res = await fetch(
        `${server_url}/api/v1/users/create_meeting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: localStorage.getItem("token"),
            meetingCode,
            scheduledFor: new Date(scheduledDate),
            meetingTitle: meetingTitle.trim(),
          }),
        }
      );
      if (res.ok) {
        setMessage({
          type: "success",
          text: "Meeting scheduled successfully!",
        });
        setMeetingTitle("");
        setScheduledDate("");

        const upcomingRes = await fetch(
          `${server_url}/api/v1/users/get_upcoming_meetings/${userId}`
        );
        const upcomingData = await upcomingRes.json();
        if (Array.isArray(upcomingData)) setUpcomingMeetings(upcomingData);

        setTimeout(() => {
          setActiveTab("upcoming");
        }, 300);
      } else {
        setMessage({ type: "error", text: "Failed to schedule meeting" });
      }
    } catch {
      setMessage({ type: "error", text: "Error scheduling meeting" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: "Meeting code copied to clipboard!" });
  };

  const handleShareCode = () => {
    if (!generatedCode) return;
    if (navigator.share) {
      navigator
        .share({
          title: "Join my meeting on NEXCHO",
          text: `Join my meeting with code: ${generatedCode}`,
          url: `${window.location.origin}/${generatedCode}`,
        })
        .catch(() => {
          setMessage({
            type: "error",
            text: "Failed to share the meeting code",
          });
        });
    } else {
      setMessage({
        type: "info",
        text: "Sharing not supported on your browser",
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold tracking-widest text-indigo-600">
            NEXCHO
          </h1>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            {[
              { key: "join_schedule", label: "New Meeting" },
              { key: "upcoming", label: "Upcoming" },
              { key: "history", label: "History" },
              { key: "recordings", label: "Recordings" },
              { key: "meeting_analytics", label: "Meeting Analytics" },
              { key: "settings", label: "Settings" },
            ].map(({ key, label }) => (
              <li key={key}>
                <button
                  onClick={() => setActiveTab(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors duration-150 ${
                    activeTab === key
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("userData");
              localStorage.removeItem("meetingData");
              navigate("/auth");
            }}
            className={`${primaryBtn} w-full`}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {/* Top-left message */}
        {message.text && (
          <div className="max-w-3xl mx-auto mb-6">
            <Alert
              severity={message.type || "info"}
              onClose={() => setMessage({ type: "", text: "" })}
            >
              {message.text}
            </Alert>
          </div>
        )}

        {activeTab === "join_schedule" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Create Meeting Now */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <Typography variant="h5" className="pb-6">
                Create Meeting Now
              </Typography>

              <div
                onClick={handleJoinCreatedMeeting}
                className="bg-gray-100 px-4 py-3 rounded-lg font-semibold text-gray-800 cursor-pointer select-none mb-4 text-sm"
              >
                {generatedCode || "Generate a meeting code"}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  disabled={!!generatedCode}
                  onClick={handleCreateMeetingNow}
                  variant="contained"
                  className={primaryBtn}
                >
                  Generate Meeting Code
                </Button>

                {generatedCode && (
                  <div className="flex items-center gap-2">
                    <Tooltip title="Copy Code">
                      <IconButton
                        onClick={() => handleCopyToClipboard(generatedCode)}
                        size="small"
                        className={iconBtnSubtle}
                        aria-label="copy-code"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Share Code">
                      <IconButton
                        onClick={handleShareCode}
                        size="small"
                        className={iconBtnSubtle}
                        aria-label="share-code"
                      >
                        <ShareIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}
              </div>
            </section>

            {/* Join a Meeting */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <Typography variant="h5" className="pb-6">
                Join a Meeting
              </Typography>

              <div className="mb-4">
                <TextField
                  label="Meeting Code or URL"
                  variant="outlined"
                  fullWidth
                  value={meetingCodeOrUrl}
                  onChange={(e) => setMeetingCodeOrUrl(e.target.value)}
                />
              </div>

              <Button
                variant="contained"
                onClick={handleJoinMeeting}
                className={primaryBtn}
              >
                Join Now
              </Button>
            </section>

            {/* Schedule a Meeting */}
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <Typography variant="h5" className="pb-6">
                Schedule a Meeting
              </Typography>

              <div className="mb-4">
                <TextField
                  label="Meeting Title"
                  variant="outlined"
                  fullWidth
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <TextField
                  label="Date & Time"
                  type="datetime-local"
                  variant="outlined"
                  fullWidth
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  inputProps={{ min: getCurrentDateTime() }}
                  InputLabelProps={{ shrink: true }}
                />
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant="contained"
                  onClick={handleScheduleMeeting}
                  disabled={loading}
                  className={primaryBtn}
                >
                  Schedule
                </Button>

                {loading && (
                  <Typography variant="body2" className="text-sm text-gray-600">
                    Scheduling, please wait...
                  </Typography>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "upcoming" && (
          <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
            <Typography variant="h5" className="pb-6">
              Upcoming Meetings
            </Typography>

            {upcomingMeetings.length === 0 ? (
              <Typography>No upcoming meetings scheduled.</Typography>
            ) : (
              <ul className="divide-y">
                {upcomingMeetings.map((m) => (
                  <li
                    key={m._id}
                    onClick={() => navigate(`/${m.meetingCode}`)}
                    className="py-4 cursor-pointer hover:bg-indigo-50 px-4 rounded-md"
                  >
                    <strong className="text-gray-800">
                      {m.meetingTitle || "Untitled Meeting"}
                    </strong>
                    <br />
                    <small className="text-sm text-gray-500">
                      {new Date(m.scheduledFor).toLocaleString()}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === "history" && (
          <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
            <Typography variant="h5" className="pb-6">
              Meeting History
            </Typography>

            {historyMeetings.length === 0 ? (
              <Typography>No meetings completed yet.</Typography>
            ) : (
              <ul className="divide-y">
                {historyMeetings.map((m) => (
                  <li
                    key={m._id}
                    onClick={() => navigate(`/${m.meetingCode}`)}
                    className="py-4 cursor-pointer hover:bg-indigo-50 px-4 rounded-md"
                  >
                    <strong className="text-gray-800">
                      {m.meetingTitle || "Untitled Meeting"}
                    </strong>
                    <br />
                    <small className="text-sm text-gray-500">
                      Ended at: {new Date(m.createdAt).toLocaleString()}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === "recordings" && (
          <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
            <Typography variant="h5" className="pb-6">
              Meeting Recordings
            </Typography>
            <Typography>Feature coming soon...</Typography>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
            <Typography variant="h5" className="pb-6">
              Settings
            </Typography>

            <div className="pb-6">
              <TextField
                label="Full Name"
                variant="outlined"
                fullWidth
                value={user?.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
              />
            </div>
            <div className="pb-6">
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                value={user?.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
            </div>

            <Button
              variant="contained"
              onClick={async () => {
                await fetch(`${server_url}/api/v1/users/update_profile`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: localStorage.getItem("token"),
                    name: user?.name,
                    email: user?.email,
                  }),
                });
                setMessage({
                  type: "success",
                  text: "Profile updated successfully!",
                });
                localStorage.setItem("userData", JSON.stringify(user));
              }}
              className={primaryBtn}
            >
              Save Changes
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}

export default withAuth(HomeComponent);
