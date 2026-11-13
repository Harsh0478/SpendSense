import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel } from '../components/Panel';
import { Screen } from '../components/Screen';
import { colors, radius } from '../theme/tokens';
import { deleteBudget, listBudgets, listCategories, saveBudget } from '../features/core/coreService';
import { getAuthToken } from '../services/session';
import PlanningSection from './PlanningSection';

const CATEGORIES = ['Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Rent', 'EMI', 'Other'];
const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const monthNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = { Food: 'fast-food-outline', Groceries: 'basket-outline', Transport: 'car-outline', Shopping: 'bag-outline', Bills: 'receipt-outline', Entertainment: 'film-outline', Health: 'heart-outline' };

export default function BudgetsScreen() {
  const queryClient = useQueryClient();
  const month = monthNow();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState('Food');
  const [alertAtPercent, setAlertAtPercent] = useState(80);
  const categoryQuery = useQuery({ queryKey: ['categories'], queryFn: async () => (await listCategories(getAuthToken)).data });
  const budgetCategories = (categoryQuery.data ?? []).filter((item) => item.type === 'DEBIT' || item.type === 'BOTH').map((item) => item.name);
  const categoryOptions = budgetCategories.length ? budgetCategories : CATEGORIES;
  const budgetQuery = useQuery({ queryKey: ['budgets', month], queryFn: async () => (await listBudgets(month, getAuthToken)).data });
  const budgets = budgetQuery.data ?? [];
  const totalLimit = useMemo(() => budgets.reduce((sum, item) => sum + item.limitPaise, 0), [budgets]);
  const spentTotal = budgets.reduce((sum, item) => sum + item.spentPaise, 0);
  const progress = totalLimit > 0 ? Math.min(spentTotal / totalLimit, 1) : 0;

  const saveMutation = useMutation({
    mutationFn: () => saveBudget({ category, limitPaise: Math.round(Number(draft) * 100), month, alertAtPercent }, getAuthToken),
    onSuccess: async () => { setDraft(''); setEditing(false); await queryClient.invalidateQueries({ queryKey: ['budgets', month] }); },
    onError: (error) => Alert.alert('Could not save budget', error instanceof Error ? error.message : 'Please try again.'),
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteBudget(id, getAuthToken), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets', month] }), onError: (error) => Alert.alert('Could not delete budget', error instanceof Error ? error.message : 'Please try again.') });

  const onSave = () => {
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) { Alert.alert('Invalid amount', 'Enter a monthly limit greater than zero.'); return; }
    saveMutation.mutate();
  };

  return <Screen>
    <View><Text style={styles.title}>Budgets</Text><Text style={styles.sub}>Set category limits and keep spending on track</Text></View>
    <Panel style={styles.summary}>
      <Text style={styles.whiteLabel}>TOTAL MONTHLY BUDGET</Text>
      <Text style={styles.total}>{money(totalLimit)}</Text>
      <Text style={styles.whiteSub}>{money(spentTotal)} spent · {money(Math.max(totalLimit - spentTotal, 0))} remaining</Text>
      <View style={styles.progress}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      <View style={styles.meta}><Text style={styles.whiteSub}>{Math.round(progress * 100)}% of combined limits used</Text><Text style={styles.whiteSub}>{totalLimit > 0 && spentTotal > totalLimit ? 'Over budget' : 'Current month'}</Text></View>
    </Panel>

    <View style={styles.heading}><Text style={styles.section}>Category budgets</Text><Pressable onPress={() => setEditing((value) => !value)}><Text style={styles.action}>{editing ? 'Cancel' : '+ Add budget'}</Text></Pressable></View>
    {editing ? <Panel style={{ gap: 12 }}>
      <Text style={styles.label}>CATEGORY</Text>
      <View style={styles.categoryWrap}>{categoryOptions.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, category === item && styles.categoryActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
      <Text style={styles.label}>REMIND ME WHEN SPENDING REACHES</Text><View style={styles.categoryWrap}>{[50,75,80,90,100].map((value)=><Pressable key={value} onPress={()=>setAlertAtPercent(value)} style={[styles.categoryChip,alertAtPercent===value&&styles.categoryActive]}><Text style={[styles.chipText,alertAtPercent===value&&styles.chipTextActive]}>{value}%</Text></Pressable>)}</View>
      <Text style={styles.label}>MONTHLY LIMIT (INR)</Text><TextInput value={draft} onChangeText={setDraft} keyboardType="decimal-pad" placeholder="e.g. 5000" placeholderTextColor={colors.muted} style={styles.input} />
      <Pressable onPress={onSave} disabled={saveMutation.isPending} style={styles.saveButton}>{saveMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save budget</Text>}</Pressable>
    </Panel> : null}

    {budgetQuery.isLoading ? <Panel style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.empty}>Loading your budgets…</Text></Panel> : null}
    {budgetQuery.isError ? <Panel><Text style={styles.empty}>Could not load budgets: {budgetQuery.error instanceof Error ? budgetQuery.error.message : 'Please try again.'}</Text><Pressable onPress={() => budgetQuery.refetch()}><Text style={styles.action}>Retry</Text></Pressable></Panel> : null}
    {!budgetQuery.isLoading && !budgetQuery.isError && budgets.length === 0 ? <Panel><Text style={styles.empty}>No budgets yet. Add a category budget to start tracking your limits.</Text></Panel> : null}
    {budgets.some(item => item.limitPaise > 0 && item.spentPaise >= item.limitPaise * ((item.alertAtPercent ?? 80) / 100)) ? <Panel style={{backgroundColor:'#FFF4E8',borderColor:'#F3D4B2',gap:8}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name="notifications" size={17} color="#B66A20"/><Text style={{color:'#925116',fontWeight:'800',fontSize:13}}>Budget reminders</Text></View>{budgets.filter(item => item.limitPaise > 0 && item.spentPaise >= item.limitPaise * ((item.alertAtPercent ?? 80) / 100)).map(item=><Text key={item._id} style={{color:'#925116',fontSize:11,lineHeight:17}}>{item.category}: you have used {Math.round(item.spentPaise/item.limitPaise*100)}% of your monthly limit (alert at {item.alertAtPercent ?? 80}%).</Text>)}</Panel> : <Panel style={{backgroundColor:colors.lavender,gap:5}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name="notifications-outline" size={17} color={colors.primary}/><Text style={{color:colors.ink,fontWeight:'800',fontSize:12}}>Budget reminders are on</Text></View><Text style={{color:colors.muted,fontSize:10,lineHeight:16}}>Choose a reminder threshold when creating each category budget. An in-app alert will appear here when spending reaches it.</Text></Panel>}
    {budgets.length > 0 ? <Panel style={{ gap: 18 }}>{budgets.map((item) => { const pct = item.limitPaise > 0 ? Math.min(item.spentPaise / item.limitPaise, 1) : 0; const over = item.spentPaise > item.limitPaise; return <View key={item._id}>
      <View style={styles.meta}><View style={styles.category}><View style={styles.categoryIcon}><Ionicons name={categoryIcons[item.category] ?? 'wallet-outline'} size={17} color={colors.primary} /></View><View><Text style={styles.name}>{item.category}</Text><Text style={styles.value}>{money(item.spentPaise)} spent of {money(item.limitPaise)}</Text></View></View><Pressable onPress={() => Alert.alert('Delete budget?', `Remove the ${item.category} budget for this month?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item._id) }])}><Ionicons name="trash-outline" size={17} color={colors.expense} /></Pressable></View>
      <View style={styles.track}><View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: over ? colors.expense : colors.primary }]} /></View>
      <Text style={[styles.value, over && { color: colors.expense }]}>{over ? `${money(item.spentPaise - item.limitPaise)} over limit` : `${Math.round(pct * 100)}% used`} · alert at {item.alertAtPercent ?? 80}%</Text>
    </View>; })}</Panel> : null}
    <Text style={styles.footnote}>Budgets are stored in your account and calculated from saved expense transactions for {month}.</Text>
    <PlanningSection />
  </Screen>;
}

const styles = StyleSheet.create({title:{color:colors.ink,fontSize:26,fontWeight:'800'},sub:{color:colors.muted,marginTop:5,fontSize:13},summary:{backgroundColor:colors.primary,borderColor:colors.primary},whiteLabel:{color:'#E8D9FF',fontSize:10,fontWeight:'700',letterSpacing:1},total:{color:'#FFF',fontWeight:'800',fontSize:30,marginTop:9},whiteSub:{color:'#E8D9FF',fontSize:10},progress:{height:8,backgroundColor:'rgba(255,255,255,.24)',borderRadius:radius.pill,overflow:'hidden',marginTop:20},progressFill:{height:'100%',backgroundColor:'#FFF',borderRadius:radius.pill},meta:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:9},heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},section:{color:colors.ink,fontWeight:'800',fontSize:16},action:{color:colors.primary,fontSize:11,fontWeight:'800'},category:{flexDirection:'row',alignItems:'center',gap:9},categoryIcon:{width:36,height:36,borderRadius:12,backgroundColor:colors.lilac,alignItems:'center',justifyContent:'center'},name:{color:colors.ink,fontSize:12,fontWeight:'700'},value:{color:colors.muted,fontSize:10,marginTop:5},track:{height:7,backgroundColor:colors.lavender,borderRadius:radius.pill,overflow:'hidden',marginTop:10},fill:{height:'100%',backgroundColor:colors.primary,borderRadius:radius.pill},empty:{color:colors.muted,fontSize:12,lineHeight:18},footnote:{color:colors.muted,fontSize:10,textAlign:'center',lineHeight:16},label:{fontSize:10,fontWeight:'700',letterSpacing:.6,color:colors.muted},categoryWrap:{flexDirection:'row',flexWrap:'wrap',gap:7},categoryChip:{borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:10,paddingVertical:8},categoryActive:{backgroundColor:colors.lilac,borderColor:colors.primary},chipText:{color:colors.muted,fontSize:10,fontWeight:'600'},chipTextActive:{color:colors.primary},input:{borderWidth:1,borderColor:colors.border,borderRadius:13,paddingHorizontal:13,paddingVertical:12,color:colors.ink},saveButton:{backgroundColor:colors.primary,borderRadius:radius.pill,padding:14,alignItems:'center'},saveText:{color:'#FFF',fontWeight:'800',fontSize:12},loading:{alignItems:'center',gap:10}});
