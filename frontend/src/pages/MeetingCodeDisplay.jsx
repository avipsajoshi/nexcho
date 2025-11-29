import React, { useState } from "react";
import { Button, IconButton, TextField } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";

export default function MeetingCodeDisplay({ meetingCode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const link = `${window.location.origin}/meet/${meetingCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    window.location.href = `/meet/${meetingCode}`;
  };

  return (
    <div style={{ textAlign: "center", marginTop: "30px" }}>
      <h2>Your Meeting Code</h2>
      <TextField
        value={meetingCode}
        variant="outlined"
        fullWidth
        disabled
        sx={{ marginBottom: "10px" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginTop: "10px",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleJoin}
          endIcon={<LaunchIcon />}
        >
          Join Meeting
        </Button>
        <IconButton onClick={handleCopy} color="primary">
          <ContentCopyIcon />
        </IconButton>
      </div>
      {copied && (
        <p style={{ color: "green", marginTop: "8px" }}>Link copied!</p>
      )}
    </div>
  );
}
