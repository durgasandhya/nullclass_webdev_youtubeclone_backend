import otp from "../Modals/otp.js";
import user from "../Modals/Auth.js";
import { generateOTP, sendEmailOTP, sendSMSOTP } from "../utils/otpService.js";
import axios from "axios";

// South Indian states
const southIndianStates = [
  "Karnataka",
  "Kerala",
  "Tamil Nadu",
  "Andhra Pradesh",
  "Telangana",
  "Puducherry",
  "Pondicherry",
];

// Check if state is in South India
const isSouthIndianState = (state) => {
  return southIndianStates.some(
    (s) => state && state.toLowerCase().includes(s.toLowerCase())
  );
};

// Generate and send OTP based on location
export const generateAndSendOTP = async (req, res) => {
  const { email, phoneNumber, userName } = req.body;

  try {
    // Get user's location from IP
    const ipResponse = await axios.get("http://ip-api.com/json/");
    const { regionName, city } = ipResponse.data;

    const isInSouthIndia = isSouthIndianState(regionName);

    // Generate 6-digit OTP
    const otpCode = generateOTP();

    // Determine OTP type based on location
    const otpType = isInSouthIndia ? "email" : "sms";

    // Delete any existing OTPs for this email
    await otp.deleteMany({ email: email });

    // Create new OTP record
    const newOTP = new otp({
      email: email,
      phoneNumber: phoneNumber,
      otp: otpCode,
      otpType: otpType,
      location: {
        city: city,
        state: regionName,
        isSouthIndia: isInSouthIndia,
      },
    });

    await newOTP.save();

    // Send OTP based on location
    if (isInSouthIndia) {
      // Send Email OTP for South India
      await sendEmailOTP(email, otpCode, userName);
      return res.status(200).json({
        success: true,
        message: `OTP sent to your email: ${email}`,
        otpType: "email",
        location: {
          city,
          state: regionName,
          isSouthIndia: true,
        },
      });
    } else {
      // Send SMS OTP for other regions
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required for SMS OTP",
        });
      }

      await sendSMSOTP(phoneNumber, otpCode);
      return res.status(200).json({
        success: true,
        message: `OTP sent to your phone: ${phoneNumber}`,
        otpType: "sms",
        location: {
          city,
          state: regionName,
          isSouthIndia: false,
        },
      });
    }
  } catch (error) {
    console.error("OTP generation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
      error: error.message,
    });
  }
};

// Verify OTP and login user
export const verifyOTP = async (req, res) => {
  const { email, otp: otpCode, userName, phoneNumber } = req.body;

  try {
    // Find OTP record
    const otpRecord = await otp.findOne({
      email: email,
      otp: otpCode,
      verified: false,
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Find or create user
    let existingUser = await user.findOne({ email: email });

    if (!existingUser) {
      // Create new user
      existingUser = new user({
        name: userName || email.split("@")[0],
        email: email,
        phoneNumber: phoneNumber,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || email)}&background=random`,
      });
      await existingUser.save();
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      user: {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        image: existingUser.image,
        channelname: existingUser.channelname,
      },
      otpType: otpRecord.otpType,
      location: otpRecord.location,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  const { email, phoneNumber, userName } = req.body;

  try {
    // Delete existing OTPs
    await otp.deleteMany({ email: email });

    // Call generate and send OTP
    return generateAndSendOTP(req, res);
  } catch (error) {
    console.error("OTP resend error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};
