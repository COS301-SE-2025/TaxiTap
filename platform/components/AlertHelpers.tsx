import { useAlerts, Alert, AlertType, AlertPosition, AlertAnimation, AlertAction, AlertStyle } from '../contexts/AlertContext';

// Preset styles for common alert types
export const AlertPresets = {
  // Success alerts
  success: {
    type: 'success' as AlertType,
    position: 'top' as AlertPosition,
    animation: 'slide-down' as AlertAnimation,
    duration: 3000,
    style: {
      backgroundColor: '#34C759',
      textColor: '#FFFFFF',
      borderRadius: 12,
    },
  },
  
  // Error alerts
  error: {
    type: 'error' as AlertType,
    position: 'top' as AlertPosition,
    animation: 'slide-down' as AlertAnimation,
    duration: 5000,
    style: {
      backgroundColor: '#FF3B30',
      textColor: '#FFFFFF',
      borderRadius: 12,
    },
  },
  
  // Warning alerts
  warning: {
    type: 'warning' as AlertType,
    position: 'top' as AlertPosition,
    animation: 'slide-down' as AlertAnimation,
    duration: 4000,
    style: {
      backgroundColor: '#FF9500',
      textColor: '#FFFFFF',
      borderRadius: 12,
    },
  },
  
  // Info alerts
  info: {
    type: 'info' as AlertType,
    position: 'top' as AlertPosition,
    animation: 'slide-down' as AlertAnimation,
    duration: 3000,
    style: {
      backgroundColor: '#007AFF',
      textColor: '#FFFFFF',
      borderRadius: 12,
    },
  },
  
  // Toast-style alerts (bottom positioned)
  toast: {
    position: 'bottom' as AlertPosition,
    animation: 'slide-up' as AlertAnimation,
    duration: 3000,
    style: {
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      borderRadius: 8,
    },
  },
  
  // Banner-style alerts (full width, top)
  banner: {
    position: 'top' as AlertPosition,
    animation: 'slide-down' as AlertAnimation,
    duration: 0, // No auto-dismiss
    style: {
      backgroundColor: '#007AFF',
      textColor: '#FFFFFF',
      borderRadius: 0,
    },
  },
  
  // Modal-style alerts (center)
  modal: {
    position: 'center' as AlertPosition,
    animation: 'scale' as AlertAnimation,
    duration: 0, // No auto-dismiss
    style: {
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// Helper hook for easy alert usage
export const useAlertHelpers = () => {
  const { showLocalAlert, showGlobalAlert } = useAlerts();

  // Quick success alert
  const showSuccess = (title: string, message: string, options?: Partial<Alert>) => {
    return showLocalAlert({
      title,
      message,
      ...AlertPresets.success,
      ...options,
    });
  };

  // Quick error alert
  const showError = (title: string, message: string, options?: Partial<Alert>) => {
    return showLocalAlert({
      title,
      message,
      ...AlertPresets.error,
      ...options,
    });
  };

  // Quick warning alert
  const showWarning = (title: string, message: string, options?: Partial<Alert>) => {
    return showLocalAlert({
      title,
      message,
      ...AlertPresets.warning,
      ...options,
    });
  };

  // Quick info alert
  const showInfo = (title: string, message: string, options?: Partial<Alert>) => {
    return showLocalAlert({
      title,
      message,
      ...AlertPresets.info,
      ...options,
    });
  };

  // Toast notification
  const showToast = (message: string, options?: Partial<Alert>) => {
    return showLocalAlert({
      title: '',
      message,
      type: 'toast' as AlertType,
      ...AlertPresets.toast,
      ...options,
    });
  };

  // Banner notification (global)
  const showBanner = (title: string, message: string, options?: Partial<Alert>) => {
    return showGlobalAlert({
      title,
      message,
      type: 'banner' as AlertType, // or another valid AlertType, e.g. 'banner' if defined
      ...AlertPresets.banner,
      ...options,
    });
  };

  // Modal alert with actions
  const showModal = (
    title: string, 
    message: string, 
    actions: AlertAction[], 
    options?: Partial<Alert>
  ) => {
    return showLocalAlert({
      title,
      message,
      actions,
      type: 'modal' as AlertType,
      ...AlertPresets.modal,
      ...options,
    });
  };

  // Confirmation dialog
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    const actions: AlertAction[] = [
      {
        label: confirmText,
        onPress: onConfirm,
        style: 'default',
      },
    ];

    if (onCancel) {
      actions.unshift({
        label: cancelText,
        onPress: onCancel,
        style: 'cancel',
      });
    }

    return showModal(title, message, actions);
  };

  // Destructive confirmation
  const showDestructiveConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'Delete',
    cancelText = 'Cancel'
  ) => {
    const actions: AlertAction[] = [
      {
        label: confirmText,
        onPress: onConfirm,
        style: 'destructive',
      },
    ];

    if (onCancel) {
      actions.unshift({
        label: cancelText,
        onPress: onCancel,
        style: 'cancel',
      });
    }

    return showModal(title, message, actions);
  };

  // Global success alert
  const showGlobalSuccess = (title: string, message: string, options?: Partial<Alert>) => {
    return showGlobalAlert({
      title,
      message,
      ...AlertPresets.success,
      ...options,
    });
  };

  // Global error alert
  const showGlobalError = (title: string, message: string, options?: Partial<Alert>) => {
    return showGlobalAlert({
      title,
      message,
      ...AlertPresets.error,
      ...options,
    });
  };

  return {
    // Local alerts
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showToast,
    showModal,
    showConfirm,
    showDestructiveConfirm,
    
    // Global alerts
    showGlobalSuccess,
    showGlobalError,
    showBanner,
    
    // Raw functions
    showLocalAlert,
    showGlobalAlert,
  };
};

// Usage examples and common patterns
export const AlertExamples = {
  // Basic usage
  basic: () => {
    const { showSuccess, showError } = useAlertHelpers();
    
    // Show success message
    showSuccess('Success!', 'Your action was completed successfully.');
    
    // Show error message
    showError('Error!', 'Something went wrong. Please try again.');
  },

  // Toast notifications
  toast: () => {
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
  },

  // Confirmation dialogs
  confirmation: () => {
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
  },

  // Modal with custom actions
  modal: () => {
    const { showModal } = useAlertHelpers();
    
    const actions: AlertAction[] = [
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
  },

  // Global alerts
  global: () => {
    const { showGlobalSuccess, showGlobalError, showBanner } = useAlertHelpers();
    
    // Global success (persists across navigation)
    showGlobalSuccess('Connection Restored', 'You are back online.');
    
    // Global error
    showGlobalError('Connection Lost', 'Please check your internet connection.');
    
    // Banner notification
    showBanner('Maintenance', 'Scheduled maintenance in 30 minutes.');
  },

  // Custom styling
  custom: () => {
    const { showLocalAlert } = useAlertHelpers();
    
    const customStyle: AlertStyle = {
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
  },
};
