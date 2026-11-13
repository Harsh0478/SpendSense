import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel } from '../components/Panel';
import { colors } from '../theme/tokens';
import { getAuthToken } from '../services/session';
import {
  createBill, createLoan, deleteBill, deleteLoan, listBills, listLoans,
  markBillPaid, recordLoanPayment,
} from '../features/core/coreService';

const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const billDateKey = (value: string) => dateKey(new Date(value));
const todayKey = dateKey(new Date());
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const LOAN_TYPES = ['PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION', 'OTHER'] as const;

export default function PlanningSection() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<'BILLS' | 'LOANS'>('BILLS');
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [frequency, setFrequency] = useState<'ONCE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [remindDays, setRemindDays] = useState('3');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [lender, setLender] = useState('');
  const [loanType, setLoanType] = useState<(typeof LOAN_TYPES)[number]>('OTHER');
  const [principal, setPrincipal] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [emi, setEmi] = useState('');
  const [rate, setRate] = useState('');
  const [dueDay, setDueDay] = useState(String(new Date().getDate()));
  const [installments, setInstallments] = useState('12');

  const billsQuery = useQuery({ queryKey: ['bills'], queryFn: async () => (await listBills(getAuthToken)).data });
  const loansQuery = useQuery({ queryKey: ['loans'], queryFn: async () => (await listLoans(getAuthToken)).data });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bills'] }),
      queryClient.invalidateQueries({ queryKey: ['loans'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] }),
      queryClient.invalidateQueries({ queryKey: ['unusual-spending'] }),
    ]);
  };

  const billMutation = useMutation({
    mutationFn: () => createBill({
      title: title.trim(), amountPaise: Math.round(Number(amount) * 100),
      dueDate: new Date(`${dueDate}T12:00:00`).toISOString(), frequency,
      category: 'Bills', remindDaysBefore: Number(remindDays),
    }, getAuthToken),
    onSuccess: async () => { setTitle(''); setAmount(''); setShowForm(false); await refresh(); },
    onError: (error) => Alert.alert('Could not save bill', error instanceof Error ? error.message : 'Please try again.'),
  });

  const loanMutation = useMutation({
    mutationFn: () => createLoan({
      lender: lender.trim(), loanType,
      principalPaise: Math.round(Number(principal) * 100),
      outstandingPaise: Math.round(Number(outstanding) * 100),
      annualInterestRate: Number(rate) || 0,
      emiPaise: Math.round(Number(emi) * 100), dueDay: Number(dueDay),
      nextDueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      remainingInstallments: Number(installments),
    }, getAuthToken),
    onSuccess: async () => { setLender(''); setPrincipal(''); setOutstanding(''); setEmi(''); setShowForm(false); await refresh(); },
    onError: (error) => Alert.alert('Could not save loan', error instanceof Error ? error.message : 'Please try again.'),
  });

  const payBill = useMutation({
    mutationFn: (bill: { _id: string; dueDate: string }) => markBillPaid(bill._id, bill.dueDate, getAuthToken),
    onSuccess: refresh,
    onError: (error) => Alert.alert('Could not update bill', error instanceof Error ? error.message : 'Please try again.'),
  });
  const payLoan = useMutation({
    mutationFn: (loan: { _id: string; emiPaise: number }) => recordLoanPayment(loan._id, loan.emiPaise, getAuthToken),
    onSuccess: refresh,
    onError: (error) => Alert.alert('Could not record EMI', error instanceof Error ? error.message : 'Please try again.'),
  });
  const removeBill = useMutation({ mutationFn: (id: string) => deleteBill(id, getAuthToken), onSuccess: refresh });
  const removeLoan = useMutation({ mutationFn: (id: string) => deleteLoan(id, getAuthToken), onSuccess: refresh });

  const upcoming = useMemo(
    () => [...(billsQuery.data ?? [])].filter((bill) => bill.status === 'UPCOMING').sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)),
    [billsQuery.data],
  );
  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
    const days = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  }, [calendarMonth]);
  const billDates = useMemo(() => new Set(upcoming.map((bill) => billDateKey(bill.dueDate))), [upcoming]);
  const visibleBills = useMemo(
    () => selectedDate ? upcoming.filter((bill) => billDateKey(bill.dueDate) === selectedDate) : upcoming,
    [upcoming, selectedDate],
  );

  const validateBill = () => {
    if (!title.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isInteger(Number(remindDays)) || Number(remindDays) < 0 || Number(remindDays) > 30) {
      Alert.alert('Check bill details', 'Enter a title, valid amount, date (YYYY-MM-DD) and reminder lead time from 0 to 30 days.');
      return;
    }
    billMutation.mutate();
  };

  const validateLoan = () => {
    const numericValues = [principal, outstanding, emi];
    if (!lender.trim() || numericValues.some((value) => !Number.isFinite(Number(value)) || Number(value) <= 0)
      || Number(outstanding) > Number(principal) || !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 100
      || !Number.isInteger(Number(dueDay)) || Number(dueDay) < 1 || Number(dueDay) > 31
      || !Number.isInteger(Number(installments)) || Number(installments) < 0) {
      Alert.alert('Check loan details', 'Enter valid lender, principal, outstanding balance, EMI, interest rate, due day and instalment count.');
      return;
    }
    loanMutation.mutate();
  };

  const billStatus = (bill: { dueDate: string; remindDaysBefore?: number }) => {
    const due = new Date(bill.dueDate);
    const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    const days = Math.round((dueMidnight - todayMidnight) / 86400000);
    if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, tone: 'danger' as const };
    if (days === 0) return { label: 'Due today', tone: 'danger' as const };
    if (days <= (bill.remindDaysBefore ?? 3)) return { label: `Due in ${days}d · reminder window`, tone: 'warning' as const };
    return { label: `Due in ${days}d`, tone: 'neutral' as const };
  };

  const changeMonth = (amount: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelectedDate(null);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.heading}>
        <View><Text style={styles.title}>Bills & Loans</Text><Text style={styles.sub}>Upcoming payments and repayment progress</Text></View>
      </View>

      <View style={styles.switch}>
        {(['BILLS', 'LOANS'] as const).map((value) => (
          <Pressable key={value} onPress={() => { setSection(value); setShowForm(false); }} style={[styles.switchItem, section === value && styles.switchActive]}>
            <Text style={[styles.switchText, section === value && styles.switchTextActive]}>{value === 'BILLS' ? 'Bill calendar' : 'Loan & EMI'}</Text>
          </Pressable>
        ))}
      </View>

      {section === 'BILLS' ? (
        <Panel style={{ gap: 12 }}>
          <View style={styles.heading}>
            <Text style={styles.section}>Payment calendar</Text>
            <View style={styles.calendarNav}>
              <Pressable onPress={() => changeMonth(-1)} hitSlop={8}><Ionicons name="chevron-back" size={18} color={colors.primary} /></Pressable>
              <Text style={styles.monthLabel}>{calendarMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
              <Pressable onPress={() => changeMonth(1)} hitSlop={8}><Ionicons name="chevron-forward" size={18} color={colors.primary} /></Pressable>
            </View>
          </View>
          <View style={styles.calendarGrid}>
            {DAY_LABELS.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
            {calendarCells.map((day, index) => {
              if (day === null) return <View key={`blank-${index}`} style={styles.calendarCell} />;
              const key = dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
              const hasBill = billDates.has(key);
              const selected = selectedDate === key;
              const isToday = todayKey === key;
              return (
                <Pressable key={key} onPress={() => setSelectedDate((current) => current === key ? null : key)} style={styles.calendarCell}>
                  <View style={[styles.dayCircle, selected && styles.daySelected, isToday && !selected && styles.dayToday]}>
                    <Text style={[styles.dayText, selected && styles.daySelectedText]}>{day}</Text>
                  </View>
                  {hasBill ? <View style={[styles.billDot, selected && styles.billDotSelected]} /> : <View style={styles.billDotSpacer} />}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}><View style={styles.billDot} /><Text style={styles.meta}>Bill due</Text></View>
            <Text style={styles.meta}>{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Select a date to filter'}</Text>
            {selectedDate ? <Pressable onPress={() => setSelectedDate(null)}><Text style={styles.action}>Show all</Text></Pressable> : null}
          </View>
        </Panel>
      ) : null}

      <View style={styles.heading}>
        <Text style={styles.section}>{section === 'BILLS' ? (selectedDate ? 'Bills on selected date' : 'Upcoming bills') : 'Active loans'}</Text>
        <Pressable onPress={() => setShowForm((value) => !value)}><Text style={styles.action}>{showForm ? 'Cancel' : section === 'BILLS' ? '+ Add bill' : '+ Add loan'}</Text></Pressable>
      </View>

      {showForm && section === 'BILLS' ? (
        <Panel style={{ gap: 9 }}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Bill name (e.g. Electricity)" style={styles.input} />
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount (INR)" style={styles.input} />
          <TextInput value={dueDate} onChangeText={setDueDate} placeholder="Due date YYYY-MM-DD" style={styles.input} />
          <Text style={styles.fieldLabel}>REPEAT</Text>
          <View style={styles.chipRow}>{(['ONCE', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map((value) => (
            <Pressable key={value} onPress={() => setFrequency(value)} style={[styles.chip, frequency === value && styles.chipActive]}><Text style={[styles.chipText, frequency === value && styles.chipTextActive]}>{value}</Text></Pressable>
          ))}</View>
          <Text style={styles.fieldLabel}>REMIND ME BEFORE DUE DATE (DAYS)</Text>
          <TextInput value={remindDays} onChangeText={setRemindDays} keyboardType="number-pad" placeholder="3" style={styles.input} />
          <Pressable style={styles.button} onPress={validateBill} disabled={billMutation.isPending}>
            {billMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save bill</Text>}
          </Pressable>
        </Panel>
      ) : null}

      {showForm && section === 'LOANS' ? (
        <Panel style={{ gap: 9 }}>
          <TextInput value={lender} onChangeText={setLender} placeholder="Bank / lender name" style={styles.input} />
          <Text style={styles.fieldLabel}>LOAN TYPE</Text>
          <View style={styles.chipRow}>{LOAN_TYPES.map((value) => (
            <Pressable key={value} onPress={() => setLoanType(value)} style={[styles.chip, loanType === value && styles.chipActive]}><Text style={[styles.chipText, loanType === value && styles.chipTextActive]}>{value}</Text></Pressable>
          ))}</View>
          <TextInput value={principal} onChangeText={setPrincipal} keyboardType="decimal-pad" placeholder="Original principal (INR)" style={styles.input} />
          <TextInput value={outstanding} onChangeText={setOutstanding} keyboardType="decimal-pad" placeholder="Outstanding balance (INR)" style={styles.input} />
          <TextInput value={emi} onChangeText={setEmi} keyboardType="decimal-pad" placeholder="Monthly EMI (INR)" style={styles.input} />
          <TextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Annual interest rate (%)" style={styles.input} />
          <TextInput value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="EMI due day (1-31)" style={styles.input} />
          <TextInput value={dueDate} onChangeText={setDueDate} placeholder="Next EMI date YYYY-MM-DD" style={styles.input} />
          <TextInput value={installments} onChangeText={setInstallments} keyboardType="number-pad" placeholder="Remaining instalments" style={styles.input} />
          <Pressable style={styles.button} onPress={validateLoan} disabled={loanMutation.isPending}>
            {loanMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save loan</Text>}
          </Pressable>
        </Panel>
      ) : null}

      {section === 'BILLS' ? (
        billsQuery.isLoading ? <Panel><ActivityIndicator color={colors.primary} /></Panel>
          : visibleBills.length === 0 ? <Panel><Text style={styles.empty}>{selectedDate ? 'No bills are due on this date.' : 'No upcoming bills yet. Add rent, utilities, subscriptions or other recurring payments.'}</Text></Panel>
          : visibleBills.map((bill) => {
            const status = billStatus(bill);
            return (
              <Panel key={bill._id} style={styles.billRow}>
                <View style={styles.icon}><Ionicons name="calendar-outline" size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{bill.title}</Text>
                  <Text style={styles.meta}>{new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {bill.frequency.toLowerCase()}</Text>
                  <Text style={styles.amount}>{money(bill.amountPaise)}</Text>
                  <Text style={[styles.statusText, status.tone === 'danger' ? styles.dangerText : status.tone === 'warning' ? styles.warningText : styles.neutralText]}>{status.label}</Text>
                </View>
                <View style={{ gap: 9, alignItems: 'flex-end' }}>
                  <Pressable disabled={payBill.isPending} onPress={() => Alert.alert('Mark bill as paid?', `${bill.title} · ${money(bill.amountPaise)} will also be saved as an expense transaction.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark paid', onPress: () => payBill.mutate({ _id: bill._id, dueDate: bill.dueDate }) },
                  ])}><Text style={styles.action}>Mark paid</Text></Pressable>
                  <Pressable onPress={() => Alert.alert('Remove bill?', bill.title, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeBill.mutate(bill._id) },
                  ])}><Text style={styles.delete}>Remove</Text></Pressable>
                </View>
              </Panel>
            );
          })
      ) : (
        loansQuery.isLoading ? <Panel><ActivityIndicator color={colors.primary} /></Panel>
          : (loansQuery.data ?? []).filter((loan) => loan.status === 'ACTIVE').length === 0
            ? <Panel><Text style={styles.empty}>No active loans. Add a loan to track its outstanding balance and EMI schedule.</Text></Panel>
            : (loansQuery.data ?? []).filter((loan) => loan.status === 'ACTIVE').map((loan) => (
              <Panel key={loan._id} style={{ gap: 9 }}>
                <View style={styles.heading}>
                  <View><Text style={styles.name}>{loan.lender}</Text><Text style={styles.meta}>{loan.loanType.toLowerCase()} · Next EMI: {new Date(loan.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>
                  <Text style={styles.amount}>{money(loan.emiPaise)}/mo</Text>
                </View>
                <Text style={styles.meta}>Outstanding: {money(loan.outstandingPaise)} · {loan.remainingInstallments} instalments left</Text>
                <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, Math.max(0, (1 - loan.outstandingPaise / loan.principalPaise) * 100))}%` }]} /></View>
                <View style={styles.heading}>
                  <Text style={styles.meta}>{loan.annualInterestRate}% annual interest</Text>
                  <Pressable disabled={payLoan.isPending} onPress={() => Alert.alert('Record EMI payment?', `${money(loan.emiPaise)} will be added to your expenses and the loan balance will be updated.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Record payment', onPress: () => payLoan.mutate({ _id: loan._id, emiPaise: loan.emiPaise }) },
                  ])}><Text style={styles.action}>Record EMI paid</Text></Pressable>
                </View>
                <Pressable onPress={() => Alert.alert('Remove loan?', `Remove ${loan.lender}? Historical EMI transactions remain in your account.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removeLoan.mutate(loan._id) },
                ])}><Text style={styles.delete}>Remove loan</Text></Pressable>
              </Panel>
            ))
      )}

      <Text style={styles.note}>Bill reminders are shown in the app based on each bill's lead time. Marking a bill paid records an expense; recurring bills move to their next due date.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  section: { fontSize: 14, fontWeight: '800', color: colors.ink },
  action: { fontSize: 11, fontWeight: '800', color: colors.primary },
  switch: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  switchItem: { flex: 1, padding: 10, borderRadius: 13, backgroundColor: '#F4F1FA', alignItems: 'center' },
  switchActive: { backgroundColor: colors.lilac },
  switchText: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  switchTextActive: { color: colors.primary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 11, color: colors.ink, fontSize: 12 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: colors.muted, letterSpacing: 0.7 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 18 },
  chipActive: { backgroundColor: colors.lilac, borderColor: colors.primary },
  chipText: { fontSize: 9, color: colors.ink },
  chipTextActive: { color: colors.primary, fontWeight: '800' },
  button: { backgroundColor: colors.primary, padding: 13, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 12, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 10, color: colors.muted, marginTop: 4 },
  amount: { fontSize: 12, fontWeight: '800', color: colors.ink, marginTop: 5 },
  empty: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  delete: { fontSize: 10, color: colors.expense, fontWeight: '700' },
  track: { height: 6, borderRadius: 9, backgroundColor: colors.lavender, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  note: { fontSize: 9, color: colors.muted, lineHeight: 14, textAlign: 'center' },
  calendarNav: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  monthLabel: { fontSize: 11, color: colors.ink, fontWeight: '800' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '800', paddingBottom: 8 },
  calendarCell: { width: '14.2857%', height: 38, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  daySelected: { backgroundColor: colors.primary },
  dayToday: { borderWidth: 1, borderColor: colors.primary },
  dayText: { color: colors.ink, fontSize: 10, fontWeight: '600' },
  daySelectedText: { color: '#FFF', fontWeight: '800' },
  billDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  billDotSelected: { backgroundColor: '#FFF' },
  billDotSpacer: { width: 4, height: 4 },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 9, fontWeight: '800', marginTop: 4 },
  dangerText: { color: colors.expense },
  warningText: { color: '#B7791F' },
  neutralText: { color: colors.muted },
});
