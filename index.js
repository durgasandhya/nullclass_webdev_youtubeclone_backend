import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import otproutes from "./routes/otp.js";
dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://nullclass-webdev-yourtubeclone.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// Serve uploaded files with proper path resolution
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/otp", otproutes);
const PORT = process.env.PORT || 5000;

// Socket.io signaling for WebRTC
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a call room
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);

    // Get other users in the room
    const otherUsers = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);

    // Notify other users in room
    socket.to(roomId).emit("user-joined", { userId, socketId: socket.id });

    // Send existing users to the new user
    socket.emit("existing-users", otherUsers);

    console.log(`User ${userId} joined room ${roomId}`);
  });

  // WebRTC signaling
  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", {
      sdp: payload.sdp,
      caller: socket.id
    });
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", {
      sdp: payload.sdp,
      answerer: socket.id
    });
  });

  socket.on("ice-candidate", (payload) => {
    io.to(payload.target).emit("ice-candidate", {
      candidate: payload.candidate,
      sender: socket.id
    });
  });

  // Screen sharing
  socket.on("start-screen-share", (roomId) => {
    socket.to(roomId).emit("user-started-screen-share", socket.id);
  });

  socket.on("stop-screen-share", (roomId) => {
    socket.to(roomId).emit("user-stopped-screen-share", socket.id);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove user from all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit("user-left", socket.id);

        // Delete empty rooms
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      socket.to(roomId).emit("user-left", socket.id);

      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io server ready for WebRTC signaling`);
});

const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
