// Types for Multi-Leg Journey System
import { Id } from "../convex/_generated/dataModel";

export interface TransferPoint {
  stop1_id: string;
  stop2_id: string;
  walkingDistance: number;
  estimatedWalkingTime?: number;
}

export interface JourneyLeg {
  legIndex: number;
  routeName: string;
  origin: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
  };
  destination: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
  };
  originStopId: string;
  destinationStopId: string;
  estimatedCost: number;
  actualCost?: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  rideId?: Id<"rides">;
  driverId?: Id<"taxiTap_users">;
  startedAt?: number;
  completedAt?: number;
}

export interface MultiLegJourneyOption {
  journeyId: string;
  leg1: JourneyLeg;
  leg2: JourneyLeg;
  totalEstimatedCost: number;
  transferPoint: TransferPoint;
}

export interface MultiLegJourney {
  _id: Id<"multiLegJourneys">;
  journeyId: string;
  passengerId: Id<"taxiTap_users">;
  status: "planned" | "in_progress" | "completed" | "cancelled" | "timeout";
  currentLegIndex: number;
  totalLegs: number;

  originLocation: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
  };

  finalDestination: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
  };

  transferPoint: TransferPoint;
  legs: JourneyLeg[];

  totalEstimatedCost: number;
  totalActualCost?: number;

  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;

  transferTimeoutAt?: number;
  transferWindowExpiredAt?: number;
}

export interface MultiLegSearchResult {
  success: boolean;
  journeyOptions: MultiLegJourneyOption[];
  message: string;
  searchCriteria: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    maxWalkingDistance: number;
    maxTransferDistance: number;
  };
}

export interface RouteStopInfo {
  id: string;
  name: string;
  coordinates: [number, number];
  order: number;
  routeId: string;
  routeName: string;
}