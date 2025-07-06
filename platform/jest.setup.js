/* global jest */
import 'react-native';
import 'jest-enzyme';
import Adapter from '@cfaester/enzyme-adapter-react-18';
import { configure } from 'enzyme';

configure({ adapter: new Adapter() });

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  return {
    GestureHandlerRootView: jest.fn(({ children }) => children),
    PanGestureHandler: jest.fn(({ children }) => children),
  };
});

jest.mock('convex/values', () => ({
  v: {
    id: () => jest.fn(),
    optional: (x) => x,
    string: () => jest.fn(),
    number: () => jest.fn(),
    boolean: () => jest.fn(),
  },
}));