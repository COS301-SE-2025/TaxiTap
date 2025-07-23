import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  taxiTap_users: defineTable({
    name: v.string(),
    email: v.string(),
    password: v.string(),
    age: v.number(),
    phoneNumber: v.string(),
    
    isVerified: v.boolean(),
    isActive: v.boolean(),
    accountType: v.union(
      v.literal("passenger"),
      v.literal("driver"),
      v.literal("both")
    ),
    
    currentActiveRole: v.optional(v.union(
      v.literal("passenger"),
      v.literal("driver")
    )),
    lastRoleSwitchAt: v.optional(v.number()),
    
    profilePicture: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.union(
      v.literal("male"),
      v.literal("female"),
      v.literal("other"),
      v.literal("prefer_not_to_say")
    )),
    
    // Added address fields
    homeAddress: v.optional(v.object({
      address: v.string(),
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number(),
      }),

      nickname: v.optional(v.string()), // e.g., "Home", "My Place"

    })),
    
    workAddress: v.optional(v.object({
      address: v.string(),
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number(),
      }),

      nickname: v.optional(v.string()), // e.g., "Work", "Office"

    })),
        
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phoneNumber: v.string(),
      relationship: v.string(),
    })),
    
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phoneNumber"])
    .index("by_account_type", ["accountType"])
    .index("by_current_role", ["currentActiveRole"])
    .index("by_is_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),

  rides: defineTable({
    rideId: v.string(),
    passengerId: v.id("taxiTap_users"),
    
    startLocation: v.object({
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number(),
      }),
      address: v.string(),
    }),
  
    endLocation: v.object({
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number(),
        
      }),
      address: v.string(),
    }),
    
    status: v.union(
      v.literal("requested"),
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("declined"),
    ),
    
    driverId: v.optional(v.id("taxiTap_users")),
    
    requestedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    
    estimatedFare: v.optional(v.number()),
    finalFare: v.optional(v.number()),
    
    estimatedDistance: v.optional(v.number()),
    actualDistance: v.optional(v.number()),
  })
    .index("by_ride_id", ["rideId"])
    .index("by_passenger", ["passengerId"])
    .index("by_driver", ["driverId"])
    .index("by_status", ["status"])
    .index("by_requested_at", ["requestedAt"]),

  //passenger table
  passengers: defineTable({
    userId: v.id("taxiTap_users"),
    //passengerID: v.string(),
    numberOfRidesTaken: v.number(),
    totalDistance: v.number(),
    totalFare: v.number(),
    averageRating: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    //.index("by_passenger_id", ["passengerID"])
    .index("by_created_at", ["createdAt"]),
  
    drivers: defineTable({
      userId: v.id("taxiTap_users"),
      numberOfRidesCompleted: v.number(),
      totalDistance: v.number(),
      totalFare: v.number(),
      averageRating: v.optional(v.number()),
      activeRoute: v.optional(v.id("routes")),
      assignedRoute: v.optional(v.id("routes")),
      taxiAssociation: v.optional(v.string()),
      routeAssignedAt: v.optional(v.number()), 
    })
    .index("by_user_id", ["userId"])
    .index("by_taxi_association", ["taxiAssociation"])
    .index("by_assigned_route", ["assignedRoute"])
    .index("by_average_rating", ["averageRating"]),

    //Taxis Table - stores information about taxis
    taxis: defineTable({
    driverId: v.id("drivers"),
    licensePlate: v.string(),
    model: v.string(),
    color: v.string(),
    year: v.number(),
    image: v.optional(v.string()),
    capacity: v.number(),
    isAvailable: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_driver_id", ["driverId"])
    .index("by_is_available", ["isAvailable"])
    .index("by_created_at", ["createdAt"]),
    
routes: defineTable({
    routeId: v.string(),
    name: v.string(),
    geometry: v.any(),
    stops: v.array(v.object({
      id: v.string(),
      name: v.string(),
      coordinates: v.array(v.number()),
      order: v.number()
    })),
    fare: v.number(),
    estimatedDuration: v.number(),
    estimatedDistance: v.optional(v.number()), // Added estimated distance field
    isActive: v.boolean(),
    taxiAssociation: v.string(),
    taxiAssociationRegistrationNumber: v.string()
  }).index("by_route_id", ["routeId"]),

  routeStops: defineTable({
    routeId: v.string(), 
    stopId: v.string(), 
    name: v.string(), 
    coordinates: v.array(v.number()), 
    order: v.number(), 
    isStartPoint: v.boolean(), 
    isEndPoint: v.boolean(),
    estimatedTime: v.optional(v.number()), 
    createdAt: v.number(),
    updatedAt: v.number()
  })
  .index("by_route_id", ["routeId"])
  .index("by_stop_name", ["name"])
  .index("by_coordinates", ["coordinates"]),

  enrichedRouteStops: defineTable({
    routeId: v.string(),
    stops: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        coordinates: v.array(v.number()),
        order: v.number(),
      })
    ),
    updatedAt: v.number(),
  }).index("by_route_id", ["routeId"]),

  reverseGeocodedStops: defineTable({
    id: v.string(),
    name: v.string(),
    lastUsed: v.number(),
  }).index("by_stop_id", ["id"]),
  
  notifications: defineTable({
  notificationId: v.string(),
  userId: v.id("taxiTap_users"),
  type: v.union(
    v.literal("ride_request"),
    v.literal("ride_accepted"),
    v.literal("ride_started"),
    v.literal("ride_completed"),
    v.literal("ride_cancelled"),
    v.literal("ride_declined"),
    v.literal("driver_arrived"),
    v.literal("payment_received"),
    v.literal("rating_request"),
    v.literal("route_update"),
    v.literal("emergency_alert"),
    v.literal("system_maintenance"),
    v.literal("promotional")
  ),
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  isPush: v.boolean(), // Whether it was sent as push notification
  metadata: v.optional(v.object({
    rideId: v.optional(v.string()),
    routeId: v.optional(v.string()),
    driverId: v.optional(v.id("taxiTap_users")),
    passengerId: v.optional(v.id("taxiTap_users")),
    amount: v.optional(v.number()),
    additionalData: v.optional(v.any())
  })),
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent")
  ),
  scheduledFor: v.optional(v.number()), // For scheduled notifications
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  readAt: v.optional(v.number())
})
  .index("by_user_id", ["userId"])
  .index("by_notification_id", ["notificationId"])
  .index("by_type", ["type"])
  .index("by_is_read", ["isRead"])
  .index("by_priority", ["priority"])
  .index("by_created_at", ["createdAt"])
  .index("by_scheduled_for", ["scheduledFor"]),

  pushTokens: defineTable({
  userId: v.id("taxiTap_users"),
  token: v.string(),
  platform: v.union(v.literal("ios"), v.literal("android")),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastUsedAt: v.optional(v.number())
})
  .index("by_user_id", ["userId"])
  .index("by_token", ["token"])
  .index("by_is_active", ["isActive"]),

  notificationSettings: defineTable({
  userId: v.id("taxiTap_users"),
  rideUpdates: v.boolean(),
  promotionalOffers: v.boolean(),
  systemAlerts: v.boolean(),
  emergencyNotifications: v.boolean(),
  routeUpdates: v.boolean(),
  paymentNotifications: v.boolean(),
  ratingReminders: v.boolean(),
  soundEnabled: v.boolean(),
  vibrationEnabled: v.boolean(),
  quietHoursStart: v.optional(v.string()),
  quietHoursEnd: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index("by_user_id", ["userId"]),

  locations: defineTable({
    userId: v.id("taxiTap_users"),
    longitude: v.number(),
    latitude: v.number(),
    role: v.union(
      v.literal("passenger"),
      v.literal("driver"),
      v.literal("both")
    ),
    updatedAt: v.string(),
  }).index("by_user", ["userId"]),
  feedback: defineTable({
    rideId: v.id("rides"),
    passengerId: v.id("taxiTap_users"),
    driverId: v.id("taxiTap_users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    startLocation: v.string(),
    endLocation: v.string(),
    createdAt: v.number(),
  })
    .index("by_ride", ["rideId"])
    .index("by_driver", ["driverId"])
    .index("by_passenger", ["passengerId"]),
  passengerRoutes: defineTable({
    passengerId: v.id("taxiTap_users"),
    routeId: v.string(),
    usageCount: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_passenger", ["passengerId"])
    .index("by_passenger_and_route", ["passengerId", "routeId"])
    .index("by_passenger_last_used", ["passengerId", "lastUsedAt"]),
  trips: defineTable({
    driverId: v.id("taxiTap_users"),
    passengerId: v.optional(v.id("taxiTap_users")),
    startTime: v.number(),
    endTime: v.number(),
    fare: v.number(),
    reservation: v.boolean(),
  })
    .index("by_driver_and_startTime", ["driverId", "startTime"])
    .index("by_passenger_and_startTime", ["passengerId", "startTime"]),
  work_sessions: defineTable({
    driverId: v.id("taxiTap_users"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  })
  .index("by_driver_and_start", ["driverId", "startTime"]),
});