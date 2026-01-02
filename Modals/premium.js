import mongoose from "mongoose";

const premiumSchema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    planType: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },
    watchTimeLimit: {
      type: Number, // in seconds
      default: 300, // 5 minutes for free
    },
    subscriptionDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    paymentId: {
      type: String,
      default: null,
    },
    orderId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("premium", premiumSchema);
