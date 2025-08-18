// Mock displayRoutes function for testing
export const displayRoutesHandler = async (ctx: any, args?: any) => {
  // Get all routes from the database
  const routes = await ctx.db.query("routes").collect();
  
  return routes.map((route: any) => {
    const coordinates = route.geometry?.coordinates || [];
    
    if (coordinates.length >= 2) {
      // Route has coordinates
      const startCoords = {
        latitude: coordinates[0][0],
        longitude: coordinates[0][1]
      };
      const destinationCoords = {
        latitude: coordinates[coordinates.length - 1][0],
        longitude: coordinates[coordinates.length - 1][1]
      };
      
      // Extract start and destination from route name
      const nameParts = route.name.split(' - ');
      const start = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase() : 'Cbd';
      const destination = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1).toLowerCase() : 'Sausville';
      
      // Calculate fare based on duration (1200 seconds = 20 minutes, fare = 15 per 10 minutes)
      const fare = Math.ceil(route.estimatedDuration / 600) * 15;
      
      return {
        _id: route._id,
        routeId: route.routeId,
        start,
        destination,
        startCoords,
        destinationCoords,
        stops: [],
        fare,
        estimatedDuration: route.estimatedDuration,
        taxiAssociation: route.taxiAssociation,
        hasStops: false
      };
    } else {
      // Route missing coordinates - return fallback
      return {
        routeId: route.routeId,
        start: 'N/a',
        destination: 'Unknown',
        startCoords: null,
        destinationCoords: null,
        stops: [],
        fare: 15,
        estimatedDuration: route.estimatedDuration || 0,
        taxiAssociation: route.taxiAssociation || 'Unknown Taxis',
        hasStops: false
      };
    }
  });
};
