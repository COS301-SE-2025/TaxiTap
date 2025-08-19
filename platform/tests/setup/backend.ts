// Backend test setup
(global as any).__DEV__ = true;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});