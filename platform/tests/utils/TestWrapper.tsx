import React, { ReactNode } from 'react';

interface TestWrapperProps {
  children: ReactNode;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => {
  // Since all providers are mocked globally in jest.setup.ts,
  // we can just return the children directly
  return <>{children}</>;
};
