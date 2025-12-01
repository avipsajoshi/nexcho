import mongoose, {Schema} from "mongoose";

// Schema to only hold metadata and GridFS reference
const videoFileSchema = new Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId, // GridFS file _id
      required: true,
      unique: true,
    },
    filename: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      default: "video/webm",
    },
    length: Number, // file size in bytes
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    // Optional: for linking video to user/session/meeting
    metadata: {
      meetingId: String,
      userId: String,
      description: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("VideoFile", videoFileSchema);
