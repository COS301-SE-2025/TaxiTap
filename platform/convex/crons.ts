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

// Check transfer point proximity for multi-leg journeys every minute
crons.interval(
  "check transfer proximity",
  { minutes: 1 },
  api.functions.journeys.transferProximityAction.monitorTransferProximity,
  { limit: 10 } // Process up to 10 journeys at a time
);

// Clean up expired transfer windows every 2 minutes
crons.interval(
  "cleanup expired transfers",
  { minutes: 2 },
  api.functions.journeys.journeyStateManager.cleanupExpiredTransfers,
  {}
);

export default crons;