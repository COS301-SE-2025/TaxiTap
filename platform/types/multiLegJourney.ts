 export interface MultiLegJourney {
    journeyId: string;
    passengerId: string;
    status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
    totalLegs: number;
    currentLegIndex: number;
    originAddress: string;
    destinationAddress: string;
    originCoordinates: { latitude: number; longitude: number };
    destinationCoordinates: { latitude: number; longitude: number };
    optimizationPreference: 'shortest_time' | 'fewest_transfers' | 'most_reliable';
    estimatedTotalFare: number;
    estimatedTotalDuration: number;
    legs: JourneyLeg[];
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
}
export interface JourneyLeg {
    legIndex: number;
    fromAddress: string;
    toAddress: string;
    fromCoordinates: { latitude: number; longitude: number };
    toCoordinates: { latitude: number; longitude: number };
    routeId?: string;
    status: 'pending' | 'requesting' | 'active' | 'completed' | 'failed';
    rideId?: string;
    estimatedFare: number;
    actualFare?: number;
    estimatedDuration: number;
    requestedAt?: number;
    completedAt?: number;
    transferWindowStart?: number;
    transferWindowEnd?: number;
}