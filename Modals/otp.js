import mongoose from "mongoose";

const otpSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
  otp: {
    type: String,
    required: true,
  },
  otpType: {
    type: String,
    enum: ["email", "sms"],
    required: true,
  },
  location: {
    city: String,
    state: String,
    isSouthIndia: Boolean,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("otp", otpSchema);
