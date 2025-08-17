// Mock Convex server types
export type DatabaseReader = {
  query: (table: string) => {
    collect: () => Promise<any[]>;
    filter: (predicate: any) => any;
    first: () => Promise<any>;
    withIndex: (indexName: string, callback: any) => any;
  };
};

export type QueryCtx = {
  db: DatabaseReader;
  auth: any;
  storage: any;
  runQuery: any;
};

export type ActionCtx = {
  runAction: (action: any, args: any) => Promise<any>;
};

export type MutationCtx = {
  db: {
    query: (table: string) => any;
    insert: (table: string, data: any) => Promise<any>;
    patch: (id: any, data: any) => Promise<any>;
  };
  runMutation: (mutation: any, args: any) => Promise<any>;
};

// Create a concrete implementation of QueryCtx
export const createQueryCtx = (): QueryCtx => ({
  db: {
    query: (table: string) => ({
      collect: () => Promise.resolve([]),
      filter: (predicate: any) => ({
        collect: () => Promise.resolve([]),
        first: () => Promise.resolve(null)
      }),
      first: () => Promise.resolve(null),
      withIndex: (indexName: string, callback: any) => ({
        collect: () => Promise.resolve([]),
        first: () => Promise.resolve(null)
      })
    })
  },
  auth: {},
  storage: {},
  runQuery: jest.fn(),
});

export const createActionCtx = (): ActionCtx => ({
  runAction: jest.fn().mockResolvedValue("Mocked Action Result")
});

export const createMutationCtx = (): MutationCtx => ({
  db: {
    query: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
  },
  runMutation: jest.fn(),
});

// Mock the query function to return an object with handler property
export const query = (config: any) => ({
  handler: config.handler
});

export const action = (handler: any) => handler;

export const mutation = (config: any) => ({
  handler: config.handler
});

export const internalMutation = (config: any) => ({
  handler: config.handler
});

// Export as both default and named exports to support different import styles
export default {
  createQueryCtx,
  createActionCtx,
  createMutationCtx,
  query,
  action,
  mutation,
  internalMutation
}; 