import { Id } from "../../_generated/dataModel";

export const tripPaidHandler = async (
  ctx: any, 
  rideId: string, 
  userId: Id<"taxiTap_users">, 
  paid: boolean
) => {
  console.log('tripPaidHandler called with:', { rideId, userId, paid });
  
  let ride;
  
  // Try to find ride by _id first (if rideId is actually the document _id)
  try {
    ride = await ctx.db.get(rideId as Id<"rides">);
    console.log('Found ride by _id:', !!ride);
  } catch (error) {
    console.log('Not a valid document ID, trying custom rideId field');
  }
  
  // If not found by _id, try by custom rideId field
  if (!ride) {
    ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
      .first();
    console.log('Found ride by rideId field:', !!ride);
  }
  
  // If still not found, try without index (fallback)
  if (!ride) {
    ride = await ctx.db
      .query("rides")
      .filter((q: any) => q.eq(q.field("rideId"), rideId))
      .first();
    console.log('Found ride by filter:', !!ride);
  }

  if (!ride) {
    console.error('Ride not found with rideId:', rideId);
    
    // Log all rides to debug
    const allRides = await ctx.db.query("rides").collect();
    console.log('All rides:', allRides.map((r: any) => ({ 
      _id: r._id, 
      rideId: r.rideId, 
      status: r.status 
    })));
    
    throw new Error(`Ride not found with ID: ${rideId}`);
  }

  // Verify user authorization
  if (ride.passengerId !== userId) {
    throw new Error("Only the passenger can confirm payment for this ride");
  }

  // Update the ride
  await ctx.db.patch(ride._id, {
    tripPaid: paid,
    paymentConfirmedAt: Date.now(),
  });

  console.log('Successfully updated ride payment status');
  
  return { 
    success: true, 
    message: `Payment ${paid ? 'confirmed' : 'marked as unpaid'}`,
    rideId: ride._id
  };
};