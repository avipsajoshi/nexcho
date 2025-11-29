import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";

export default function History() {
  const [history, setHistory] = useState([]);
  const [selectedChat, setSelectedChat] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("meetingHistory")) || [];
    setHistory(data.reverse());
  }, []);

  const handleViewChat = (chat) => {
    setSelectedChat(chat);
    setChatOpen(true);
  };

  return (
    <div style={{ padding: "24px" }}>
      <Typography variant="h4" gutterBottom>
        Meeting History
      </Typography>
      {history.length === 0 ? (
        <Typography>No meetings yet.</Typography>
      ) : (
        history.map((meeting, index) => (
          <Card
            key={index}
            style={{ marginBottom: "16px", background: "#f9f9f9" }}
          >
            <CardContent>
              <Typography variant="h6">{meeting.title || "Meeting"}</Typography>
              <Typography variant="body2" color="textSecondary">
                Code: {meeting.code}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Date: {new Date(meeting.date).toLocaleString()}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                style={{ marginTop: "8px" }}
                onClick={() => handleViewChat(meeting.chat)}
              >
                View Chat
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Chat History</DialogTitle>
        <DialogContent dividers>
          {selectedChat.length === 0 ? (
            <Typography>No messages.</Typography>
          ) : (
            selectedChat.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: "10px" }}>
                <Typography variant="subtitle2">{msg.sender}</Typography>
                <Typography variant="body2">{msg.data}</Typography>
              </div>
            ))
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
