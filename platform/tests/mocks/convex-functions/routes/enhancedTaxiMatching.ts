import { MutationCtx } from '../../../../convex/_generated/server';

export const _findAvailableTaxisForJourneyHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    // Mock implementation for testing
    // Return mock data instead of trying to use real database methods
    
    // Mock available taxis data
    const mockAvailableTaxis = [
      {
        _id: "taxi_1",
        driverId: "driver_1",
        licensePlate: "ABC123",
        model: "Toyota Hiace",
        capacity: 15,
        image: "taxi1.jpg",
        isAvailable: true
      },
      {
        _id: "taxi_2", 
        driverId: "driver_2",
        licensePlate: "XYZ789",
        model: "Nissan NV350",
        capacity: 18,
        image: "taxi2.jpg",
        isAvailable: true
      }
    ];

    // Mock driver data
    const mockDrivers = {
      "driver_1": {
        _id: "driver_1",
        userId: "user_1",
        isOnline: true,
        currentLocation: { lat: -26.2041, lng: 28.0473 }
      },
      "driver_2": {
        _id: "driver_2", 
        userId: "user_2",
        isOnline: true,
        currentLocation: { lat: -26.2041, lng: 28.0473 }
      }
    };

    // Mock user data
    const mockUsers = {
      "user_1": {
        _id: "user_1",
        name: "John Driver",
        role: "driver"
      },
      "user_2": {
        _id: "user_2", 
        name: "Jane Driver",
        role: "driver"
      }
    };

    const results = [];

    for (const taxi of mockAvailableTaxis) {
      const driver = mockDrivers[taxi.driverId];
      if (!driver) continue;

      const user = mockUsers[driver.userId];
      if (!user) continue;

      results.push({
        taxiId: taxi._id,
        driverId: driver._id,
        driverName: user.name,
        licensePlate: taxi.licensePlate,
        model: taxi.model,
        capacity: taxi.capacity,
        image: taxi.image,
        distance: Math.random() * 5, // Mock distance
        estimatedTime: Math.random() * 10, // Mock estimated time
      });
    }

    // Apply maxResults if specified
    if (args.maxResults && args.maxResults > 0) {
      return results.slice(0, args.maxResults);
    }

    return results;
  }
);

export const findAvailableTaxisForJourney = {
  handler: _findAvailableTaxisForJourneyHandler,
};
