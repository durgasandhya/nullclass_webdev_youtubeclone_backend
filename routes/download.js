import express from "express";
import {
  checkDownloadEligibility,
  downloadVideo,
  getUserDownloads,
  getPremiumStatus,
} from "../controllers/download.js";

const routes = express.Router();

routes.post("/check-eligibility", checkDownloadEligibility);
routes.post("/download", downloadVideo);
routes.get("/user/:userId", getUserDownloads);
routes.get("/premium-status/:userId", getPremiumStatus);

export default routes;
