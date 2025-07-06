//i am hoping to write a function that accepts a ride request and updates the ride status in the database,as well as assigns a driver to that ride.
//have to change the ride status to "accepted" and assign the driver to the ride.
//need to change rides table in schema to include driverId and status
import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { acceptRideHandler } from "./acceptRideHandler";
// import { Doc } from "./_generated/dataModel";

export const acceptRide = mutation({
  args: {
    rideId: v.string(),
    driverId: v.id("taxiTap_users"),
  },
  handler: acceptRideHandler,
});