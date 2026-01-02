import mongoose from "mongoose";
import video from "./Modals/video.js";
import dotenv from "dotenv";

dotenv.config();

const DBURL = process.env.DB_URL;

async function migratePaths() {
  try {
    await mongoose.connect(DBURL);
    console.log("Connected to MongoDB");

    // Find all videos with Windows-style paths
    const videos = await video.find({});
    console.log(`Found ${videos.length} videos`);

    let updated = 0;
    for (const vid of videos) {
      // Normalize path: replace backslashes with forward slashes and add leading slash
      const normalizedPath = "/" + vid.filepath.replace(/\\/g, "/");

      if (normalizedPath !== vid.filepath) {
        vid.filepath = normalizedPath;
        await vid.save();
        updated++;
        console.log(`Updated: ${vid.videotitle} -> ${normalizedPath}`);
      }
    }

    console.log(`\nMigration complete! Updated ${updated} video paths.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migratePaths();
