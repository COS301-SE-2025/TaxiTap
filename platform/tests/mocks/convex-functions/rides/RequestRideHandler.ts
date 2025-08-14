// Mock RequestRideHandler function for testing
export const requestRideHandler = async (ctx: any, args: any) => {
  // Mock implementation for testing
  return {
    success: true,
    rideId: "mock-ride-id",
    message: "Ride requested successfully"
  };
};
