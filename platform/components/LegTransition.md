# LegTransition Component

A comprehensive React Native component for managing transitions between legs in a multi-leg journey system. This component provides a complete interface for handling transfer point arrivals, next leg requests, and journey progress visualization.

## Features

- **Transfer Point Arrival Notification**: Real-time notifications when approaching or arriving at transfer points
- **Next Leg Request Status**: Visual feedback for taxi request status (pending, success, failed, timeout)
- **Manual Confirmation Interface**: User-friendly confirmation system for next leg transitions
- **Journey Progress Visualization**: Visual progress bar and step indicators showing current leg position
- **Fallback Options**: Retry mechanisms and cancellation options for failed requests
- **Dark Mode Support**: Full dark mode compatibility with theme switching
- **Responsive Design**: Adapts to different screen sizes and orientations

## Components

### 1. LegTransition.tsx
The main component that renders the leg transition interface.

### 2. useLegTransition.ts
A custom hook that manages the state and logic for leg transitions.

### 3. LegTransitionDemo.tsx
A demonstration component showing how to integrate and use the LegTransition component.

## Usage

### Basic Integration

```tsx
import React from 'react';
import LegTransition from './components/LegTransition';
import useLegTransition from './hooks/useLegTransition';

const MyComponent = () => {
  const {
    transferStatus,
    nextLegRequestStatus,
    isTransitionVisible,
    errorMessage,
    estimatedArrivalTime,
    handleArrival,
    handleConfirmNextLeg,
    handleRetryRequest,
    handleCancelJourney,
  } = useLegTransition({
    currentLeg,
    nextLeg,
    journey,
    onRequestNextLegTaxi: requestNextLegTaxi,
    onProgressJourney: progressJourney,
    onCancelJourney: cancelJourney,
    transferProximity: 1.5, // km
    transferThreshold: 2.0, // km
  });

  return (
    <LegTransition
      visible={isTransitionVisible}
      currentLeg={currentLeg}
      nextLeg={nextLeg}
      journey={journey}
      onConfirmNextLeg={handleConfirmNextLeg}
      onRequestNextLeg={handleRetryRequest}
      onCancelJourney={handleCancelJourney}
      onRetryRequest={handleRetryRequest}
      transferStatus={transferStatus}
      nextLegRequestStatus={nextLegRequestStatus}
      errorMessage={errorMessage}
      estimatedArrivalTime={estimatedArrivalTime}
      isDarkMode={isDarkMode}
    />
  );
};
```

### Props

#### LegTransition Props

| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Whether the transition interface is visible |
| `currentLeg` | `JourneyLeg` | The current leg being completed |
| `nextLeg` | `JourneyLeg` | The next leg to be started |
| `journey` | `MultiLegJourney` | The complete journey information |
| `onConfirmNextLeg` | `() => void` | Callback when user confirms next leg |
| `onRequestNextLeg` | `() => Promise<void>` | Callback to request next leg taxi |
| `onCancelJourney` | `() => void` | Callback when user cancels journey |
| `onRetryRequest` | `() => Promise<void>` | Callback to retry failed request |
| `transferStatus` | `TransferStatus` | Current transfer status |
| `nextLegRequestStatus` | `NextLegRequestStatus` | Status of next leg request |
| `errorMessage` | `string?` | Error message if request failed |
| `estimatedArrivalTime` | `number?` | Estimated arrival time in milliseconds |
| `isDarkMode` | `boolean?` | Whether to use dark mode styling |

#### useLegTransition Props

| Prop | Type | Description |
|------|------|-------------|
| `currentLeg` | `JourneyLeg` | The current leg being completed |
| `nextLeg` | `JourneyLeg` | The next leg to be started |
| `journey` | `MultiLegJourney` | The complete journey information |
| `onRequestNextLegTaxi` | `(journeyId: string, legIndex: number) => Promise<void>` | Function to request next leg taxi |
| `onProgressJourney` | `(journeyId: string, completedLegIndex: number) => Promise<void>` | Function to progress journey |
| `onCancelJourney` | `(journeyId: string) => Promise<void>` | Function to cancel journey |
| `transferProximity` | `number` | Current distance to transfer point in km |
| `transferThreshold` | `number` | Distance threshold to trigger transfer (default: 2km) |

## State Management

### Transfer Status
- `arriving`: Approaching transfer point
- `arrived`: Reached transfer point
- `requesting`: Requesting next leg taxi
- `confirmed`: Next leg confirmed
- `failed`: Transfer failed

### Next Leg Request Status
- `pending`: Request not yet made
- `success`: Request successful
- `failed`: Request failed
- `timeout`: Request timed out

## Integration with Existing Components

### SeatReserved.tsx Integration

```tsx
// In SeatReserved.tsx
import LegTransition from '../components/LegTransition';
import useLegTransition from '../hooks/useLegTransition';

const SeatReserved = () => {
  // ... existing code ...

  const {
    transferStatus,
    nextLegRequestStatus,
    isTransitionVisible,
    errorMessage,
    estimatedArrivalTime,
    handleArrival,
    handleConfirmNextLeg,
    handleRetryRequest,
    handleCancelJourney,
  } = useLegTransition({
    currentLeg: currentJourney?.legs[currentLegIndex],
    nextLeg: currentJourney?.legs[currentLegIndex + 1],
    journey: currentJourney,
    onRequestNextLegTaxi: requestNextLegTaxi,
    onProgressJourney: progressJourney,
    onCancelJourney: cancelJourney,
    transferProximity: calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      nextLeg?.toCoordinates.latitude,
      nextLeg?.toCoordinates.longitude
    ),
    transferThreshold: 2.0,
  });

  // ... existing code ...

  return (
    <View style={styles.container}>
      {/* ... existing UI ... */}
      
      <LegTransition
        visible={isTransitionVisible}
        currentLeg={currentJourney?.legs[currentLegIndex]}
        nextLeg={currentJourney?.legs[currentLegIndex + 1]}
        journey={currentJourney}
        onConfirmNextLeg={handleConfirmNextLeg}
        onRequestNextLeg={handleRetryRequest}
        onCancelJourney={handleCancelJourney}
        onRetryRequest={handleRetryRequest}
        transferStatus={transferStatus}
        nextLegRequestStatus={nextLegRequestStatus}
        errorMessage={errorMessage}
        estimatedArrivalTime={estimatedArrivalTime}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};
```

## Styling

The component supports both light and dark modes with automatic theme switching. All styles are defined using StyleSheet and can be customized by modifying the styles object.

### Customization

To customize the appearance, you can:

1. Modify the styles in `LegTransition.tsx`
2. Override styles using the `isDarkMode` prop
3. Create a theme context for consistent styling across the app

## Error Handling

The component includes comprehensive error handling for:

- Failed taxi requests
- Network timeouts
- Invalid journey states
- User cancellations

Error messages are displayed to the user with appropriate retry options.

## Accessibility

The component includes:

- Proper accessibility labels
- Screen reader support
- High contrast mode support
- Touch target optimization

## Testing

Use the `LegTransitionDemo.tsx` component to test different scenarios:

- Normal transition flow
- Failed requests
- Timeout scenarios
- User cancellations
- Dark mode switching

## Dependencies

- React Native
- React Native Elements (for icons)
- TypeScript
- Custom types from `../types/multiLegJourney`

## Future Enhancements

- Voice announcements for accessibility
- Haptic feedback for notifications
- Offline mode support
- Advanced error recovery options
- Customizable UI themes
