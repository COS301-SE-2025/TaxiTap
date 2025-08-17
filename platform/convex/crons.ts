import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Check proximity every 2 minutes with small batch size to prevent timeouts
crons.interval(
  "check proximity alerts",
  { minutes: 2 }, // Changed from 30 seconds to 2 minutes
  api.functions.notifications.proximityMonitor.checkProximityAndSendAlerts,
  { batchSize: 5 } // Process only 5 rides at a time
);

export default crons;