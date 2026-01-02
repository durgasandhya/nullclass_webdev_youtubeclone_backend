import video from "../Modals/video.js";

export const uploadvideo = async (req, res) => {
  console.log("=== Video Upload Request ===");
  console.log("Body:", req.body);
  console.log("File:", req.file);

  if (req.file === undefined) {
    console.error("No file uploaded");
    return res
      .status(400)
      .json({ message: "Please upload a mp4 video file only" });
  } else {
    try {
      // Normalize path to use forward slashes for URLs
      const normalizedPath = "/" + req.file.path.replace(/\\/g, "/");

      console.log("Creating video document with:");
      console.log("- Title:", req.body.videotitle);
      console.log("- Filename:", req.file.originalname);
      console.log("- Path:", normalizedPath);
      console.log("- Channel:", req.body.videochanel);
      console.log("- Uploader:", req.body.uploader);

      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: normalizedPath,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });

      await file.save();
      console.log("Video saved successfully:", file._id);
      return res.status(201).json({
        message: "File uploaded successfully",
        video: file
      });
    } catch (error) {
      console.error("=== Video Upload Error ===");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      return res.status(500).json({
        message: "Failed to upload video",
        error: error.message
      });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
