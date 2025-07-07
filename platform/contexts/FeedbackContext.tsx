import React, { createContext, useContext, useState } from 'react';

type FeedbackEntry = {
  rating: number;
  comment: string;
  time: string;
  startName?: string;
  endName?: string;
};

type FeedbackContextType = {
  feedbackList: FeedbackEntry[];
  addFeedback: (entry: FeedbackEntry) => void;
};

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);

  const addFeedback = (entry: FeedbackEntry) => {
    setFeedbackList(prev => [entry, ...prev]);
  };

  return (
    <FeedbackContext.Provider value={{ feedbackList, addFeedback }}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};