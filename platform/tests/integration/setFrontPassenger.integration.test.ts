import {
  setFrontPassengerHandler,
  removeFrontPassengerHandler,
  getFrontPassengerHandler,
  checkPassengerFrontStatusHandler,
  getDriverFrontPassengersHandler,
} from "../../convex/functions/rides/setFrontPassenger";

describe("Front Passenger Integration Tests", () => {
  let dbData: Record<string, any> = {};
  let ctx: any;

  const createRide = (overrides: Partial<any> = {}) => ({
    _id: `ride-${Math.random()}`,
    rideId: `ride-${Math.random()}`,
    passengerId: `passenger-${Math.random()}`,
    driverId: `driver-1`,
    status: "in_progress",
    isFrontPassenger: false,
    frontPassengerSetAt: undefined,
    updatedAt: undefined,
    estimatedFare: 100,
    finalFare: 120,
    tripPaid: false,
    startLocation: "A",
    endLocation: "B",
    ...overrides,
  });

  const createPassenger = (id: string, name: string, phone: string) => ({
    _id: id,
    name,
    phoneNumber: phone,
  });

    beforeEach(() => {
    dbData = {};

    ctx = {
        db: {
        query: jest.fn().mockImplementation((table: string) => ({
            withIndex: (_indexName: string, indexFn: any) => ({
            first: async () => {
                const allRides = Object.values(dbData).filter(r => r._id.startsWith("ride"));
                return allRides.find(r => indexFn({ eq: (field: string, val: string) => r[field] === val })) || null;
            },
            filter: (filterFn: any) => ({
                collect: async () =>
                Object.values(dbData).filter(r =>
                    filterFn({
                    and: (...conds: any[]) => conds.every(c => c),
                    eq: (field: any, val: any) => r[field] === val,
                    field: (name: string) => name,
                    })
                ),
                first: async () =>
                Object.values(dbData)
                    .filter(r =>
                    filterFn({
                        and: (...conds: any[]) => conds.every(c => c),
                        eq: (field: any, val: any) => r[field] === val,
                        field: (name: string) => name,
                    })
                    )[0] || null,
            }),
            }),
        })),
        get: jest.fn().mockImplementation((id: string) => dbData[id] || null),
        patch: jest.fn().mockImplementation((id: string, data: any) => {
            dbData[id] = { ...dbData[id], ...data };
            return dbData[id];
        }),
        },
    };
    });

  it("can set, check, and remove a front passenger", async () => {
    const ride = createRide();
    const passenger = createPassenger(ride.passengerId, "John Doe", "12345");
    const driver = createPassenger(ride.driverId, "Driver One", "54321");

    dbData[ride._id] = ride;
    dbData[passenger._id] = passenger;
    dbData[driver._id] = driver;

    // Set front passenger
    await setFrontPassengerHandler(ctx, ride.rideId);
    expect(dbData[ride._id].isFrontPassenger).toBe(true);
    expect(dbData[ride._id].frontPassengerSetAt).toBeDefined();

    // Check front passenger by driver
    const frontPassenger = await getFrontPassengerHandler(ctx, ride.driverId);
    expect(frontPassenger.hasFrontPassenger).toBe(true);
    expect(frontPassenger.frontPassenger!.name).toBe("John Doe");

    // Check front passenger by passenger
    const status = await checkPassengerFrontStatusHandler(ctx, ride.passengerId);
    expect(status.isFrontPassenger).toBe(true);
    expect(status.rideInfo!.driverName).toBe("Driver One");

    // Get all front passengers for driver
    const driverFronts = await getDriverFrontPassengersHandler(ctx, ride.driverId);
    expect(driverFronts.count).toBe(1);
    expect(driverFronts.frontPassengers[0].passengerName).toBe("John Doe");

    // Remove front passenger
    await removeFrontPassengerHandler(ctx, ride.rideId);
    expect(dbData[ride._id].isFrontPassenger).toBe(false);

    // Ensure front passenger is gone
    const frontPassengerAfterRemove = await getFrontPassengerHandler(ctx, ride.driverId);
    expect(frontPassengerAfterRemove.hasFrontPassenger).toBe(false);
  });

  it("removes previous front passenger when a new one is set for same driver", async () => {
    const ride1 = createRide({ _id: "ride-1", rideId: "r1" });
    const ride2 = createRide({ _id: "ride-2", rideId: "r2" });
    ride1.isFrontPassenger = true;

    dbData[ride1._id] = ride1;
    dbData[ride2._id] = ride2;

    // Set new front passenger
    await setFrontPassengerHandler(ctx, ride2.rideId);

    expect(dbData[ride2._id].isFrontPassenger).toBe(true);
    expect(dbData[ride1._id].isFrontPassenger).toBe(false);
  });
});