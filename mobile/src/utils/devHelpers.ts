import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all authentication tokens and user data
 * Use this in development to force the login screen
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    console.log('✅ Auth data cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear auth data:', error);
    return false;
  }
};

/**
 * Log current auth state
 */
export const logAuthState = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const user = await AsyncStorage.getItem('user');
    
    console.log('🔍 Auth State:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUser: !!user,
      accessToken: accessToken?.substring(0, 20) + '...',
    });
  } catch (error) {
    console.error('❌ Failed to log auth state:', error);
  }
};

// Make these available globally in __DEV__ mode
if (__DEV__) {
  (global as any).clearAuth = clearAuthData;
  (global as any).logAuth = logAuthState;
  console.log('🛠️ Dev helpers loaded. Use clearAuth() or logAuth() in console.');
}
