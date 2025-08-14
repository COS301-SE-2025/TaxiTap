import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { endWorkSessionHandler } from "./endWorkSessionHandler";

export const endWorkSession = mutation({
  args: { driverId: v.id("taxiTap_users") },
  handler: endWorkSessionHandler,
});