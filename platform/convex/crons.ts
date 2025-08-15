import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Check proximity every 30 seconds for active rides
crons.interval(
  "check proximity alerts",
  { seconds: 30 },
  api.functions.notifications.proximityMonitor.checkProximityAndSendAlerts
);

export default crons;
