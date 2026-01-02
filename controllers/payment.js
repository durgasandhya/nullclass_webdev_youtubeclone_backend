import Razorpay from "razorpay";
import crypto from "crypto";
import premium from "../Modals/premium.js";
import user from "../Modals/Auth.js";
import { generateInvoice, sendInvoiceEmail } from "../utils/emailService.js";

// Initialize Razorpay (using test keys from credentials.txt)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RyZdFU97vfl2kH",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "CDxYa103xLYVw32hbQ8f2hIE",
});

// Create Razorpay Order for Premium Subscription
export const createOrder = async (req, res) => {
  const { amount, userId } = req.body;

  try {
    // Create shorter receipt (max 40 characters)
    const shortUserId = userId.toString().slice(-8); // Last 8 chars of userId
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `prem_${shortUserId}_${timestamp}`, // Total: ~25 chars
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order: order,
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RyZdFU97vfl2kH",
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// Verify Razorpay Payment and Activate Premium
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    amount,
    planType = "gold", // default to gold for backward compatibility
  } = req.body;

  try {
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "CDxYa103xLYVw32hbQ8f2hIE")
      .update(body.toString())
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Calculate watch time limit based on plan
    const watchTimeLimits = {
      free: 300, // 5 minutes
      bronze: 420, // 7 minutes
      silver: 600, // 10 minutes
      gold: -1, // unlimited
    };

    // Payment is valid - Activate premium
    const existingPremium = await premium.findOne({ userid: userId });

    if (existingPremium) {
      // Update existing premium
      existingPremium.isPremium = true;
      existingPremium.planType = planType;
      existingPremium.watchTimeLimit = watchTimeLimits[planType];
      existingPremium.subscriptionDate = new Date();
      existingPremium.expiryDate = null;
      existingPremium.paymentId = razorpay_payment_id;
      existingPremium.orderId = razorpay_order_id;
      existingPremium.amount = amount;
      await existingPremium.save();
    } else {
      // Create new premium record
      const newPremium = new premium({
        userid: userId,
        isPremium: true,
        planType: planType,
        watchTimeLimit: watchTimeLimits[planType],
        subscriptionDate: new Date(),
        expiryDate: null,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: amount,
      });
      await newPremium.save();
    }

    // Get user details for invoice
    const userDetails = await user.findById(userId);

    if (userDetails && userDetails.email) {
      try {
        // Generate PDF invoice
        const invoicePath = await generateInvoice({
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          userName: userDetails.name,
          userEmail: userDetails.email,
          planType: planType,
          amount: amount,
        });

        // Send email with invoice
        await sendInvoiceEmail(
          userDetails.email,
          userDetails.name,
          invoicePath,
          {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            planType: planType,
            amount: amount,
          }
        );

        console.log("Invoice email sent successfully to:", userDetails.email);
      } catch (emailError) {
        console.error("Failed to send invoice email:", emailError);
        // Don't fail the payment if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and Premium activated!",
      paymentId: razorpay_payment_id,
      planType: planType,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};
