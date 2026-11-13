import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { authenticate, type AuthUser } from '../services/authService';
import { colors } from '../theme/tokens';

type Props = { onAuthenticated: (token: string, user: AuthUser, isNewAccount: boolean) => void | Promise<void> };

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === 'register' && name.trim().length < 2) { Alert.alert('Name required', 'Enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { Alert.alert('Check your email', 'Enter a valid email address.'); return; }
    if (password.length < 8) { Alert.alert('Password too short', 'Use at least 8 characters.'); return; }
    if (mode === 'register' && password !== confirmPassword) { Alert.alert('Passwords do not match', 'Enter the same password in both fields.'); return; }
    setBusy(true);
    try {
      const result = await authenticate(mode === 'login' ? '/login' : '/register', mode === 'login'
        ? { email: normalizedEmail, password }
        : { name: name.trim(), email: normalizedEmail, password });
      await onAuthenticated(result.token, result.user, mode === 'register');
    } catch (error) {
      Alert.alert('Unable to continue', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.page}>
    <View style={s.card}>
      <Text style={s.brand}>SpendSense</Text>
      <Text style={s.title}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
      <Text style={s.sub}>{mode === 'login' ? 'Sign in to manage your money' : 'Start tracking your spending securely'}</Text>
      {mode === 'register' ? <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} style={s.input} autoCapitalize="words" maxLength={80} /> : null}
      <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} style={s.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" placeholderTextColor={colors.muted} style={s.input} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      {mode === 'register' ? <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" placeholderTextColor={colors.muted} style={s.input} secureTextEntry /> : null}
      <Pressable onPress={submit} disabled={busy} style={[s.button, busy && { opacity: 0.7 }]}>{busy ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>}</Pressable>
      {mode === 'login' ? <Pressable onPress={() => Alert.alert('Password reset', 'Password reset email delivery is not configured yet. Contact the application administrator to reset your password.') }><Text style={s.forgot}>Forgot password?</Text></Pressable> : null}
      <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setPassword(''); setConfirmPassword(''); }}><Text style={s.switch}>{mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}</Text></Pressable>
      <Text style={s.foot}>Secure JWT authentication · Clerk migration planned for the final phase</Text>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({ page:{flex:1,backgroundColor:colors.background,justifyContent:'center',padding:24},card:{backgroundColor:'#fff',borderRadius:28,padding:24},brand:{color:colors.primary,fontSize:18,fontWeight:'800',marginBottom:28},title:{fontSize:28,fontWeight:'800',color:'#202033'},sub:{color:'#77778a',marginTop:8,marginBottom:24},input:{backgroundColor:'#F5F3FC',borderRadius:14,padding:16,marginBottom:12,color:'#222'},button:{backgroundColor:colors.primary,borderRadius:15,padding:17,alignItems:'center',justifyContent:'center',marginTop:8,minHeight:54},buttonText:{color:'#fff',fontWeight:'800'},forgot:{textAlign:'center',color:colors.muted,fontSize:11,fontWeight:'600',marginTop:15},switch:{textAlign:'center',color:colors.primary,fontWeight:'700',marginTop:20},foot:{textAlign:'center',fontSize:10,color:'#999',marginTop:24}});
