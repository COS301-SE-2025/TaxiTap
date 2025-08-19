// === In-memory simulated database ===
export const createMockDatabase = () => {
  const collections: Record<string, Record<string, any>> = {
    rides: {},
    users: {},
    drivers: {},
    taxis: {},
    work_sessions: {},
    passengerRoutes: {},
    notifications: {},
    feedback: {},
    trips: {},
    locations: {},
    routes: {},
    enrichedRouteStops: {},
    reverseGeocodedStops: {},
    notificationSettings: {},
    pushTokens: {},
    taxiTap_users: {},
    passengers: {},
  };

  return {
    insert: (collection: string, docOrId: any, doc?: any) => {
      let id: string;
      let document: any;
      
      if (doc) {
        // Called with (collection, id, doc)
        id = docOrId;
        document = doc;
      } else {
        // Called with (collection, doc)
        id = `mock_${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        document = docOrId;
      }
      
      collections[collection][id] = { _id: id, ...document };
      return id;
    },
    patch: (id: string, update: any) => {
      for (const collection of Object.keys(collections)) {
        if (collections[collection][id]) {
          Object.assign(collections[collection][id], update);
          return id;
        }
      }
      return null;
    },
    get: async (id: string) => {
      for (const collection of Object.keys(collections)) {
        if (collections[collection][id]) {
          return collections[collection][id];
        }
      }
      return null;
    },
    query: (collection: string) => ({
      withIndex: (_: string, filterFn: any) => {
        const items = Object.values(collections[collection]);
        let filteredItems = items;
        
        // Apply the filter function
        if (filterFn) {
          const mockQuery = {
            eq: (field: string, value: any) => {
              filteredItems = filteredItems.filter(item => item[field] === value);
              return mockQuery;
            }
          };
          filterFn(mockQuery);
        }
        
        return {
          first: async () => filteredItems[0] || null,
          unique: async () => filteredItems[0] || null,
          order: (direction: string) => ({
            first: async () => {
              const sortedItems = [...filteredItems];
              if (direction === 'desc') {
                sortedItems.sort((a, b) => (b.lastUsed || b.startTime || 0) - (a.lastUsed || a.startTime || 0));
              } else {
                sortedItems.sort((a, b) => (a.lastUsed || a.startTime || 0) - (b.lastUsed || b.startTime || 0));
              }
              return sortedItems[0] || null;
            },
            collect: async () => {
              const sortedItems = [...filteredItems];
              if (direction === 'desc') {
                sortedItems.sort((a, b) => (b.lastUsed || b.startTime || 0) - (a.lastUsed || a.startTime || 0));
              } else {
                sortedItems.sort((a, b) => (a.lastUsed || a.startTime || 0) - (b.lastUsed || b.startTime || 0));
              }
              return sortedItems;
            },
          }),
          collect: async () => filteredItems,
        };
      },
      collect: async () => Object.values(collections[collection]),
    }),
    _collections: collections,
  };
};

// === Full Convex Context Mock ===
export const createMockCtx = () => {
  const db = createMockDatabase();
  const ctx: any = {
    db,
    runMutation: jest.fn(async () => null),
    runQuery: jest.fn(async () => null),
    auth: {},
    storage: {},
  };
  return { ctx, db };
}; 