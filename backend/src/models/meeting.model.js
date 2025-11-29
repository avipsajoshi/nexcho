import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  meetingCode: { type: String, required: true, unique: true },
  scheduledFor: { type: Date, default: Date.now }, // scheduled time, or instant now
  joinedAt: { type: Date }, // when user joined
  recordingUrl: { type: String, default: "" },
  meetingTitle: { type: String, default: "Meeting" },
  isCompleted: { type: Boolean, default: false }, // mark meeting ended
  createdAt: { type: Date, default: Date.now },
  chatHistory: [
    {
      sender: { type: String },
      message: { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  duration: { type: Number, default: 0 }, // in seconds
});

// Check if model already exists, else create
const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);

export { Meeting };
