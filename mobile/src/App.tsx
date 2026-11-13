import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import HomeScreen from './screens/HomeScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import ProfileScreen from './screens/ProfileScreen';
import { AnimatedFloatingTabBar } from './navigation/AnimatedFloatingTabBar';
import WelcomeScreen from './screens/WelcomeScreen';
import { colors } from './theme/tokens';
import AuthScreen from './screens/AuthScreen';
import { AuthSessionProvider } from './services/authSession';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from './services/session';
import { AuthRequestError, getCurrentUser, type AuthUser } from './services/authService';

export type RootTabParamList = { Home: undefined; Transactions: undefined; AddTransaction: undefined; Budgets: undefined; Profile: undefined };
const Tab = createBottomTabNavigator<RootTabParamList>();
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, card: colors.background, text: colors.ink, border: colors.background, primary: colors.primary } };

type Session = { token: string; user: AuthUser };

function AppContent() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (!token) return;
        const user = await getCurrentUser(token);
        await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
        if (active) setSession({ token, user });
      } catch (error) {
        if (error instanceof AuthRequestError && error.status === 401) {
          await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => undefined);
          await SecureStore.deleteItemAsync(AUTH_USER_KEY).catch(() => undefined);
        } else {
          const cached = await SecureStore.getItemAsync(AUTH_USER_KEY).catch(() => null);
          if (cached && active && token) {
            try { setSession({ token, user: JSON.parse(cached) as AuthUser }); } catch { /* ignore invalid cached profile */ }
          }
        }
      } finally {
        if (active) setChecking(false);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  const onAuthenticated = async (token: string, user: AuthUser, isNewAccount: boolean) => {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
    setSession({ token, user });
    setShowWelcome(isNewAccount);
  };

  const updateUser = async (user: AuthUser) => {
    if (!session) return;
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
    setSession(current => current ? { ...current, user } : current);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    queryClient.clear();
    setShowWelcome(false);
    setSession(null);
  };

  if (checking) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!session) return <AuthScreen onAuthenticated={onAuthenticated} />;
  if (showWelcome) return <WelcomeScreen onContinue={() => setShowWelcome(false)} />;

  return <AuthSessionProvider value={{ user: session.user, logout, updateUser }}>
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <Tab.Navigator initialRouteName="Home" tabBar={(props) => <AnimatedFloatingTabBar {...props} />} screenOptions={{ headerShown: false, tabBarShowLabel: false, sceneStyle: { backgroundColor: colors.background } }}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="AddTransaction" component={AddTransactionScreen} />
        <Tab.Screen name="Budgets" component={BudgetsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  </AuthSessionProvider>;
}

export default function App() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><QueryClientProvider client={queryClient}><AppContent /></QueryClientProvider></SafeAreaProvider></GestureHandlerRootView>;
}
