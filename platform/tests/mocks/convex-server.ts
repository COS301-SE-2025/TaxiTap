// Mock Convex server types
export type DatabaseReader = {
  query: (table: string) => {
    collect: () => Promise<any[]>;
    filter: (predicate: any) => any;
    first: () => Promise<any>;
  };
};

export type QueryCtx = {
  db: DatabaseReader;
};

export type ActionCtx = {
  runAction: (action: any, args: any) => Promise<any>;
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
      first: () => Promise.resolve(null)
    })
  }
});

export const createActionCtx = (): ActionCtx => ({
  runAction: jest.fn().mockResolvedValue("Mocked Action Result")
});

export const query = (handler: any) => handler;
export const action = (handler: any) => handler;

export const createMutationCtx = () => ({
  db: {
    query: jest.fn(),
    patch: jest.fn(),
  }
});

// Export as both default and named exports to support different import styles
export default {
  createQueryCtx,
  createActionCtx,
  query,
  action
}; 