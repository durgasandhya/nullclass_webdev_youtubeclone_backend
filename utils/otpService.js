import nodemailer from "nodemailer";
import axios from "axios";

// Create email transporter
const transporter = (nodemailer.default || nodemailer).createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "durgasandhyak2003@gmail.com",
    pass: process.env.EMAIL_PASS || "ilfb ygxb biwf pwgp",
  },
});

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email
export const sendEmailOTP = async (email, otp, userName = "User") => {
  try {
    const mailOptions = {
      from: {
        name: "YouTube Clone",
        address: process.env.EMAIL_USER || "durgasandhyak2003@gmail.com",
      },
      to: email,
      subject: "Your OTP for YouTube Clone Login",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff0000; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">YouTube Clone</h1>
          </div>

          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Hello ${userName},</h2>
            <p>Your One-Time Password (OTP) for login is:</p>

            <div style="background-color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h1 style="color: #ff0000; font-size: 36px; letter-spacing: 8px; margin: 0;">
                ${otp}
              </h1>
            </div>

            <p><strong>This OTP is valid for 10 minutes.</strong></p>
            <p>If you didn't request this OTP, please ignore this email.</p>

            <p style="margin-top: 30px;">
              <strong>Best regards,</strong><br>
              Team YouTube Clone
            </p>
          </div>

          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
            <p>© 2026 YouTube Clone. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email OTP sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email OTP error:", error);
    throw error;
  }
};

// Send OTP via SMS using MSG91
export const sendSMSOTP = async (phoneNumber, otp) => {
  try {
    const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "YOUR_MSG91_AUTH_KEY";
    const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || "YOUR_TEMPLATE_ID";

    // MSG91 API endpoint for sending OTP
    const url = `https://control.msg91.com/api/v5/otp`;

    const response = await axios.post(
      url,
      {
        template_id: MSG91_TEMPLATE_ID,
        mobile: phoneNumber,
        authkey: MSG91_AUTH_KEY,
        otp: otp,
        otp_expiry: 10, // minutes
      },
      {
        headers: {
          "Content-Type": "application/json",
          authkey: MSG91_AUTH_KEY,
        },
      }
    );

    console.log("SMS OTP sent:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("SMS OTP error:", error.response?.data || error.message);
    throw error;
  }
};

// Verify MSG91 OTP
export const verifySMSOTP = async (phoneNumber, otp) => {
  try {
    const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "YOUR_MSG91_AUTH_KEY";

    const url = `https://control.msg91.com/api/v5/otp/verify`;

    const response = await axios.post(
      url,
      {
        authkey: MSG91_AUTH_KEY,
        mobile: phoneNumber,
        otp: otp,
      },
      {
        headers: {
          "Content-Type": "application/json",
          authkey: MSG91_AUTH_KEY,
        },
      }
    );

    console.log("SMS OTP verified:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("SMS OTP verification error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};
