// Mock switchActiveRole function for testing
export const switchActiveRoleHandler = {
  handler: async (ctx: any, args: any) => {
    // Mock implementation for testing
    return {
      success: true,
      message: "Active role switched successfully"
    };
  }
};
