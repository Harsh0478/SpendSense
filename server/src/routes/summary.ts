import { Router } from 'express';
import { Transaction } from '../models/Transaction.js';
import { Account } from '../models/Account.js';
import type { AuthenticatedRequest } from '../middleware/requireAuth.js';
export const summaryRouter = Router();
summaryRouter.get('/monthly', async (req,res,next) => {
  try {
    const userId=(req as AuthenticatedRequest).authUserId!;
    const month=typeof req.query.month==='string'?req.query.month:new Date().toISOString().slice(0,7);
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({error:'INVALID_MONTH'});
    const start=new Date(`${month}-01T00:00:00.000Z`); const end=new Date(start); end.setUTCMonth(end.getUTCMonth()+1);
    const [totals, categories, recent, lifetime, accountOpeningBalances]=await Promise.all([
      Transaction.aggregate([{ $match:{ownerUserId:userId,occurredAt:{$gte:start,$lt:end}}},{ $group:{_id:'$type',totalPaise:{$sum:'$amountPaise'},count:{$sum:1}}}]),
      Transaction.aggregate([{ $match:{ownerUserId:userId,type:'DEBIT',occurredAt:{$gte:start,$lt:end}}},{ $group:{_id:'$category',totalPaise:{$sum:'$amountPaise'}}},{ $sort:{totalPaise:-1}}]),
      Transaction.find({ownerUserId:userId}).sort({occurredAt:-1}).limit(5).lean(),
      Transaction.aggregate([{ $match:{ownerUserId:userId}},{ $group:{_id:'$type',totalPaise:{$sum:'$amountPaise'}}}]),
      Account.aggregate([{ $match:{ownerUserId:userId}},{ $group:{_id:null,totalPaise:{$sum:'$openingBalancePaise'}}}]),
    ]);
    const debit=totals.find(x=>x._id==='DEBIT')?.totalPaise||0; const credit=totals.find(x=>x._id==='CREDIT')?.totalPaise||0;
    const lifetimeDebit=lifetime.find(x=>x._id==='DEBIT')?.totalPaise||0; const lifetimeCredit=lifetime.find(x=>x._id==='CREDIT')?.totalPaise||0;
    const expenseCount=totals.find(x=>x._id==='DEBIT')?.count||0;
    return res.json({data:{month,incomePaise:credit,expensePaise:debit,netPaise:credit-debit,balancePaise:(lifetimeCredit-lifetimeDebit)+(accountOpeningBalances[0]?.totalPaise||0),transactionCount:totals.reduce((n,x)=>n+x.count,0),expenseCount,categoryBreakdown:categories,recent}});
  } catch(error){return next(error);}
});
