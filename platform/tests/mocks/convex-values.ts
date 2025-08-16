// Mock Convex values
export const v = {
  string: () => ({ type: 'string' }),
  number: () => ({ type: 'number' }),
  boolean: () => ({ type: 'boolean' }),
  object: (fields: any) => ({ type: 'object', fields }),
  array: (items: any) => ({ type: 'array', items }),
  id: (table: string) => ({ type: 'id', table }),
  union: (...types: any[]) => ({ type: 'union', types }),
  undefined: () => ({ type: 'undefined' }),
}; 