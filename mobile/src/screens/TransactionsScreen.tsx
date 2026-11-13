import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel } from '../components/Panel';
import { Row, Screen } from '../components/Screen';
import { colors, radius } from '../theme/tokens';
import { deleteTransaction, listTransactions, updateTransaction, type TransactionRecord } from '../services/api';
import { getAuthToken } from '../services/session';

type Filter = 'ALL' | 'CREDIT' | 'DEBIT';
const FILTERS: { label: string; value: Filter }[] = [{ label: 'All', value: 'ALL' }, { label: 'Income', value: 'CREDIT' }, { label: 'Expense', value: 'DEBIT' }];
const CATEGORIES = ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Salary', 'Other'];
const money = (value: number) => `₹${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TransactionsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Other');

  const transactionsQuery = useQuery({ queryKey: ['transactions'], queryFn: async () => (await listTransactions(getAuthToken, { limit: 100 })).data });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['transactions'] });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteTransaction(id, getAuthToken), onSuccess: async () => { await refresh(); await queryClient.invalidateQueries({ queryKey: ['summary'] }); await queryClient.invalidateQueries({ queryKey: ['budgets'] }); }, onError: (e) => Alert.alert('Delete failed', e instanceof Error ? e.message : 'Please try again.') });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a transaction first.');
      return updateTransaction(selected._id, { merchant: editMerchant.trim(), amountPaise: Math.round(Number(editAmount) * 100), category: editCategory }, getAuthToken);
    },
    onSuccess: async () => { setSelected(null); await refresh(); await queryClient.invalidateQueries({ queryKey: ['summary'] }); await queryClient.invalidateQueries({ queryKey: ['budgets'] }); },
    onError: (e) => Alert.alert('Update failed', e instanceof Error ? e.message : 'Please try again.'),
  });

  const rows = useMemo(() => (transactionsQuery.data ?? []).filter((txn) =>
    (filter === 'ALL' || txn.type === filter) && `${txn.merchant} ${txn.category} ${txn.note ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [transactionsQuery.data, filter, search]);

  const confirmDelete = (txn: TransactionRecord) => Alert.alert('Delete transaction?', `Remove ${txn.merchant}? This action cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(txn._id) },
  ]);
  const openEdit = (txn: TransactionRecord) => { setSelected(txn); setEditMerchant(txn.merchant); setEditAmount((txn.amountPaise / 100).toFixed(2)); setEditCategory(txn.category); };

  return <Screen>
    <View><Text style={styles.title}>Transactions</Text><Text style={styles.sub}>Your saved money activity</Text></View>
    <Panel style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search merchant, category or note" placeholderTextColor={colors.muted} style={styles.searchText} /></Panel>
    <View style={styles.filterRow}>{FILTERS.map(({ label, value }) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.chip, filter === value && styles.activeChip]}><Text style={[styles.chipText, filter === value && styles.activeChipText]}>{label}</Text></Pressable>)}</View>
    {transactionsQuery.isLoading ? <Panel style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyText}>Loading your transactions…</Text></Panel> : null}
    {transactionsQuery.isError ? <Panel><Text style={styles.emptyTitle}>Could not load transactions</Text><Text style={styles.emptyText}>{transactionsQuery.error instanceof Error ? transactionsQuery.error.message : 'Please try again.'}</Text><Pressable onPress={() => transactionsQuery.refetch()}><Text style={styles.action}>Retry</Text></Pressable></Panel> : null}
    {!transactionsQuery.isLoading && !transactionsQuery.isError && rows.length === 0 ? <Panel><Text style={styles.emptyTitle}>No transactions found</Text><Text style={styles.emptyText}>Try another search or add a transaction.</Text></Panel> : null}
    {rows.length > 0 ? <Panel style={{ paddingVertical: 3 }}>{rows.map((txn, index) => <View key={txn._id} style={[styles.transaction, index !== rows.length - 1 && styles.transactionDivider]}>
      <Row>
        <View style={styles.transactionIcon}><Ionicons name={txn.type === 'CREDIT' ? 'arrow-down-outline' : 'arrow-up-outline'} size={18} color={txn.type === 'CREDIT' ? colors.income : colors.expense} /></View>
        <View style={{ flex: 1, marginLeft: 11 }}><Text style={styles.merchant}>{txn.merchant}</Text><Text style={styles.details}>{txn.category} · {new Date(txn.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>
        <View style={{ alignItems: 'flex-end', gap: 7 }}><Text style={[styles.amount, { color: txn.type === 'CREDIT' ? colors.income : colors.ink }]}>{txn.type === 'CREDIT' ? '+' : '−'}{money(txn.amountPaise)}</Text></View>
      </Row>
      <View style={styles.rowActions}><Pressable onPress={() => openEdit(txn)} hitSlop={8}><Text style={styles.action}>Edit</Text></Pressable><Pressable onPress={() => confirmDelete(txn)} hitSlop={8} disabled={deleteMutation.isPending}><Text style={styles.delete}>Remove</Text></Pressable></View>
    </View>)}</Panel> : null}
    <Text style={styles.footnote}>Showing up to 100 most recent transactions from your account.</Text>
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Edit transaction</Text>
        <Text style={styles.label}>MERCHANT / SOURCE</Text><TextInput value={editMerchant} onChangeText={setEditMerchant} style={styles.input} />
        <Text style={styles.label}>AMOUNT (INR)</Text><TextInput value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" style={styles.input} />
        <Text style={styles.label}>CATEGORY</Text><View style={styles.categoryWrap}>{CATEGORIES.map((category) => <Pressable key={category} onPress={() => setEditCategory(category)} style={[styles.categoryChip, editCategory === category && styles.activeCategory]}><Text style={[styles.chipText, editCategory === category && styles.activeChipText]}>{category}</Text></Pressable>)}</View>
        <View style={styles.modalActions}><Pressable onPress={() => setSelected(null)}><Text style={styles.cancel}>Cancel</Text></Pressable><Pressable disabled={updateMutation.isPending} onPress={() => { const amount = Number(editAmount); if (!editMerchant.trim() || !Number.isFinite(amount) || amount <= 0) { Alert.alert('Check details', 'Enter a valid merchant and amount.'); return; } updateMutation.mutate(); }}><Text style={styles.action}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</Text></Pressable></View>
      </View></View>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({ title:{color:colors.ink,fontSize:26,fontWeight:'800'},sub:{color:colors.muted,marginTop:5,fontSize:13},search:{flexDirection:'row',alignItems:'center',gap:10,padding:14},searchText:{flex:1,color:colors.ink,fontSize:12,paddingVertical:0},filterRow:{flexDirection:'row',gap:8},chip:{borderWidth:1,borderColor:colors.border,paddingHorizontal:14,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.surface},activeChip:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{color:colors.muted,fontSize:11,fontWeight:'600'},activeChipText:{color:'#FFF'},emptyTitle:{color:colors.ink,fontWeight:'800',fontSize:16},emptyText:{color:colors.muted,marginTop:8,fontSize:12,lineHeight:19},center:{alignItems:'center',gap:10},transaction:{paddingVertical:13},transactionDivider:{borderBottomWidth:1,borderBottomColor:colors.border},transactionIcon:{width:39,height:39,borderRadius:13,backgroundColor:colors.lavender,alignItems:'center',justifyContent:'center'},merchant:{color:colors.ink,fontSize:13,fontWeight:'700'},details:{color:colors.muted,fontSize:10,marginTop:4},amount:{fontSize:11,fontWeight:'800'},rowActions:{flexDirection:'row',justifyContent:'flex-end',gap:18,marginTop:10},action:{fontSize:10,color:colors.primary,fontWeight:'800'},delete:{fontSize:10,color:colors.expense,fontWeight:'700'},footnote:{color:colors.muted,fontSize:10,textAlign:'center',lineHeight:16},modalBackdrop:{flex:1,backgroundColor:'rgba(20,15,30,0.45)',justifyContent:'center',padding:22},modalCard:{backgroundColor:'#FFF',borderRadius:22,padding:20,gap:10},modalTitle:{fontSize:19,fontWeight:'800',color:colors.ink,marginBottom:4},label:{fontSize:10,fontWeight:'700',color:colors.muted,letterSpacing:.7},input:{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,color:colors.ink},categoryWrap:{flexDirection:'row',flexWrap:'wrap',gap:7},categoryChip:{borderWidth:1,borderColor:colors.border,borderRadius:20,paddingHorizontal:9,paddingVertical:7},activeCategory:{backgroundColor:colors.lilac,borderColor:colors.primary},modalActions:{flexDirection:'row',justifyContent:'flex-end',gap:24,marginTop:10},cancel:{fontSize:12,color:colors.muted,fontWeight:'700'}});
