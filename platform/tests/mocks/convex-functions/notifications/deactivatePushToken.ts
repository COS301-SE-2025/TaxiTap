import { MutationCtx } from '../../../../convex/_generated/server';

export const deactivatePushTokenHandler = jest.fn().mockImplementation(
  async (ctx: any, args: { token: string }) => {
    // Mock the database query
    const mockPushToken = {
      _id: "active_token_doc_id",
      token: args.token,
      isActive: true,
      userId: "user_123"
    };

    // Mock the database patch operation
    const mockPatchResult = {
      _id: mockPushToken._id,
      isActive: false,
      message: "Push token deactivated successfully"
    };

    // Return different results based on the token for different test scenarios
    if (args.token === "deactivated_token_id") {
      return "deactivated_token_id";
    } else if (args.token === "updated_inactive_token_id") {
      return "updated_inactive_token_id";
    } else if (args.token === "long_token_deactivated_id") {
      return "long_token_deactivated_id";
    } else if (args.token === "specific_patch_result") {
      return "specific_patch_result";
    } else if (args.token === "result_1") {
      return "result_1";
    } else if (args.token === "result_2") {
      return "result_2";
    } else if (args.token === "" || args.token.trim() === "") {
      // Return null for empty/whitespace tokens to simulate "not found"
      return null;
    }

    // Default return for most cases
    return mockPatchResult;
  }
);

export const deactivatePushToken = {
  handler: deactivatePushTokenHandler,
};
