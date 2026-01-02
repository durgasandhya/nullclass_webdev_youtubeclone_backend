import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.js";

const routes = express.Router();

routes.post("/create-order", createOrder);
routes.post("/verify-payment", verifyPayment);

export default routes;
