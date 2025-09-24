// convex/cors.ts
// convex/cors.ts

// Example CORS middleware for Next.js API routes or Node.js
export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", [
    "https://yourdomain.com",
    "http://localhost:3000",
    "exp://192.168.1.100:8081",
  ].includes(req.headers.origin) ? req.headers.origin : "");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  // Continue with your handler logic here
}
