import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  token: { type: String },
  createdAt: { type: Date, default: Date.now },
  resetOTP: { type: String }, // Fix: define type String
  resetOTPExpires: { type: Date }, // Fix: define type Date
});

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: { type: Date, expires: "5m", default: Date.now },
});
const User = mongoose.model("User", userSchema);
const Otp = mongoose.model("Otp", otpSchema);
export { User, Otp };
