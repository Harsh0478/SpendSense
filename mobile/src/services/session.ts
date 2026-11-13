import * as SecureStore from 'expo-secure-store';

export const AUTH_TOKEN_KEY = 'spendsense_token';
export const AUTH_USER_KEY = 'spendsense_user';
export const getAuthToken = (): Promise<string | null> => SecureStore.getItemAsync(AUTH_TOKEN_KEY);
