import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
import mentorRoutes from "./modules/mentor/mentor.routes.js";
import mentorsRoutes from "./modules/mentors/mentors.routes.js";
import appointmentRoutes from "./modules/appointments/appointment.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/mentors", mentorsRoutes);
app.use("/api/appointments", appointmentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
