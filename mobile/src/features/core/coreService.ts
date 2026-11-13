import { API_BASE_URL } from '../../services/networkConfig';
export type TokenGetter = () => Promise<string | null>;

async function call<T>(path: string, getToken: TokenGetter, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('A valid sign-in session is required.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers }, signal: controller.signal });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
      throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The server took too long to respond. Try again.');
    if (error instanceof TypeError) throw new Error('Could not reach the SpendSense server. Check your network connection.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export interface AccountInput { name: string; type: 'CASH'|'BANK'|'UPI'|'CREDIT_CARD'|'WALLET'|'OTHER'; institution?: string; openingBalancePaise?: number; isArchived?: boolean }
export interface AccountRecord extends AccountInput { _id: string; balancePaise?: number; createdAt?: string }
export interface CategoryRecord { _id: string; name: string; type: 'DEBIT'|'CREDIT'|'BOTH'; icon?: string; color?: string; isDefault: boolean }
export interface CategoryInput { name: string; type?: 'DEBIT'|'CREDIT'|'BOTH'; icon?: string; color?: string }
export interface BudgetInput { category: string; limitPaise: number; month: string; alertAtPercent?: number }
export interface BudgetRecord extends BudgetInput { _id: string; spentPaise: number }
export const listAccounts = (token: TokenGetter) => call<{data: AccountRecord[]}>('/api/accounts',token);
export const createAccount = (body: AccountInput,token: TokenGetter) => call<{data: unknown}>('/api/accounts',token,{method:'POST',body:JSON.stringify(body)});
export const updateAccount = (id:string,body:Partial<AccountInput>,token:TokenGetter) => call<{data:unknown}>(`/api/accounts/${encodeURIComponent(id)}`,token,{method:'PATCH',body:JSON.stringify(body)});
export const archiveAccount = (id:string,token:TokenGetter) => call<{data:unknown}>(`/api/accounts/${encodeURIComponent(id)}`,token,{method:'DELETE'});
export const listCategories = (token:TokenGetter) => call<{data:CategoryRecord[]}>('/api/categories',token);
export const createCategory = (body:CategoryInput,token:TokenGetter) => call<{data:CategoryRecord}>('/api/categories',token,{method:'POST',body:JSON.stringify(body)});
export const updateCategory = (id:string,body:Partial<CategoryInput>,token:TokenGetter) => call<{data:CategoryRecord}>(`/api/categories/${encodeURIComponent(id)}`,token,{method:'PATCH',body:JSON.stringify(body)});
export const deleteCategory = (id:string,token:TokenGetter) => call<void>(`/api/categories/${encodeURIComponent(id)}`,token,{method:'DELETE'});
export const listBudgets = (month:string,token:TokenGetter) => call<{data:BudgetRecord[]}>(`/api/budgets?month=${encodeURIComponent(month)}`,token);
export const saveBudget = (body:BudgetInput,token:TokenGetter) => call<{data:BudgetRecord}>('/api/budgets',token,{method:'POST',body:JSON.stringify(body)});
export const deleteBudget = (id:string,token:TokenGetter) => call<void>(`/api/budgets/${encodeURIComponent(id)}`,token,{method:'DELETE'});
export interface MonthlySummary { month:string; incomePaise:number; expensePaise:number; netPaise:number; balancePaise:number; transactionCount:number; expenseCount:number; categoryBreakdown:{_id:string;totalPaise:number}[]; recent:Array<{_id:string;amountPaise:number;type:'DEBIT'|'CREDIT';merchant:string;category:string;occurredAt:string;note?:string}> }
export const updateMyProfile = (body: {name:string;email:string},token:TokenGetter) => call<{data:{id:string;name:string;email:string}}>('/api/auth/me',token,{method:'PATCH',body:JSON.stringify(body)});
export const getMonthlySummary = (month:string,token:TokenGetter) => call<{data:MonthlySummary}>(`/api/summary/monthly?month=${encodeURIComponent(month)}`,token);

export interface BillInput { title:string; category?:string; amountPaise:number; dueDate:string; frequency:'ONCE'|'MONTHLY'|'QUARTERLY'|'YEARLY'; remindDaysBefore?:number; notes?:string }
export interface BillRecord extends BillInput { _id:string; status:'UPCOMING'|'PAID'|'CANCELLED'; lastPaidAt?:string }
export interface LoanInput { lender:string; loanType:'PERSONAL'|'HOME'|'VEHICLE'|'EDUCATION'|'OTHER'; principalPaise:number; outstandingPaise:number; annualInterestRate:number; emiPaise:number; dueDay:number; nextDueDate:string; remainingInstallments:number }
export interface LoanRecord extends LoanInput { _id:string; status:'ACTIVE'|'CLOSED' }
export const listBills=(token:TokenGetter)=>call<{data:BillRecord[]}>('/api/bills',token);
export const createBill=(body:BillInput,token:TokenGetter)=>call<{data:BillRecord}>('/api/bills',token,{method:'POST',body:JSON.stringify(body)});
export const markBillPaid=(id:string,expectedDueDate:string,token:TokenGetter)=>call<{data:BillRecord}>(`/api/bills/${encodeURIComponent(id)}/pay`,token,{method:'POST',body:JSON.stringify({expectedDueDate})});
export const deleteBill=(id:string,token:TokenGetter)=>call<void>(`/api/bills/${encodeURIComponent(id)}`,token,{method:'DELETE'});
export const listLoans=(token:TokenGetter)=>call<{data:LoanRecord[]}>('/api/loans',token);
export const createLoan=(body:LoanInput,token:TokenGetter)=>call<{data:LoanRecord}>('/api/loans',token,{method:'POST',body:JSON.stringify(body)});
export const recordLoanPayment=(id:string,amountPaise:number,token:TokenGetter)=>call<{data:{loan:LoanRecord;transaction:unknown}}>(`/api/loans/${encodeURIComponent(id)}/payment`,token,{method:'POST',body:JSON.stringify({amountPaise,paidAt:new Date().toISOString()})});
export const deleteLoan=(id:string,token:TokenGetter)=>call<void>(`/api/loans/${encodeURIComponent(id)}`,token,{method:'DELETE'});
