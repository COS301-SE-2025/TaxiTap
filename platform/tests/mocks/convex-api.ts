// Mock Convex API for testing
export const api = {
  functions: {
    earnings: {
      earnings: {
        getWeeklyEarnings: jest.fn()
      }
    },
    routes: {
      displayRoutes: {
        displayRoutes: jest.fn()
      }
    },
    users: {
      UserManagement: {
        switchActiveRole: {
          switchActiveRole: jest.fn()
        }
      }
    },
    work_sessions: {
      startWorkSession: {
        startWorkSession: jest.fn()
      },
      endWorkSession: {
        endWorkSession: jest.fn()
      }
    }
  }
};

export default api;
