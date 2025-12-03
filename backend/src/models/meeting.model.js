import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
	meetingCode: { type: String, required: true, unique: true },
	scheduledFor: { type: Date, default: Date.now }, // scheduled time, or instant now
	joinedAt: { type: Date }, // when host joined
	endedAt: { type: Date }, // when host ended
	recordingUrl: { type: String, default: "" },
	meetingTitle: { type: String, default: "Meeting" },
	isCompleted: { type: Boolean, default: false }, // mark meeting ended
	createdAt: { type: Date, default: Date.now },
	duration: { type: Number, default: 0 },

	vidFileId: { type: Schema.Types.ObjectId, ref: "Videofile", required: false },
	isRecorded: { type: Boolean, default: false },
	isSummarized: { type: Boolean, default: false },
	hasAttendance: { type: Boolean, default: false },
	processedDetails: {
		timestamp: { type: Date },
		summary: { type: String, default: "" },
		transcript: { type: String, default: "" },
	},
	chatHistory: [
		{
			sender: { type: String },
			message: { type: String },
			timestamp: { type: Date, default: Date.now },
		},
	],
});

const attendanceSchema = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
	meeting_id: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
	final_percent: { type: Number },
	createdAt: { type: Date, default: Date.now },
});

const Meeting =
	mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);

const Attendance =
	mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

export { Meeting, Attendance };
