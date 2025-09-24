// convex/cors.ts
import { cors } from "convex/server";

export default cors({
  origin: [
    "https://yourdomain.com", // Replace with your actual domain
    "http://localhost:3000",   // For development
    "exp://192.168.1.100:8081", // For Expo development
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
