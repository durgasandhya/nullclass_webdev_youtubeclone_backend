import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter using Gmail credentials from credentials.txt
const transporter = (nodemailer.default || nodemailer).createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "durgasandhyak2003@gmail.com",
    pass: process.env.EMAIL_PASS || "ilfb ygxb biwf pwgp",
  },
});

// Generate PDF Invoice
export const generateInvoice = async (paymentData) => {
  return new Promise((resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, "../invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `invoice_${paymentData.orderId}_${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .text("YouTube Clone", 50, 50)
        .fontSize(10)
        .text("Invoice", 50, 75, { align: "left" })
        .text(`Invoice #: ${paymentData.orderId}`, 50, 90)
        .text(`Date: ${new Date().toLocaleDateString()}`, 50, 105)
        .moveDown();

      // Customer Info
      doc
        .fontSize(14)
        .text("Bill To:", 50, 140)
        .fontSize(10)
        .text(paymentData.userName, 50, 160)
        .text(paymentData.userEmail, 50, 175)
        .moveDown();

      // Line
      doc
        .moveTo(50, 210)
        .lineTo(550, 210)
        .stroke();

      // Table Header
      doc
        .fontSize(12)
        .text("Description", 50, 230, { width: 300 })
        .text("Amount", 400, 230, { width: 100, align: "right" });

      doc
        .moveTo(50, 250)
        .lineTo(550, 250)
        .stroke();

      // Plan Details
      const planNames = {
        bronze: "Bronze Plan - 7 Minutes Watch Time",
        silver: "Silver Plan - 10 Minutes Watch Time",
        gold: "Gold Plan - Unlimited Watch Time",
      };

      doc
        .fontSize(10)
        .text(planNames[paymentData.planType] || "Premium Plan", 50, 270, {
          width: 300,
        })
        .text(`₹${paymentData.amount}`, 400, 270, {
          width: 100,
          align: "right",
        });

      doc
        .moveTo(50, 290)
        .lineTo(550, 290)
        .stroke();

      // Total
      doc
        .fontSize(12)
        .text("Total:", 50, 310, { width: 300 })
        .text(`₹${paymentData.amount}`, 400, 310, {
          width: 100,
          align: "right",
        });

      // Payment Info
      doc
        .fontSize(10)
        .text("Payment Method: Razorpay", 50, 350)
        .text(`Payment ID: ${paymentData.paymentId}`, 50, 365)
        .text(`Order ID: ${paymentData.orderId}`, 50, 380)
        .text("Status: Paid", 50, 395);

      // Footer
      doc
        .fontSize(8)
        .text(
          "Thank you for your purchase! This is a computer-generated invoice.",
          50,
          750,
          {
            align: "center",
            width: 500,
          }
        );

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Send Email with Invoice
export const sendInvoiceEmail = async (userEmail, userName, invoicePath, paymentData) => {
  try {
    const planNames = {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
    };

    const planName = planNames[paymentData.planType] || "Premium";

    const mailOptions = {
      from: {
        name: "YouTube Clone",
        address: process.env.EMAIL_USER || "durgasandhyak2003@gmail.com",
      },
      to: userEmail,
      subject: `Payment Successful - ${planName} Plan Activated!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff0000; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">YouTube Clone</h1>
          </div>

          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>Payment Successful! 🎉</h2>
            <p>Dear ${userName},</p>
            <p>Thank you for upgrading to the <strong>${planName} Plan</strong>!</p>

            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Plan Details:</h3>
              <p><strong>Plan:</strong> ${planName}</p>
              <p><strong>Amount Paid:</strong> ₹${paymentData.amount}</p>
              <p><strong>Payment ID:</strong> ${paymentData.paymentId}</p>
              <p><strong>Order ID:</strong> ${paymentData.orderId}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <p>Your plan is now active! ${
              paymentData.planType === "gold"
                ? "Enjoy unlimited watch time!"
                : `You can now watch videos for ${
                    paymentData.planType === "bronze" ? "7" : "10"
                  } minutes.`
            }</p>

            <p>Please find your invoice attached to this email.</p>

            <p style="margin-top: 30px;">
              <strong>Happy Watching!</strong><br>
              Team YouTube Clone
            </p>
          </div>

          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
            <p>© 2026 YouTube Clone. All rights reserved.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: path.basename(invoicePath),
          path: invoicePath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);

    // Delete invoice file after sending
    fs.unlinkSync(invoicePath);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};
