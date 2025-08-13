// contexts/UserContext.tsx - Simple version without auto-navigation
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions (keep your existing types)
interface User {
  id: string;
  name: string;
  role: string | undefined;
  accountType: "passenger" | "driver" | "both";
  phoneNumber: string,
}

interface UserLoginData {
  _id?: string;
  id?: string;
  name: string;
  currentActiveRole?: "passenger" | "driver" | undefined;
  accountType: "passenger" | "driver" | "both";
  phoneNumber: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (userData: UserLoginData) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (newRole: string | undefined) => Promise<void>;
  updateUserName: (newName: string) => Promise<void>;
  updateNumber: (newNumber: string) => Promise<void>;
  updateAccountType: (newAccountType: "passenger" | "driver" | "both") => Promise<void>;
  setUserId: (id: string) => Promise<void>;  
}

interface UserProviderProps {
  children: ReactNode;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async (): Promise<void> => {
    try {
      const userData = await AsyncStorage.multiGet(['userId', 'userName', 'userRole', 'userAccountType', 'userNumber' ]);
      const [userId, userName, userRole, userAccountType, userNumber] = userData.map(([key, value]) => value);
      
      if (userId) {
        setUser({
          id: userId,
          name: userName || '',
          role: userRole || '',
          accountType: userAccountType as "passenger" | "driver" | "both" || 'passenger',
          phoneNumber: userNumber || '',
        });
      }
      // REMOVED: Automatic navigation - let components handle navigation
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData: UserLoginData): Promise<void> => {
    const userInfo: User = {
      id: userData._id || userData.id || '',
      name: userData.name,
      role: userData.currentActiveRole,
      accountType: userData.accountType,
      phoneNumber: userData.phoneNumber,
    };
    
    setUser(userInfo);
    
    // Save to AsyncStorage
    await AsyncStorage.multiSet([
      ['userId', userInfo.id],
      ['userName', userInfo.name],
      ['userRole', userInfo.role || ''],
      ['userAccountType', userInfo.accountType],
      ['userNumber', userInfo.phoneNumber],
    ]);

    // REMOVED: Automatic navigation - let Login component handle navigation
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear user state
      setUser(null);
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(['userId', 'userName', 'userRole', 'userAccountType', 'userNumber']);
      
      // REMOVED: Automatic navigation - let Logout component handle navigation
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUserRole = async (newRole: string | undefined): Promise<void> => {
    if (user) {
      const updatedUser: User = { ...user, role: newRole };
      setUser(updatedUser);
      await AsyncStorage.setItem('userRole', newRole || '');
    }
  };

  const updateUserName = async (newName: string): Promise<void> => {
    if (user) {
      const updatedUser: User = { ...user, name: newName };
      setUser(updatedUser);
      await AsyncStorage.setItem('userName', newName);
    }
  };

  const updateNumber = async (newNumber: string): Promise<void> => {
    if (user) {
      const updatedUser: User = { ...user, phoneNumber: newNumber };
      setUser(updatedUser);
      await AsyncStorage.setItem('userNumber', newNumber);
    }
  };

  const updateAccountType = async (newAccountType: "passenger" | "driver" | "both"): Promise<void> => {
    if (user) {
      const updatedUser: User = { ...user, accountType: newAccountType };
      setUser(updatedUser);
      await AsyncStorage.setItem('userAccountType', newAccountType);
    }
  };

  const setUserId = async (id: string): Promise<void> => {
    // overwrite or create the user object
    setUser((prev) =>
      prev ? { ...prev, id } : { id, name: '', role: undefined, accountType: 'passenger', phoneNumber: '' },
    );
    await AsyncStorage.setItem('userId', id);
  };

  const contextValue: UserContextType = {
    user,
    loading,
    login,
    logout,
    updateUserRole,
    updateUserName,
    updateAccountType,
    updateNumber,
    setUserId,   
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};