// Mock showFeedbackHandler function for testing
export const showFeedbackPassengerHandler = async (ctx: any, args: any) => {
  // Mock implementation for testing
  return [
    {
      id: "feedback-1",
      rating: 5,
      comment: "Great service!"
    }
  ];
};

export const showFeedbackDriverHandler = async (ctx: any, args: any) => {
  // Mock implementation for testing
  return [
    {
      id: "feedback-1",
      rating: 5,
      comment: "Great service!"
    }
  ];
};
