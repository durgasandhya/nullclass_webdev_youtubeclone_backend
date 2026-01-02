import express from "express";
import { generateAndSendOTP, verifyOTP, resendOTP } from "../controllers/otp.js";

const routes = express.Router();

// Generate and send OTP based on location
routes.post("/generate", generateAndSendOTP);

// Verify OTP
routes.post("/verify", verifyOTP);

// Resend OTP
routes.post("/resend", resendOTP);

export default routes;
