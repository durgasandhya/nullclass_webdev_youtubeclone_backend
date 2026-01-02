import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import axios from "axios";

// Helper function to check for special characters
const hasSpecialCharacters = (text) => {
  const specialCharsRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  return specialCharsRegex.test(text);
};

// Helper function to get location from IP (matching ThemeContext API)
const getLocationFromIP = async (ip) => {
  try {
    // Use same API as ThemeContext for consistency
    const response = await axios.get("https://ipapi.co/json/");
    // Return state/region instead of city for better location display
    return response.data.region || response.data.city || "Unknown";
  } catch (error) {
    console.error("Geolocation error:", error);
    return "Unknown";
  }
};

export const postcomment = async (req, res) => {
  const commentdata = req.body;

  // Check for special characters
  if (hasSpecialCharacters(commentdata.commentbody)) {
    return res.status(400).json({
      message: "Comments with special characters are not allowed"
    });
  }

  // Get user's location from IP (state/region)
  const userIP = req.ip || req.connection.remoteAddress;
  const city = await getLocationFromIP(userIP);

  const postcomment = new comment({
    ...commentdata,
    city: city,
  });

  try {
    await postcomment.save();
    return res.status(200).json({ comment: true, data: postcomment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Like a comment
export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  try {
    const commentDoc = await comment.findById(_id);

    // Check if user already liked
    const alreadyLiked = commentDoc.likedBy.includes(userId);

    if (alreadyLiked) {
      // Unlike: remove user from likedBy and decrease likes
      await comment.findByIdAndUpdate(_id, {
        $pull: { likedBy: userId },
        $inc: { likes: -1 }
      });
    } else {
      // Like: add user to likedBy and increase likes
      // Also remove from dislikedBy if they disliked before
      const alreadyDisliked = commentDoc.dislikedBy.includes(userId);

      await comment.findByIdAndUpdate(_id, {
        $addToSet: { likedBy: userId },
        $inc: { likes: 1, dislikes: alreadyDisliked ? -1 : 0 },
        $pull: { dislikedBy: userId }
      });
    }

    const updatedComment = await comment.findById(_id);
    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Like error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Dislike a comment
export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  try {
    const commentDoc = await comment.findById(_id);

    // Check if user already disliked
    const alreadyDisliked = commentDoc.dislikedBy.includes(userId);

    if (alreadyDisliked) {
      // Remove dislike
      await comment.findByIdAndUpdate(_id, {
        $pull: { dislikedBy: userId },
        $inc: { dislikes: -1 }
      });
    } else {
      // Dislike: add user to dislikedBy and increase dislikes
      // Also remove from likedBy if they liked before
      const alreadyLiked = commentDoc.likedBy.includes(userId);

      await comment.findByIdAndUpdate(_id, {
        $addToSet: { dislikedBy: userId },
        $inc: { dislikes: 1, likes: alreadyLiked ? -1 : 0 },
        $pull: { likedBy: userId }
      });
    }

    const updatedComment = await comment.findById(_id);

    // Auto-delete if dislikes >= 2
    if (updatedComment.dislikes >= 2) {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({
        deleted: true,
        message: "Comment removed due to dislikes"
      });
    }

    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Dislike error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Translate comment using MyMemory Translation API
export const translatecomment = async (req, res) => {
  const { text, targetLang } = req.body;

  try {
    // MyMemory API uses language pairs (e.g., en|es for English to Spanish)
    const response = await axios.get("https://api.mymemory.translated.net/get", {
      params: {
        q: text,
        langpair: `en|${targetLang}`
      }
    });

    console.log("Translation API response:", response.data);

    // MyMemory API returns responseStatus as a number, not nested
    if (response.data && response.data.responseData) {
      res.status(200).json({
        translatedText: response.data.responseData.translatedText,
        detectedLanguage: response.data.responseData.match || "auto"
      });
    } else {
      console.error("Unexpected response format:", response.data);
      throw new Error("Translation service returned unexpected format");
    }
  } catch (error) {
    console.error("Translation error:", error.message);
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
    return res.status(500).json({
      message: "Translation failed. Please try again.",
      error: error.message
    });
  }
};
