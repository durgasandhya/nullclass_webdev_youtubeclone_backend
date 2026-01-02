import download from "../Modals/download.js";
import premium from "../Modals/premium.js";
import video from "../Modals/video.js";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if user can download (1 per day for free users)
export const checkDownloadEligibility = async (req, res) => {
  const { userId } = req.body;

  try {
    // Check if user has premium
    const premiumUser = await premium.findOne({ userid: userId, isPremium: true });

    if (premiumUser) {
      return res.status(200).json({
        canDownload: true,
        isPremium: true,
        message: "Premium user - unlimited downloads",
      });
    }

    // For free users, check if they downloaded today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const downloadsToday = await download.countDocuments({
      userid: userId,
      downloadedOn: { $gte: today },
    });

    if (downloadsToday >= 1) {
      return res.status(200).json({
        canDownload: false,
        isPremium: false,
        message: "Daily download limit reached. Upgrade to Premium for unlimited downloads!",
        downloadsToday: downloadsToday,
      });
    }

    return res.status(200).json({
      canDownload: true,
      isPremium: false,
      message: "You can download 1 video today",
      downloadsToday: downloadsToday,
    });
  } catch (error) {
    console.error("Check eligibility error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Download video
export const downloadVideo = async (req, res) => {
  const { userId, videoId } = req.body;

  try {
    // Check eligibility first
    const premiumUser = await premium.findOne({ userid: userId, isPremium: true });

    if (!premiumUser) {
      // Check free user daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const downloadsToday = await download.countDocuments({
        userid: userId,
        downloadedOn: { $gte: today },
      });

      if (downloadsToday >= 1) {
        return res.status(403).json({
          message: "Daily download limit reached",
          needsPremium: true,
        });
      }
    }

    // Record the download
    const newDownload = new download({
      userid: userId,
      videoid: videoId,
    });

    await newDownload.save();

    // Get video details
    const videoDetails = await video.findById(videoId);

    if (!videoDetails) {
      return res.status(404).json({ message: "Video not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Download recorded successfully",
      videoPath: videoDetails.filepath,
      fileName: videoDetails.filename,
    });
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Download failed" });
  }
};

// Get user's download history
export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;

  try {
    const downloads = await download
      .find({ userid: userId })
      .populate("videoid")
      .sort({ downloadedOn: -1 });

    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Get downloads error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get premium status
export const getPremiumStatus = async (req, res) => {
  const { userId } = req.params;

  try {
    const premiumUser = await premium.findOne({ userid: userId });

    if (!premiumUser) {
      return res.status(200).json({
        isPremium: false,
        planType: "free",
        watchTimeLimit: 300,
        message: "Free user",
      });
    }

    return res.status(200).json({
      isPremium: premiumUser.isPremium,
      planType: premiumUser.planType || "free",
      watchTimeLimit: premiumUser.watchTimeLimit || 300,
      subscriptionDate: premiumUser.subscriptionDate,
      expiryDate: premiumUser.expiryDate,
      amount: premiumUser.amount,
    });
  } catch (error) {
    console.error("Get premium status error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
