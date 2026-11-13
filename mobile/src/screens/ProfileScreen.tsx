import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel } from '../components/Panel';
import { Screen } from '../components/Screen';
import { colors, radius } from '../theme/tokens';
import { useAuthSession } from '../services/authSession';
import { confirmStatementImport, pickAndPreviewStatement, type ImportPreview } from '../features/import/importService';
import { archiveAccount, createAccount, createCategory, deleteCategory, listAccounts, listCategories, updateMyProfile, type AccountInput, type CategoryInput } from '../features/core/coreService';
import { getAuthToken } from '../services/session';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthSession();
  const [editProfile, setEditProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const profileMutation = useMutation({ mutationFn: () => updateMyProfile({ name: profileName.trim(), email: profileEmail.trim() }, getAuthToken), onSuccess: async (result) => { await updateUser(result.data); setEditProfile(false); Alert.alert('Profile updated', 'Your personal information has been saved.'); }, onError: (error) => Alert.alert('Could not update profile', error instanceof Error ? error.message : 'Please try again.') });
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountInput['type']>('BANK');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<NonNullable<CategoryInput['type']>>('DEBIT');
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: async () => (await listAccounts(getAuthToken)).data });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: async () => (await listCategories(getAuthToken)).data });
  const addAccountMutation = useMutation({ mutationFn: () => createAccount({ name: accountName.trim(), type: accountType }, getAuthToken), onSuccess: async () => { setAccountName(''); setShowAddAccount(false); await queryClient.invalidateQueries({ queryKey: ['accounts'] }); }, onError: (error) => Alert.alert('Could not add account', error instanceof Error ? error.message : 'Please try again.') });
  const archiveMutation = useMutation({ mutationFn: (id: string) => archiveAccount(id, getAuthToken), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }), onError: (error) => Alert.alert('Could not archive account', error instanceof Error ? error.message : 'Please try again.') });
  const addCategoryMutation = useMutation({ mutationFn: () => createCategory({ name: categoryName.trim(), type: categoryType }, getAuthToken), onSuccess: async () => { setCategoryName(''); setShowAddCategory(false); await queryClient.invalidateQueries({ queryKey: ['categories'] }); }, onError: (error) => Alert.alert('Could not add category', error instanceof Error ? error.message : 'Please try again.') });
  const removeCategoryMutation = useMutation({ mutationFn: (id: string) => deleteCategory(id, getAuthToken), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }), onError: (error) => Alert.alert('Could not delete category', error instanceof Error ? error.message : 'Please try again.') });

  const importStatement = async () => {
    try {
      setImporting(true);
      const result = await pickAndPreviewStatement(getAuthToken);
      if (!result) return;
      setImportPreview(result);
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Please try another statement file.');
    } finally { setImporting(false); }
  };


  const confirmImport = async () => {
    if (!importPreview) return;
    try {
      setImporting(true);
      const result = await confirmStatementImport(importPreview.batchId, getAuthToken);
      setImportPreview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      ]);
      Alert.alert('Import complete', `${result.importedCount} imported · ${result.duplicateCount} duplicates · ${result.skippedCount} skipped.`);
    } catch (error) {
      Alert.alert('Import confirmation failed', error instanceof Error ? error.message : 'Please try again.');
    } finally { setImporting(false); }
  };

  const confirmLogout = () => Alert.alert('Sign out?', 'Your saved transactions will remain in your SpendSense account.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: () => { void logout(); } },
  ]);

  return <Screen>
    <View><Text style={styles.title}>Profile</Text><Text style={styles.sub}>Your account and preferences</Text></View>
    <Panel style={styles.profile}>
      <View style={styles.avatar}><Ionicons name="person" size={25} color={colors.primary} /></View>
      <Text style={styles.name}>{user.name}</Text><Text style={styles.email}>{user.email}</Text>
      <View style={styles.stats}><View><Text style={styles.statValue}>INR</Text><Text style={styles.statLabel}>Currency</Text></View><View style={styles.statDivider} /><View><Text style={styles.statValue}>JWT</Text><Text style={styles.statLabel}>Session</Text></View><View style={styles.statDivider} /><View><Text style={styles.statValue}>Cloud</Text><Text style={styles.statLabel}>Storage</Text></View></View>
    </Panel>
    <Panel style={{ paddingVertical: 2 }}>
      <Pressable style={styles.item} onPress={() => { setProfileName(user.name); setProfileEmail(user.email); setEditProfile(true); }}><View style={styles.itemIcon}><Ionicons name="person-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>Personal information</Text><Text style={styles.itemDetail}>Edit your name and email address</Text></View><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>
      <View style={styles.item}><View style={styles.itemIcon}><Ionicons name="notifications-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>Budget reminders</Text><Text style={styles.itemDetail}>In-app alerts appear when category spending reaches your budget threshold. Configure each threshold in Budgets.</Text></View></View>
      <View style={styles.item}><View style={styles.itemIcon}><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>Privacy & security</Text><Text style={styles.itemDetail}>Protected APIs and secure token storage</Text></View></View>
    </Panel>
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Accounts</Text><Pressable onPress={() => setShowAddAccount((value) => !value)}><Text style={styles.addAction}>{showAddAccount ? 'Cancel' : '+ Add account'}</Text></Pressable></View>
    {showAddAccount ? <Panel style={{ gap: 10 }}><TextInput value={accountName} onChangeText={setAccountName} placeholder="Account name" placeholderTextColor={colors.muted} style={styles.accountInput} /><View style={styles.accountTypes}>{(['BANK','CASH','UPI','CREDIT_CARD','WALLET','OTHER'] as const).map((type) => <Pressable key={type} onPress={() => setAccountType(type)} style={[styles.typeChip, accountType === type && styles.typeChipActive]}><Text style={[styles.typeText, accountType === type && styles.typeTextActive]}>{type.replace('_', ' ')}</Text></Pressable>)}</View><Pressable style={styles.addAccountButton} onPress={() => { if (!accountName.trim()) { Alert.alert('Account name required', 'Enter a name for this account.'); return; } addAccountMutation.mutate(); }} disabled={addAccountMutation.isPending}>{addAccountMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addAccountText}>Save account</Text>}</Pressable></Panel> : null}
    {accountsQuery.isLoading ? <Panel><ActivityIndicator color={colors.primary} /></Panel> : null}
    {accountsQuery.isError ? <Panel><Text style={styles.itemDetail}>Could not load accounts: {accountsQuery.error instanceof Error ? accountsQuery.error.message : 'Please try again.'}</Text></Panel> : null}
    {accountsQuery.data?.length ? <Panel style={{ paddingVertical: 2 }}>{accountsQuery.data.map((account) => <View key={account._id} style={styles.accountRow}><View style={styles.itemIcon}><Ionicons name="wallet-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{account.name}</Text><Text style={styles.itemDetail}>{account.type.replace('_', ' ')}{account.institution ? ` · ${account.institution}` : ''}</Text><Text style={styles.itemDetail}>Balance: ₹{((account.balancePaise ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></View><Pressable onPress={() => Alert.alert('Archive account?', `${account.name} will be hidden from your active accounts.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Archive', style: 'destructive', onPress: () => archiveMutation.mutate(account._id) }])}><Ionicons name="archive-outline" size={17} color={colors.expense} /></Pressable></View>)}</Panel> : null}
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Categories</Text><Pressable onPress={() => setShowAddCategory((value) => !value)}><Text style={styles.addAction}>{showAddCategory ? 'Cancel' : '+ Add category'}</Text></Pressable></View>
    {showAddCategory ? <Panel style={{ gap: 10 }}><TextInput value={categoryName} onChangeText={setCategoryName} placeholder="Category name" placeholderTextColor={colors.muted} style={styles.accountInput} /><View style={styles.accountTypes}>{(['DEBIT','CREDIT','BOTH'] as const).map((type) => <Pressable key={type} onPress={() => setCategoryType(type)} style={[styles.typeChip, categoryType === type && styles.typeChipActive]}><Text style={[styles.typeText, categoryType === type && styles.typeTextActive]}>{type}</Text></Pressable>)}</View><Pressable style={styles.addAccountButton} onPress={() => { if (!categoryName.trim()) { Alert.alert('Category name required', 'Enter a category name.'); return; } addCategoryMutation.mutate(); }} disabled={addCategoryMutation.isPending}>{addCategoryMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addAccountText}>Save category</Text>}</Pressable></Panel> : null}
    {categoriesQuery.isLoading ? <Panel><ActivityIndicator color={colors.primary} /></Panel> : null}
    {categoriesQuery.data?.length ? <Panel style={{ paddingVertical: 2 }}>{categoriesQuery.data.map((item) => <View key={item._id} style={styles.accountRow}><View style={styles.itemIcon}><Ionicons name="pricetag-outline" size={17} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{item.name}</Text><Text style={styles.itemDetail}>{item.type}{item.isDefault ? ' · Default' : ' · Custom'}</Text></View>{!item.isDefault ? <Pressable onPress={() => Alert.alert('Delete category?', `Delete ${item.name}? Categories used by existing transactions cannot be removed.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeCategoryMutation.mutate(item._id) }])}><Ionicons name="trash-outline" size={17} color={colors.expense} /></Pressable> : null}</View>)}</Panel> : null}
    <Pressable style={styles.importButton} onPress={importStatement} disabled={importing}><View style={styles.importIcon}><Ionicons name="cloud-upload-outline" size={19} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>Import bank statement</Text><Text style={styles.itemDetail}>Upload a supported CSV or text-based PDF</Text></View>{importing ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.muted} />}</Pressable>
    <Pressable style={styles.logout} onPress={confirmLogout}><Ionicons name="log-out-outline" size={18} color={colors.expense} /><Text style={styles.logoutText}>Sign out</Text></Pressable>
    <Text style={styles.version}>SpendSense · Personal finance workspace</Text>
    <Modal visible={editProfile} transparent animationType="fade" onRequestClose={() => setEditProfile(false)}><View style={styles.modalBackdrop}><View style={styles.previewCard}><Text style={styles.previewTitle}>Personal information</Text><Text style={styles.itemDetail}>Update the details associated with your account.</Text><Text style={styles.itemTitle}>Full name</Text><TextInput value={profileName} onChangeText={setProfileName} autoCapitalize="words" placeholder="Your name" placeholderTextColor={colors.muted} style={styles.accountInput} /><Text style={styles.itemTitle}>Email address</Text><TextInput value={profileEmail} onChangeText={setProfileEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} style={styles.accountInput} /><View style={styles.modalActions}><Pressable onPress={() => setEditProfile(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable disabled={profileMutation.isPending} onPress={() => { if(profileName.trim().length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail.trim())) { Alert.alert('Check your details','Enter a name (at least 2 characters) and a valid email address.'); return; } profileMutation.mutate(); }}><Text style={styles.addAction}>{profileMutation.isPending ? 'Saving…' : 'Save changes'}</Text></Pressable></View></View></View></Modal>
    <Modal visible={!!importPreview} transparent animationType="slide" onRequestClose={() => setImportPreview(null)}>
      <View style={styles.modalBackdrop}><View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Review statement import</Text>
        <Text style={styles.itemDetail}>{importPreview?.fileName} · {importPreview?.fileType}</Text>
        <Text style={styles.previewSummary}>{importPreview?.detectedRows} rows detected · {importPreview?.duplicateInFile} duplicates inside this file · {importPreview?.skippedCount} skipped. Review the sample below before importing.</Text>
        <ScrollView style={styles.previewList} nestedScrollEnabled>
          {importPreview?.preview.slice(0, 20).map((row, index) => <View key={`${row.dedupeKey ?? row.merchant}-${index}`} style={styles.previewRow}><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{row.merchant}</Text><Text style={styles.itemDetail}>{row.category} · {new Date(row.occurredAt).toLocaleDateString('en-IN')}</Text></View><Text style={[styles.itemTitle, { color: row.type === 'CREDIT' ? colors.income : colors.ink }]}>{row.type === 'CREDIT' ? '+' : '−'}₹{(row.amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></View>)}
        </ScrollView>
        <View style={styles.modalActions}><Pressable onPress={() => setImportPreview(null)} disabled={importing}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable onPress={() => void confirmImport()} disabled={importing}><Text style={styles.addAction}>{importing ? 'Importing…' : `Import ${importPreview?.detectedRows ?? 0} rows`}</Text></Pressable></View>
      </View></View>
    </Modal>
  </Screen>;
}
const styles = StyleSheet.create({title:{color:colors.ink,fontSize:26,fontWeight:'800'},sub:{color:colors.muted,marginTop:5,fontSize:13},profile:{alignItems:'center',paddingVertical:24},avatar:{width:62,height:62,borderRadius:radius.pill,backgroundColor:colors.lilac,justifyContent:'center',alignItems:'center'},name:{color:colors.ink,fontWeight:'800',fontSize:16,marginTop:12},email:{color:colors.muted,fontSize:11,marginTop:5,textAlign:'center'},stats:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',width:'100%',marginTop:22},statValue:{color:colors.ink,fontWeight:'800',fontSize:14,textAlign:'center'},statLabel:{color:colors.muted,fontSize:9,marginTop:4,textAlign:'center'},statDivider:{height:28,width:1,backgroundColor:colors.border},item:{flexDirection:'row',alignItems:'center',paddingVertical:14,gap:12,borderBottomWidth:1,borderBottomColor:colors.border},itemIcon:{width:36,height:36,borderRadius:12,backgroundColor:colors.lavender,alignItems:'center',justifyContent:'center'},itemTitle:{color:colors.ink,fontSize:12,fontWeight:'700'},itemDetail:{color:colors.muted,fontSize:10,marginTop:4,flexShrink:1},importButton:{backgroundColor:colors.surface,borderRadius:18,borderWidth:1,borderColor:colors.border,padding:14,flexDirection:'row',alignItems:'center',gap:12},importIcon:{width:36,height:36,borderRadius:12,backgroundColor:colors.lavender,alignItems:'center',justifyContent:'center'},logout:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:14},logoutText:{color:colors.expense,fontWeight:'800',fontSize:12},version:{color:colors.muted,textAlign:'center',fontSize:10},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{color:colors.ink,fontSize:16,fontWeight:'800'},addAction:{color:colors.primary,fontSize:11,fontWeight:'800'},accountInput:{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,color:colors.ink},accountTypes:{flexDirection:'row',flexWrap:'wrap',gap:6},typeChip:{borderWidth:1,borderColor:colors.border,borderRadius:20,paddingHorizontal:9,paddingVertical:7},typeChipActive:{backgroundColor:colors.lilac,borderColor:colors.primary},typeText:{fontSize:9,color:colors.muted,fontWeight:'700'},typeTextActive:{color:colors.primary},addAccountButton:{backgroundColor:colors.primary,borderRadius:12,padding:12,alignItems:'center',minHeight:40,justifyContent:'center'},addAccountText:{color:'#FFF',fontSize:11,fontWeight:'800'},accountRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border},modalBackdrop:{flex:1,backgroundColor:'rgba(20,15,30,0.48)',justifyContent:'center',padding:18},previewCard:{backgroundColor:'#FFF',borderRadius:22,padding:18,maxHeight:'85%'},previewTitle:{fontSize:19,fontWeight:'800',color:colors.ink},previewSummary:{fontSize:11,color:colors.muted,lineHeight:17,marginTop:9},previewList:{marginTop:12,flexGrow:0},previewRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border,gap:12},modalActions:{flexDirection:'row',justifyContent:'flex-end',gap:25,marginTop:16},cancelText:{fontSize:11,color:colors.muted,fontWeight:'700'}});
