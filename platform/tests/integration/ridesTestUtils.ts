// === In-memory simulated database ===
export const createMockDatabase = () => {
  const collections: Record<string, Record<string, any>> = {
    rides: {},
    users: {},
  };

  return {
    insert: (collection: string, id: string, doc: any) => {
      collections[collection][id] = { _id: id, ...doc };
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
    query: (collection: string) => ({
      withIndex: (_: string, filterFn: any) => ({
        first: async () => {
          const items = Object.values(collections[collection]);
          for (const item of items) {
            if (filterFn({ eq: (field: string, value: any) => item[field] === value })) {
              return item;
            }
          }
          return null;
        },
      }),
      collect: async () => Object.values(collections[collection]),
    }),
    get: async (id: string) => {
      for (const collection of Object.keys(collections)) {
        if (collections[collection][id]) {
          return collections[collection][id];
        }
      }
      return null;
    },
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