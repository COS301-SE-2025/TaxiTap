import { Id } from "../../_generated/dataModel";

export const tripPaidHandler = async (
  ctx: any, 
  rideId: string, 
  userId: Id<"taxiTap_users">, 
  paid: boolean
) => {
  console.log('tripPaidHandler called with:', { rideId, userId, paid });
  
  let ride;
  
  try {
    ride = await ctx.db.get(rideId as Id<"rides">);
    console.log('Found ride by _id:', !!ride);
  } catch (error) {
    console.log('Not a valid document ID, trying custom rideId field');
  }
  
  if (!ride) {
    try {
      ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
        .first();
      console.log('Found ride by rideId field:', !!ride);
    } catch (error) {
      console.log('Index query failed, trying filter fallback');
    }
  }
  
  if (!ride) {
    try {
      ride = await ctx.db
        .query("rides")
        .filter((q: any) => q.eq(q.field("rideId"), rideId))
        .first();
      console.log('Found ride by filter:', !!ride);
    } catch (error) {
      console.log('Filter query failed:', error);
    }
  }

  if (!ride) {
    console.error('Ride not found with rideId:', rideId);
    
    try {
      const allRides = await ctx.db.query("rides").collect();
      console.log('All rides:', allRides.map((r: any) => ({ 
        _id: r._id, 
        rideId: r.rideId, 
        status: r.status 
      })));
    } catch (error) {
      console.log('Could not fetch all rides for debugging');
    }
    
    throw new Error(`Ride not found`);
  }

  if (ride.passengerId !== userId) {
    throw new Error("Only the passenger can confirm payment for this ride");
  }

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