import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Panel } from '../components/Panel';
import { Row, Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme/tokens';
import { getMonthlySummary } from '../features/core/coreService';
import { askSpendSense, getAiInsights, getRecurringCandidates, getUnusualSpending } from '../features/ai/aiService';
import { getAuthToken } from '../services/session';

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(now).toUpperCase();
const greetingLabel = now.getHours() < 12 ? 'Good morning 👋' : now.getHours() < 17 ? 'Good afternoon 👋' : 'Good evening 👋';
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = { Groceries: 'basket-outline', Salary: 'wallet-outline', Transport: 'car-outline', Food: 'restaurant-outline', Bills: 'receipt-outline', Shopping: 'bag-outline', Entertainment: 'film-outline', Health: 'heart-outline' };
const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function HomeScreen() {
  const summaryQuery = useQuery({ queryKey: ['summary', currentMonth], queryFn: async () => (await getMonthlySummary(currentMonth, getAuthToken)).data });
  const insightQuery = useQuery({ queryKey: ['ai-insights'], queryFn: () => getAiInsights(getAuthToken), staleTime: 10 * 60_000, retry: false });
  const summary = summaryQuery.data;
  const [question, setQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const recurringQuery = useQuery({ queryKey: ['recurring'], queryFn: () => getRecurringCandidates(getAuthToken), staleTime: 5 * 60_000, retry: false });
  const unusualQuery = useQuery({ queryKey: ['unusual-spending'], queryFn: () => getUnusualSpending(getAuthToken), staleTime: 5 * 60_000, retry: false });
  const chatMutation = useMutation({ mutationFn: () => askSpendSense(question.trim(), getAuthToken), onSuccess: (result) => { setChatAnswer(result.answer); setQuestion(''); }, onError: (error) => setChatAnswer(error instanceof Error ? error.message : 'SpendSense AI is unavailable right now.') });
  const topCategories = useMemo(() => {
    const total = summary?.expensePaise ?? 0;
    return (summary?.categoryBreakdown ?? []).slice(0, 5).map((item) => ({
      name: item._id,
      amountPaise: item.totalPaise,
      sharePercent: total > 0 ? Math.min(100, Math.round((item.totalPaise / total) * 100)) : 0,
    }));
  }, [summary?.categoryBreakdown, summary?.expensePaise]);

  return <Screen>
    <Row>
      <View><Text style={styles.eyebrow}>{todayLabel}</Text><Text style={styles.greeting}>{greetingLabel}</Text><Text style={styles.name}>Your money, in focus.</Text></View>
      <View style={styles.avatar}><Ionicons name="person-outline" size={20} color={colors.primary} /></View>
    </Row>

    {summaryQuery.isLoading ? <Panel style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading your financial summary…</Text></Panel> : null}
    {summaryQuery.isError ? <Panel><Text style={styles.errorTitle}>Your summary could not be loaded</Text><Text style={styles.muted}>{summaryQuery.error instanceof Error ? summaryQuery.error.message : 'Check your connection.'}</Text><Pressable onPress={() => summaryQuery.refetch()}><Text style={styles.link}>Try again</Text></Pressable></Panel> : null}

    {summary ? <>
      <View style={styles.balanceCard}>
        <Row><Text style={styles.cardLabel}>TOTAL BALANCE</Text><View style={styles.monthPill}><Text style={styles.monthText}>All-time net</Text><Ionicons name="wallet-outline" size={13} color="#FFF" /></View></Row>
        <Text style={styles.balance}>{money(summary.balancePaise)}</Text>
        <Text style={styles.balanceFootnote}>Includes account opening balances and saved income/expense transactions</Text>
        <View style={styles.balanceDivider} />
        <Row style={{ gap: spacing.lg }}>
          <View style={styles.balanceMetric}><View style={styles.metricIcon}><Ionicons name="arrow-down" color="#C2FFE9" size={15} /></View><View><Text style={styles.metricLabel}>Income this month</Text><Text style={styles.metricValue}>{money(summary.incomePaise)}</Text></View></View>
          <View style={styles.balanceMetric}><View style={styles.metricIcon}><Ionicons name="arrow-up" color="#FFD5D9" size={15} /></View><View><Text style={styles.metricLabel}>Expenses this month</Text><Text style={styles.metricValue}>{money(summary.expensePaise)}</Text></View></View>
        </Row>
      </View>

      <Row><Text style={styles.sectionTitle}>Spending overview</Text><Text style={styles.muted}>This month</Text></Row>
      <Panel>
        <Row><View><Text style={styles.muted}>Monthly spending</Text><Text style={styles.sectionAmount}>{money(summary.expensePaise)}</Text></View><View style={styles.countPill}><Text style={styles.countText}>{summary.expenseCount} {summary.expenseCount === 1 ? 'expense' : 'expenses'}</Text></View></Row>
        {topCategories.length ? <View style={styles.categoryChart}>
          {topCategories.map((item) => <View key={item.name} style={styles.categoryChartItem}>
            <Row style={styles.categoryChartHeader}>
              <Text numberOfLines={1} style={styles.categoryChartName}>{item.name}</Text>
              <View style={styles.categoryChartAmountWrap}>
                <Text style={styles.categoryChartAmount}>{money(item.amountPaise)}</Text>
                <Text style={styles.categoryChartShare}>{item.sharePercent}%</Text>
              </View>
            </Row>
            <View style={styles.categoryBarTrack}>
              <View style={[styles.categoryBarFill, { width: `${item.sharePercent}%` }]} />
            </View>
          </View>)}
        </View> : <Text style={styles.chartEmpty}>{summary.expensePaise > 0 ? 'Category details are not available for these expenses yet.' : 'No expenses recorded this month. Add an expense to see your spending breakdown.'}</Text>}
        <Row><Text style={styles.chartCaption}>Top categories</Text><Text style={styles.chartCaption}>{summary.categoryBreakdown.length} {summary.categoryBreakdown.length === 1 ? 'category' : 'categories'}</Text></Row>
      </Panel>

      <Row><Text style={styles.sectionTitle}>Recent activity</Text><Text style={styles.muted}>Latest saved entries</Text></Row>
      <Panel style={{ paddingVertical: 4 }}>
        {summary.recent.length ? summary.recent.slice(0, 5).map((item, index) => <Row key={item._id} style={[styles.transactionRow, index !== Math.min(summary.recent.length, 5) - 1 && styles.transactionBorder]}>
          <View style={[styles.transactionIcon, { backgroundColor: item.type === 'CREDIT' ? colors.incomeSoft : colors.lilac }]}><Ionicons name={categoryIcons[item.category] ?? 'card-outline'} size={19} color={colors.ink} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.transactionTitle}>{item.merchant}</Text><Text style={styles.mutedSmall}>{item.category} · {new Date(item.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text></View>
          <Text style={[styles.transactionAmount, { color: item.type === 'CREDIT' ? colors.income : colors.ink }]}>{item.type === 'CREDIT' ? '+' : '−'}{money(item.amountPaise)}</Text>
        </Row>) : <Text style={styles.chartEmpty}>No transactions yet. Add your first entry to see it here.</Text>}
      </Panel>
    </> : null}


    <Panel style={{ gap: 9 }}><Row><Text style={styles.sectionTitle}>Unusual spending</Text><Ionicons name="pulse-outline" color={colors.primary} size={18} /></Row>{unusualQuery.isLoading?<Text style={styles.muted}>Checking your recent spending patterns…</Text>:unusualQuery.isError?<Text style={styles.muted}>Spending comparison is temporarily unavailable.</Text>:unusualQuery.data?.anomalies.length?unusualQuery.data.anomalies.map(item=><View key={item.category} style={{paddingVertical:8,borderTopWidth:1,borderTopColor:colors.border}}><Text style={styles.transactionTitle}>{item.category} · {item.increasePercent}% above baseline</Text><Text style={styles.mutedSmall}>{item.message} Current {money(item.currentMonthPaise)} · projected month {money(item.projectedMonthPaise)} vs 3-month average {money(item.priorThreeMonthAveragePaise)}.</Text></View>):<Text style={styles.muted}>No unusual category spending detected against your previous three complete months. This is a spending pattern signal, not a fraud alert.</Text>}</Panel>
    <Panel style={styles.aiCard}>
      <Row style={{ justifyContent: 'flex-start', gap: 10 }}><View style={styles.aiIcon}><Ionicons name="sparkles" color="#FFF" size={17} /></View><Text style={styles.sectionTitle}>SpendSense AI</Text></Row>
      <Text style={styles.aiTitle}>Make every rupee count.</Text>
      {insightQuery.isLoading ? <Text style={styles.muted}>Preparing insights from your saved transactions…</Text> : null}
      {insightQuery.data?.insights?.length ? insightQuery.data.insights.slice(0, 3).map((insight, index) => <Text key={index} style={styles.insight}>• {insight}</Text>) : null}
      {insightQuery.isError ? <Text style={styles.muted}>{insightQuery.error instanceof Error ? insightQuery.error.message : 'AI insights are unavailable right now. Check the Gemini configuration on the backend.'}</Text> : null}
      {!insightQuery.isLoading && !insightQuery.isError && !insightQuery.data?.insights?.length ? <Text style={styles.muted}>Add a few transactions to unlock personalized financial insights.</Text> : null}
      {recurringQuery.data?.length ? <View style={styles.recurringBox}><Text style={styles.recurringTitle}>Possible recurring payments</Text>{recurringQuery.data.slice(0, 3).map((item, index) => <Text key={`${item.merchant}-${index}`} style={styles.muted}>• {item.merchant} · {item.category} · {item.occurrences} transactions</Text>)}</View> : null}
    </Panel>
    <Panel style={styles.chatCard}>
      <Text style={styles.sectionTitle}>Ask SpendSense</Text>
      <Text style={styles.muted}>Ask a question about your saved transactions and spending.</Text>
      <TextInput value={question} onChangeText={setQuestion} placeholder="e.g. How much did I spend on food?" placeholderTextColor={colors.muted} multiline style={styles.chatInput} />
      <Pressable onPress={() => { if (!question.trim()) return; chatMutation.mutate(); }} disabled={chatMutation.isPending || !question.trim()} style={[styles.chatButton, (!question.trim() || chatMutation.isPending) && { opacity: 0.55 }]}>
        {chatMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.chatButtonText}>Ask AI</Text>}
      </Pressable>
      {chatAnswer ? <Text style={styles.chatAnswer}>{chatAnswer}</Text> : null}
    </Panel>
  </Screen>;
}

const styles = StyleSheet.create({
  eyebrow:{color:colors.muted,fontSize:10,letterSpacing:1,fontWeight:'700'},greeting:{color:colors.ink,fontSize:23,fontWeight:'800',marginTop:5},name:{color:colors.muted,marginTop:3,fontSize:13},avatar:{width:42,height:42,backgroundColor:colors.lilac,borderRadius:radius.pill,justifyContent:'center',alignItems:'center'},
  balanceCard:{backgroundColor:colors.primary,borderRadius:26,padding:22,gap:15,overflow:'hidden'},cardLabel:{color:'#E8D9FF',fontSize:10,letterSpacing:1.2,fontWeight:'700'},monthPill:{flexDirection:'row',gap:5,alignItems:'center',backgroundColor:'rgba(255,255,255,0.16)',borderRadius:18,paddingHorizontal:10,paddingVertical:6},monthText:{color:'#FFF',fontSize:10,fontWeight:'600'},balance:{color:'#FFF',fontSize:33,fontWeight:'800',letterSpacing:-0.8},balanceFootnote:{color:'#E8D9FF',fontSize:10},balanceDivider:{height:1,backgroundColor:'rgba(255,255,255,0.22)'},balanceMetric:{flex:1,flexDirection:'row',alignItems:'center',gap:9},metricIcon:{width:28,height:28,borderRadius:14,backgroundColor:'rgba(255,255,255,0.18)',justifyContent:'center',alignItems:'center'},metricLabel:{color:'#E8D9FF',fontSize:10},metricValue:{color:'#FFF',fontWeight:'700',fontSize:13,marginTop:2},
  sectionTitle:{color:colors.ink,fontSize:16,fontWeight:'800'},link:{color:colors.primary,fontWeight:'700',fontSize:12,marginTop:10},muted:{color:colors.muted,fontSize:12,lineHeight:18},errorTitle:{color:colors.ink,fontSize:14,fontWeight:'800',marginBottom:5},loading:{alignItems:'center',gap:10},sectionAmount:{color:colors.ink,fontSize:22,fontWeight:'800',marginTop:4},countPill:{backgroundColor:colors.lavender,borderRadius:20,paddingHorizontal:9,paddingVertical:6},countText:{color:colors.primary,fontSize:10,fontWeight:'700'},categoryChart:{marginTop:18,marginBottom:14,gap:14},categoryChartItem:{gap:7},categoryChartHeader:{alignItems:'center'},categoryChartName:{flex:1,color:colors.ink,fontSize:11,fontWeight:'700',marginRight:12},categoryChartAmountWrap:{flexDirection:'row',alignItems:'center',gap:9},categoryChartAmount:{color:colors.ink,fontSize:11,fontWeight:'700'},categoryChartShare:{color:colors.muted,fontSize:10,minWidth:32,textAlign:'right'},categoryBarTrack:{height:9,backgroundColor:colors.lavender,borderRadius:99,overflow:'hidden'},categoryBarFill:{height:'100%',backgroundColor:colors.primary,borderRadius:99},chartCaption:{color:colors.muted,fontSize:9},chartEmpty:{color:colors.muted,fontSize:11,lineHeight:17,marginTop:12},transactionRow:{paddingVertical:14},transactionBorder:{borderBottomWidth:1,borderBottomColor:colors.border},transactionIcon:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center'},transactionTitle:{color:colors.ink,fontSize:13,fontWeight:'700'},mutedSmall:{color:colors.muted,fontSize:10,marginTop:4},transactionAmount:{fontSize:11,fontWeight:'800'},aiCard:{backgroundColor:'#F4EEFF',borderColor:'#E8D9FF'},aiIcon:{width:29,height:29,borderRadius:10,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},aiTitle:{color:colors.ink,fontWeight:'800',fontSize:17,marginTop:13},insight:{color:colors.ink,fontSize:11,lineHeight:17,marginTop:8},recurringBox:{borderTopWidth:1,borderTopColor:'#E8D9FF',marginTop:14,paddingTop:12,gap:6},recurringTitle:{color:colors.ink,fontSize:11,fontWeight:'800'},chatCard:{gap:10},chatInput:{minHeight:64,borderWidth:1,borderColor:colors.border,borderRadius:13,padding:12,color:colors.ink,fontSize:12,textAlignVertical:'top'},chatButton:{backgroundColor:colors.primary,borderRadius:12,padding:12,alignItems:'center',minHeight:42,justifyContent:'center'},chatButtonText:{color:'#FFF',fontSize:12,fontWeight:'800'},chatAnswer:{color:colors.ink,fontSize:12,lineHeight:19,backgroundColor:colors.lavender,borderRadius:12,padding:12},
});
