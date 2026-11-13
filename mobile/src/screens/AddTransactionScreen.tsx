import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, radius } from '../theme/tokens';
import { Panel } from '../components/Panel';
import { Row, Screen } from '../components/Screen';
import { createManualDedupeKey, createTransaction } from '../services/api';
import { categorizeTransaction } from '../features/ai/aiService';
import { listAccounts, listCategories } from '../features/core/coreService';
import { getAuthToken } from '../services/session';

const CATEGORIES = ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Rent', 'EMI', 'Salary', 'Other'];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function AddTransactionScreen() {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: async () => (await listCategories(getAuthToken)).data });
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: async () => (await listAccounts(getAuthToken)).data });
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Food');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [suggestion, setSuggestion] = useState<{ category: string; confidence: number; reason: string } | null>(null);
  const availableCategories = (categoriesQuery.data ?? []).filter((item) => item.type === 'BOTH' || item.type === type).map((item) => item.name);
  const categoryOptions = availableCategories.length ? availableCategories : CATEGORIES.filter((item) => type === 'CREDIT' ? ['Salary', 'Other'].includes(item) : item !== 'Salary');

  const mutation = useMutation({
    mutationFn: () => createTransaction({
      amountPaise: Math.round(Number(amount) * 100), type, merchant: merchant.trim(), category,
      occurredAt: new Date(`${date}T12:00:00`).toISOString(), source: 'MANUAL', note: note.trim() || undefined, accountId: accountId || undefined,
      dedupeKey: createManualDedupeKey(),
    }, getAuthToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-insights'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring'] }),
      ]);
      setAmount(''); setMerchant(''); setNote(''); setType('DEBIT'); setCategory('Food'); setDate(today()); setSuggestion(null); setAccountId(null);
      Alert.alert('Transaction saved', 'Your transaction has been securely saved to your SpendSense account.');
    },
    onError: (error) => Alert.alert('Could not save transaction', error instanceof Error ? error.message : 'Please try again.'),
  });
  const suggestionMutation = useMutation({
    mutationFn: () => categorizeTransaction({ merchant: merchant.trim(), amountPaise: Math.round(Number(amount) * 100), type }, getAuthToken),
    onSuccess: setSuggestion,
    onError: (error) => Alert.alert('AI suggestion unavailable', error instanceof Error ? error.message : 'You can still select a category manually.'),
  });

  const submit = () => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1_000_000_000 || !merchant.trim()) { Alert.alert('Check your details', 'Enter a valid amount and merchant/source.'); return; }
    const parsedDate = new Date(`${date}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) { Alert.alert('Check the date', 'Enter a valid date in YYYY-MM-DD format.'); return; }
    mutation.mutate();
  };

  const requestSuggestion = () => {
    const numeric = Number(amount);
    if (!merchant.trim() || !Number.isFinite(numeric) || numeric <= 0) { Alert.alert('Add transaction details', 'Enter a merchant and amount before requesting an AI category.'); return; }
    suggestionMutation.mutate();
  };

  return <Screen>
    <View><Text style={styles.title}>Add transaction</Text><Text style={styles.sub}>Record money coming in or going out</Text></View>
    <View style={styles.switchRow}>{(['DEBIT', 'CREDIT'] as const).map((v) => <Pressable key={v} onPress={() => { setType(v); setCategory(v === 'CREDIT' ? 'Salary' : 'Food'); setSuggestion(null); }} style={[styles.switch, type === v && styles.switchActive]}><Text style={[styles.switchText, type === v && styles.switchTextActive]}>{v === 'DEBIT' ? 'Expense' : 'Income'}</Text></Pressable>)}</View>
    <Panel style={styles.amountPanel}><Text style={styles.label}>AMOUNT (INR)</Text><View style={styles.amountRow}><Text style={styles.rupee}>₹</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#B7B2C0" style={styles.amountInput} /></View></Panel>
    <Panel style={{ gap: 15 }}>
      <Field label="Merchant / source" value={merchant} onChangeText={(value) => { setMerchant(value); setSuggestion(null); }} placeholder="e.g. Grocery store" />
      <DatePickerField value={date} onChange={setDate} />
      {accountsQuery.data?.length ? <View>
        <Text style={styles.label}>ACCOUNT (OPTIONAL)</Text>
        <View style={styles.categoryWrap}>
          <Pressable onPress={() => setAccountId(null)} style={[styles.categoryChip, accountId === null && styles.categoryActive]}><Text style={[styles.categoryText, accountId === null && styles.categoryTextActive]}>Unassigned</Text></Pressable>
          {accountsQuery.data.map((account) => <Pressable key={account._id} onPress={() => setAccountId(account._id)} style={[styles.categoryChip, accountId === account._id && styles.categoryActive]}><Text style={[styles.categoryText, accountId === account._id && styles.categoryTextActive]}>{account.name}</Text></Pressable>)}
        </View>
      </View> : null}
      <View>
        <Row><Text style={styles.label}>CATEGORY</Text><Pressable onPress={requestSuggestion} disabled={suggestionMutation.isPending}><Text style={styles.aiAction}>{suggestionMutation.isPending ? 'Thinking…' : 'Suggest with AI'}</Text></Pressable></Row>
        <View style={styles.categoryWrap}>{categoryOptions.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.categoryActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}</View>
        {suggestion ? <View style={styles.suggestion}><Text style={styles.suggestionText}>AI suggests {suggestion.category} ({Math.round(suggestion.confidence * 100)}% confidence)</Text><Pressable onPress={() => { setCategory(suggestion.category); setSuggestion(null); }}><Text style={styles.aiAction}>Use suggestion</Text></Pressable></View> : null}
      </View>
      <Field label="Notes (optional)" value={note} onChangeText={setNote} placeholder="Add a note" />
    </Panel>
    <Pressable onPress={submit} disabled={mutation.isPending} style={[styles.save, mutation.isPending && styles.disabled]}>{mutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Add transaction</Text>}</Pressable>
    <Text style={styles.hint}>Transactions are saved to your MongoDB-backed SpendSense account.</Text>
  </Screen>;
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }) { return <View><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.field} /></View>; }
const styles = StyleSheet.create({ title:{color:colors.ink,fontSize:25,fontWeight:'800'},sub:{color:colors.muted,marginTop:5,fontSize:13},switchRow:{flexDirection:'row',backgroundColor:'#F0ECF5',borderRadius:radius.pill,padding:4},switch:{flex:1,padding:12,alignItems:'center',borderRadius:radius.pill},switchActive:{backgroundColor:colors.primary},switchText:{color:colors.muted,fontWeight:'700',fontSize:12},switchTextActive:{color:'#FFF'},amountPanel:{backgroundColor:colors.lavender},label:{color:colors.muted,fontSize:10,letterSpacing:.7,fontWeight:'700'},amountRow:{flexDirection:'row',alignItems:'center',marginTop:12},rupee:{fontSize:30,color:colors.ink,fontWeight:'700',marginRight:7},amountInput:{fontSize:35,fontWeight:'800',color:colors.ink,flex:1,padding:0},field:{borderWidth:1,borderColor:colors.border,borderRadius:13,paddingHorizontal:13,paddingVertical:13,marginTop:8,color:colors.ink,fontSize:13},categoryWrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:9},categoryChip:{borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:10,paddingVertical:8},categoryActive:{backgroundColor:colors.lilac,borderColor:colors.primary},categoryText:{color:colors.muted,fontSize:10,fontWeight:'600'},categoryTextActive:{color:colors.primary},aiAction:{color:colors.primary,fontSize:10,fontWeight:'800'},suggestion:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:colors.lavender,borderRadius:10,padding:9,marginTop:9},suggestionText:{color:colors.ink,fontSize:10,flex:1},save:{backgroundColor:colors.primary,borderRadius:radius.pill,padding:16,alignItems:'center',minHeight:52,justifyContent:'center'},saveText:{color:'#FFF',fontWeight:'800',fontSize:14},disabled:{opacity:.65},hint:{color:colors.muted,fontSize:10,textAlign:'center',lineHeight:16}});


function DatePickerField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(`${value}T12:00:00`); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const days = useMemo(() => { const first = new Date(month.getFullYear(), month.getMonth(), 1); const offset = first.getDay(); const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]; }, [month]);
  const selected = new Date(`${value}T12:00:00`);
  const choose = (day: number) => { onChange(`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`); setVisible(false); };
  const shift = (amount: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  return <View><Text style={styles.label}>TRANSACTION DATE</Text><Pressable onPress={() => setVisible(true)} style={[styles.field,{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]}><Text style={{color:colors.ink,fontSize:13}}>{selected.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</Text><Text style={{color:colors.primary,fontWeight:'800'}}>▦  Choose date</Text></Pressable><Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}><View style={calendarStyles.backdrop}><View style={calendarStyles.card}><View style={calendarStyles.header}><Pressable onPress={() => shift(-1)}><Text style={calendarStyles.arrow}>‹</Text></Pressable><Text style={calendarStyles.month}>{month.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</Text><Pressable onPress={() => shift(1)}><Text style={calendarStyles.arrow}>›</Text></Pressable></View><View style={calendarStyles.grid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><Text key={day} style={calendarStyles.weekday}>{day}</Text>)}{days.map((day,index)=>day===null?<View key={`blank-${index}`} style={calendarStyles.dayCell}/>:<Pressable key={day} onPress={() => choose(day)} style={[calendarStyles.dayCell,selected.getFullYear()===month.getFullYear()&&selected.getMonth()===month.getMonth()&&selected.getDate()===day&&calendarStyles.selectedDay]}><Text style={[calendarStyles.dayText,selected.getFullYear()===month.getFullYear()&&selected.getMonth()===month.getMonth()&&selected.getDate()===day&&calendarStyles.selectedDayText]}>{day}</Text></Pressable>)}</View><View style={calendarStyles.actions}><Pressable onPress={() => { onChange(today()); setMonth(new Date()); setVisible(false); }}><Text style={calendarStyles.today}>Today</Text></Pressable><Pressable onPress={() => setVisible(false)}><Text style={calendarStyles.cancel}>Cancel</Text></Pressable></View></View></View></Modal></View>;
}
const calendarStyles = StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(20,15,30,.5)',justifyContent:'center',padding:22},card:{backgroundColor:'#FFF',borderRadius:22,padding:18},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},arrow:{fontSize:30,color:colors.primary,paddingHorizontal:10},month:{fontSize:16,fontWeight:'800',color:colors.ink},grid:{flexDirection:'row',flexWrap:'wrap'},weekday:{width:'14.285%',textAlign:'center',color:colors.muted,fontSize:10,fontWeight:'700',paddingBottom:10},dayCell:{width:'14.285%',height:42,alignItems:'center',justifyContent:'center',borderRadius:21},dayText:{color:colors.ink,fontSize:13},selectedDay:{backgroundColor:colors.primary},selectedDayText:{color:'#FFF',fontWeight:'800'},actions:{flexDirection:'row',justifyContent:'space-between',marginTop:16,paddingTop:14,borderTopWidth:1,borderTopColor:colors.border},today:{color:colors.primary,fontWeight:'800'},cancel:{color:colors.muted,fontWeight:'700'}});
