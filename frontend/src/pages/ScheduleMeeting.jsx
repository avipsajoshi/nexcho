import React, { useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import server from "../environment";
import { Button, TextField } from "@mui/material";

const ScheduleMeeting = () => {
  const [meetingCode, setMeetingCode] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date());

  const handleSchedule = async () => {
    try {
      await axios.post(`${server}/api/v1/users/add_to_activity`, {
        token: localStorage.getItem("token"),
        meeting_code: meetingCode,
        scheduled_date: scheduledDate,
      });
      alert("Meeting scheduled successfully!");
      setMeetingCode("");
    } catch (e) {
      alert("Failed to schedule meeting");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Schedule a New Meeting</h2>
      <TextField
        label="Meeting Code"
        value={meetingCode}
        onChange={(e) => setMeetingCode(e.target.value)}
        fullWidth
        margin="normal"
      />
      <div style={{ margin: "1rem 0" }}>
        <DatePicker
          selected={scheduledDate}
          onChange={(date) => setScheduledDate(date)}
          showTimeSelect
          dateFormat="Pp"
        />
      </div>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSchedule}
        disabled={!meetingCode.trim()}
      >
        Schedule Meeting
      </Button>
    </div>
  );
};

export default ScheduleMeeting;
