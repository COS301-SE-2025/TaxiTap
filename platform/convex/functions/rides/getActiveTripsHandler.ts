export const getActiveTripsHandler = async (ctx: any, driverId: string) => {
  const activeRides = await ctx.db
    .query("rides")
    .withIndex("by_driver", (q: any) => q.eq("driverId", driverId))
    .filter((q: any) => q.eq(q.field("status"), "in_progress"))
    .collect();

  const unpaidRides = await ctx.db
    .query("rides")
    .withIndex("by_driver", (q: any) => q.eq("driverId", driverId))
    .filter((q: any) => q.eq(q.field("tripPaid"), false))
    .collect();

  let activeCount = activeRides.length;
  let paidCount = 0;
  let noResponseCount = 0;
  let needChangeCount = 0;
  const passengers: any[] = [];
  const passengersUnpaid: any[] = [];

  for (const ride of activeRides) {
    if (ride.tripPaid === true) paidCount++;
    else if (ride.tripPaid === null || ride.tripPaid === undefined) noResponseCount++;

    if (ride.changeDue && ride.changeDue > 0 && !ride.changeReceived) {
      needChangeCount++;
    }

    const passenger = await ctx.db.get(ride.passengerId);
    if (passenger) {
      passengers.push({
        name: passenger.name,
        phoneNumber: passenger.phoneNumber,
        fare: ride.finalFare ?? ride.estimatedFare ?? 0,
        tripPaid: ride.tripPaid ?? null,
        amountPaid: ride.amountPaid ?? 0,
        changeDue: ride.changeDue ?? 0,
        changeReceived: ride.changeReceived ?? false,
        paymentType: ride.paymentType ?? "not_paid",
      });
    }
  }

  for (const ride of unpaidRides) {
    const passengerUnpaid = await ctx.db.get(ride.passengerId);
    if (passengerUnpaid) {
      passengersUnpaid.push({
        name: passengerUnpaid.name,
        phoneNumber: passengerUnpaid.phoneNumber,
        fare: ride.finalFare ?? ride.estimatedFare ?? 0,
        tripPaid: ride.tripPaid ?? null,
        requestedAt: ride.requestedAt,
        amountPaid: ride.amountPaid ?? 0,
        changeDue: ride.changeDue ?? 0,
        changeReceived: ride.changeReceived ?? false,
        paymentType: ride.paymentType ?? "not_paid",
      });
    }
  }

  return {
    activeCount,
    paidCount,
    unpaidCount: unpaidRides.length,
    noResponseCount,
    needChangeCount,
    passengers,
    passengersUnpaid,
  };
};

export const handlePassengerPayment = async (
  ctx: any,
  rideId: string,
  amountPaid: number,
  isPaid: boolean
) => {
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
    .first();

  if (!ride) throw new Error("Ride not found");

  const fare = ride.finalFare ?? ride.estimatedFare ?? 0;
  let paymentType: "exact" | "overpaid" | "underpaid" | "not_paid" = "not_paid";
  let changeDue = 0;
  let amountOwed = 0;

  if (!isPaid) {
    paymentType = "not_paid";
  } else if (amountPaid === fare) {
    paymentType = "exact";
  } else if (amountPaid > fare) {
    paymentType = "overpaid";
    changeDue = amountPaid - fare;
  } else {
    paymentType = "underpaid";
    amountOwed = fare - amountPaid;
  }

  // Single database update - removing the duplicate patch
  await ctx.db.patch(ride._id, {
    tripPaid: isPaid,
    amountPaid: isPaid ? amountPaid : 0,
    changeDue,
    amountOwed,
    paymentType,
    changeReceived: changeDue === 0,
    paymentConfirmedAt: isPaid ? Date.now() : undefined,
    updatedAt: Date.now(),
  });

  // Return the correct changeDue amount based on payment type
  const returnChangeDue = paymentType === "underpaid" ? amountOwed : changeDue;

  return {
    success: true,
    paymentType,
    changeDue: returnChangeDue,
    message:
      paymentType === "overpaid"
        ? `Change due: R${changeDue.toFixed(2)}`
        : paymentType === "underpaid"
        ? `Passenger owes: R${amountOwed.toFixed(2)}`
        : isPaid
        ? "Payment confirmed - exact amount received"
        : "Marked as not paid",
  };
};

export const markChangeGiven = async (ctx: any, rideId: string) => {
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
    .first();

  if (!ride) {
    throw new Error("Ride not found");
  }

  let updateData: any = {
    updatedAt: Date.now(),
  };

  let message = "";

  // If passenger was overpaid, mark change as received
  if (ride.paymentType === "overpaid") {
    updateData.changeReceived = true;
    message = "Change marked as given";
  }
  
  // If passenger was underpaid, mark as fully paid and clear amount owed
  else if (ride.paymentType === "underpaid") {
    const totalFare = ride.finalFare ?? ride.estimatedFare ?? 0;
    updateData.amountPaid = totalFare;
    updateData.amountOwed = 0;
    updateData.changeDue = 0; // Clear the changeDue field
    updateData.paymentType = "exact";
    updateData.tripPaid = true;
    updateData.changeReceived = true; // No change needed for exact payment
    message = "Payment completed - passenger has paid remaining amount";
  }

  await ctx.db.patch(ride._id, updateData);

  return {
    success: true,
    message,
  };
};

export const getPassengersNeedingChange = async (ctx: any, driverId: string) => {
  // Get rides where passengers either owe money OR are owed change (and haven't received it)
  const ridesNeedingChange = await ctx.db
    .query("rides")
    .withIndex("by_driver", (q: any) => q.eq("driverId", driverId))
    .filter((q: any) => 
      q.or(
        // Passengers who are owed change but haven't received it (overpaid)
        q.and(
          q.gt(q.field("changeDue"), 0),
          q.eq(q.field("changeReceived"), false),
          q.eq(q.field("paymentType"), "overpaid")
        ),
        // Passengers who owe money (underpaid) - haven't paid full amount
        q.and(
          q.eq(q.field("paymentType"), "underpaid"),
          q.eq(q.field("tripPaid"), true) // They paid something but not enough
        ),
        // Also include passengers who haven't paid at all but should have
        q.and(
          q.or(
            q.eq(q.field("tripPaid"), false),
            q.eq(q.field("tripPaid"), null)
          ),
          q.neq(q.field("status"), "cancelled"), // Exclude cancelled rides
          q.eq(q.field("status"), "completed") // Only completed rides that need payment
        )
      )
    )
    .collect();

  const passengersNeedingChange: any[] = [];

  for (const ride of ridesNeedingChange) {
    const passenger = await ctx.db.get(ride.passengerId);
    if (passenger) {
      // Determine the correct changeDue amount and payment type based on ride data
      let changeDueAmount = 0;
      let effectivePaymentType = ride.paymentType ?? "not_paid";

      if (ride.paymentType === "overpaid") {
        changeDueAmount = ride.changeDue ?? 0;
      } else if (ride.paymentType === "underpaid") {
        changeDueAmount = ride.amountOwed ?? 0;
      } else if (ride.tripPaid === false || ride.tripPaid === null) {
        // Full amount owed
        changeDueAmount = ride.finalFare ?? ride.estimatedFare ?? 0;
        effectivePaymentType = "not_paid";
      }

      // Only add if there's actually an amount due
      if (changeDueAmount > 0) {
        passengersNeedingChange.push({
          rideId: ride.rideId,
          name: passenger.name,
          phoneNumber: passenger.phoneNumber,
          fare: ride.finalFare ?? ride.estimatedFare ?? 0,
          amountPaid: ride.amountPaid ?? 0,
          changeDue: changeDueAmount,
          paymentType: effectivePaymentType,
          paymentConfirmedAt: ride.paymentConfirmedAt,
          startLocation: ride.startLocation?.address ?? "Unknown",
          endLocation: ride.endLocation?.address ?? "Unknown",
          changeReceived: ride.changeReceived ?? false,
          status: ride.status,
        });
      }
    }
  }

  return {
    count: passengersNeedingChange.length,
    passengers: passengersNeedingChange,
  };
};