# Alert System Documentation

## Overview

The Alert System provides a comprehensive replacement for React Native's `Alert.alert` with full customization options, better UX, and support for both global and local alerts.

## Features

- **Dual-Layer Architecture**: Global alerts (persist across navigation) and local alerts (page-specific)
- **Full Customization**: Position, animation, styling, duration, and actions
- **Replacement Logic**: New alerts replace existing ones to prevent stacking
- **Multiple Animation Types**: Slide, fade, scale, bounce animations
- **Action Support**: Custom buttons with different styles (default, destructive, cancel)
- **Auto-dismiss**: Configurable duration with manual dismiss option
- **TypeScript Support**: Full type safety and IntelliSense

## Setup

### 1. Wrap your app with AlertProvider

```tsx
// App.tsx or _layout.tsx
import { AlertProvider } from '../contexts/AlertContext';
import { AlertOverlay } from '../components/AlertOverlay';

export default function App() {
  return (
    <AlertProvider>
      {/* Your app components */}
      <AlertOverlay />
    </AlertProvider>
  );
}
```

### 2. Import and use in your components

```tsx
import { useAlertHelpers } from '../components/AlertHelpers';

const MyComponent = () => {
  const { showSuccess, showError, showConfirm } = useAlertHelpers();
  
  // Use the alert functions
};
```

## Basic Usage

### Quick Alerts

```tsx
const { showSuccess, showError, showWarning, showInfo } = useAlertHelpers();

// Success alert
showSuccess('Success!', 'Your action was completed successfully.');

// Error alert
showError('Error!', 'Something went wrong. Please try again.');

// Warning alert
showWarning('Warning!', 'Please check your input.');

// Info alert
showInfo('Info', 'Here is some information.');
```

### Toast Notifications

```tsx
const { showToast } = useAlertHelpers();

// Simple toast
showToast('Message sent successfully');

// Custom toast
showToast('Custom toast', {
  style: {
    backgroundColor: '#FF6B6B',
    textColor: '#FFFFFF',
  },
  duration: 5000,
});
```

### Confirmation Dialogs

```tsx
const { showConfirm, showDestructiveConfirm } = useAlertHelpers();

// Basic confirmation
showConfirm(
  'Delete Item',
  'Are you sure you want to delete this item?',
  () => console.log('Confirmed'),
  () => console.log('Cancelled')
);

// Destructive confirmation
showDestructiveConfirm(
  'Delete Account',
  'This action cannot be undone. Are you sure?',
  () => console.log('Account deleted'),
  () => console.log('Cancelled')
);
```

### Modal with Custom Actions

```tsx
const { showModal } = useAlertHelpers();

const actions = [
  {
    label: 'Save',
    onPress: () => console.log('Saved'),
    style: 'default',
  },
  {
    label: 'Cancel',
    onPress: () => console.log('Cancelled'),
    style: 'cancel',
  },
  {
    label: 'Delete',
    onPress: () => console.log('Deleted'),
    style: 'destructive',
  },
];

showModal('Save Changes', 'Do you want to save your changes?', actions);
```

## Global vs Local Alerts

### Global Alerts (Persist across navigation)

```tsx
const { showGlobalSuccess, showGlobalError, showBanner } = useAlertHelpers();

// Global success (persists across navigation)
showGlobalSuccess('Connection Restored', 'You are back online.');

// Global error
showGlobalError('Connection Lost', 'Please check your internet connection.');

// Banner notification
showBanner('Maintenance', 'Scheduled maintenance in 30 minutes.');
```

### Local Alerts (Page-specific)

```tsx
const { showSuccess, showError } = useAlertHelpers();

// Local alerts (dismiss when leaving page)
showSuccess('Form Saved', 'Your changes have been saved.');
showError('Validation Error', 'Please check your input.');
```

## Advanced Customization

### Custom Styling

```tsx
const { showLocalAlert } = useAlertHelpers();

const customStyle = {
  backgroundColor: '#6C5CE7',
  textColor: '#FFFFFF',
  borderColor: '#A29BFE',
  borderWidth: 2,
  borderRadius: 20,
  shadowColor: '#6C5CE7',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
};

showLocalAlert({
  title: 'Custom Alert',
  message: 'This is a custom styled alert',
  type: 'custom',
  position: 'top-right',
  animation: 'slide-left',
  duration: 4000,
  style: customStyle,
});
```

### Different Positions

```tsx
// Available positions: 'top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
showLocalAlert({
  title: 'Top Right Alert',
  message: 'This appears in the top right corner',
  position: 'top-right',
  animation: 'slide-left',
});
```

### Different Animations

```tsx
// Available animations: 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'fade', 'scale', 'bounce'
showLocalAlert({
  title: 'Bouncing Alert',
  message: 'This alert bounces in',
  animation: 'bounce',
});
```

## Migration from Alert.alert

### Before (Alert.alert)

```tsx
import { Alert } from 'react-native';

// Simple alert
Alert.alert('Title', 'Message');

// Alert with buttons
Alert.alert(
  'Delete Item',
  'Are you sure?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteItem() },
  ]
);
```

### After (Alert System)

```tsx
import { useAlertHelpers } from '../components/AlertHelpers';

const { showInfo, showConfirm, showDestructiveConfirm } = useAlertHelpers();

// Simple alert
showInfo('Title', 'Message');

// Alert with buttons
showConfirm(
  'Delete Item',
  'Are you sure?',
  () => deleteItem(),
  () => console.log('Cancelled')
);

// Or for destructive actions
showDestructiveConfirm(
  'Delete Item',
  'Are you sure?',
  () => deleteItem(),
  () => console.log('Cancelled')
);
```

## API Reference

### AlertContext

```tsx
interface AlertContextType {
  // Global alerts
  globalAlerts: Alert[];
  showGlobalAlert: (alert: Omit<Alert, "id" | "timestamp">) => string;
  dismissGlobalAlert: (id: string) => void;
  dismissAllGlobalAlerts: () => void;
  
  // Local alerts
  localAlerts: Alert[];
  showLocalAlert: (alert: Omit<Alert, "id" | "timestamp">) => string;
  dismissLocalAlert: (id: string) => void;
  dismissAllLocalAlerts: () => void;
  
  // Utility functions
  showAlert: (alert: Omit<Alert, "id" | "timestamp">) => string;
  dismissAlert: (id: string, isGlobal?: boolean) => void;
  dismissAllAlerts: () => void;
}
```

### Alert Interface

```tsx
interface Alert {
  id: string;
  title: string;
  message: string;
  type: AlertType; // 'info' | 'success' | 'warning' | 'error' | 'custom'
  position: AlertPosition; // 'top' | 'bottom' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  animation: AlertAnimation; // 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'fade' | 'scale' | 'bounce'
  duration?: number; // Auto-dismiss duration in ms (0 = no auto-dismiss)
  actions?: AlertAction[];
  style?: AlertStyle;
  isGlobal?: boolean;
  timestamp: Date;
  data?: any;
}
```

### AlertAction Interface

```tsx
interface AlertAction {
  label: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
}
```

### AlertStyle Interface

```tsx
interface AlertStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}
```

## Best Practices

### 1. Use Global Alerts for System-wide Messages

```tsx
// Good: Connection status, maintenance notices
showGlobalError('Connection Lost', 'Please check your internet connection.');

// Good: App-wide notifications
showGlobalSuccess('Update Available', 'A new version is ready to install.');
```

### 2. Use Local Alerts for Page-specific Feedback

```tsx
// Good: Form validation, local actions
showSuccess('Form Saved', 'Your changes have been saved.');
showError('Invalid Input', 'Please check your email address.');
```

### 3. Choose Appropriate Durations

```tsx
// Short duration for quick feedback
showToast('Message sent', { duration: 2000 });

// Longer duration for important messages
showError('Critical Error', 'Please contact support.', { duration: 8000 });

// No auto-dismiss for user action required
showConfirm('Delete Item', 'Are you sure?', onConfirm, onCancel);
```

### 4. Use Appropriate Positions

```tsx
// Top for important notifications
showError('Error', 'Something went wrong', { position: 'top' });

// Bottom for toast-style messages
showToast('Message sent', { position: 'bottom' });

// Center for modals requiring attention
showConfirm('Delete', 'Are you sure?', onConfirm, onCancel, { position: 'center' });
```

### 5. Leverage Preset Styles

```tsx
// Use presets for consistency
showSuccess('Success!', 'Operation completed.');
showError('Error!', 'Something went wrong.');
showWarning('Warning!', 'Please check your input.');

// Customize when needed
showSuccess('Custom Success', 'Operation completed.', {
  style: { backgroundColor: '#00B894' }
});
```

## Troubleshooting

### Alerts not showing

1. Make sure `AlertProvider` wraps your app
2. Ensure `AlertOverlay` is rendered in your app
3. Check that you're calling alert functions from within a component

### Alerts stacking up

- The system automatically replaces existing alerts
- Use `dismissAllAlerts()` to manually clear all alerts
- Check for multiple rapid calls to alert functions

### Animation performance issues

- All animations use `useNativeDriver: true` for better performance
- Avoid animating layout properties
- Consider using simpler animations on older devices

### Styling not applying

- Check that your custom styles override the default styles correctly
- Ensure color values are valid hex codes
- Verify that the style object structure matches `AlertStyle` interface

## Examples

See `AlertHelpers.tsx` for comprehensive usage examples and common patterns.
