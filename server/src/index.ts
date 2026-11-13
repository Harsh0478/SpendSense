import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { requireAuth } from './middleware/requireAuth.js';
import { authRouter } from './routes/auth.js';
import { transactionRouter } from './routes/transactions.js';
import { importRouter } from './routes/import.js';
import { aiRouter } from './routes/ai.js';
import { accountRouter } from './routes/accounts.js';
import { categoryRouter } from './routes/categories.js';
import { budgetRouter } from './routes/budgets.js';
import { summaryRouter } from './routes/summary.js';
import { billRouter } from './routes/bills.js';
import { loanRouter } from './routes/loans.js';
const app=express(); app.disable('x-powered-by');
app.use(helmet()); app.use(cors({origin:env.CORS_ORIGIN==='*'?true:env.CORS_ORIGIN.split(','),credentials:true})); app.use(express.json({limit:'256kb'})); app.use(rateLimit({windowMs:60_000,limit:100,standardHeaders:'draft-8',legacyHeaders:false}));
app.get('/health',(_req,res)=>res.json({ok:true,service:'spendsense-api'}));
app.use('/api/auth',authRouter);
for (const [path,router] of Object.entries({'/api/transactions':transactionRouter,'/api/accounts':accountRouter,'/api/categories':categoryRouter,'/api/budgets':budgetRouter,'/api/summary':summaryRouter,'/api/import':importRouter,'/api/ai':aiRouter,'/api/bills':billRouter,'/api/loans':loanRouter})) app.use(path,requireAuth,router);
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(error instanceof ZodError) return res.status(400).json({error:'VALIDATION_ERROR',details:error.issues});
  if(typeof error==='object'&&error!==null&&'code'in error&&error.code===11000){
    const duplicate=error as {keyPattern?:Record<string,unknown>};
    if(duplicate.keyPattern?.dedupeKey) return res.status(409).json({error:'DUPLICATE_TRANSACTION',message:'This transaction has already been imported or saved.'});
    return res.status(409).json({error:'DUPLICATE_OR_CONFLICT',message:'A record with these details already exists.'});
  }
  if(error instanceof Error&&error.name==='CastError') return res.status(400).json({error:'INVALID_ID'});
  if(typeof error==='object'&&error!==null&&'name'in error&&error.name==='MulterError'){
    const uploadError=error as {code?:string};
    const tooLarge=uploadError.code==='LIMIT_FILE_SIZE';
    return res.status(tooLarge?413:400).json({error:tooLarge?'FILE_TOO_LARGE':'INVALID_UPLOAD',message:tooLarge?'File exceeds the 8 MB upload limit.':'The uploaded file could not be accepted.'});
  }
  if(typeof error==='object'&&error!==null&&'status'in error){
    const status=Number((error as {status?:unknown}).status);
    if(status>=400&&status<=599) return res.status(status).json({error:error instanceof Error?error.message:'REQUEST_FAILED',message:error instanceof Error?error.message:'The request could not be processed.'});
  }
  console.error('Unhandled API error',error instanceof Error?error.message:'Unknown error');
  return res.status(500).json({error:'INTERNAL_SERVER_ERROR'});
});
const start=async()=>{ console.info('Starting SpendSense API...'); if(!env.MONGODB_URI)throw new Error('MONGODB_URI is not configured.'); if(!env.JWT_SECRET||env.JWT_SECRET.length<32)throw new Error('Set JWT_SECRET to a random value of at least 32 characters.'); console.info('Connecting to MongoDB...'); await connectDatabase(); app.listen(env.PORT,'0.0.0.0',()=>console.info(`SpendSense API listening on ${env.PORT}`)); };
start().catch(error=>{console.error('Failed to start API:',error);process.exit(1);});
