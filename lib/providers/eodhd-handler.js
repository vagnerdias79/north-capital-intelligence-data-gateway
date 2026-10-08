import { fetchFundamentals, symbolFor } from './eodhd.js';
export function createHandler({authenticate,env=process.env,load=fetchFundamentals}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','private, no-store');
    const reply=(status,payload)=>res.status(status).json({...payload,writeOperationsEnabled:false,decisionAuthorization:false});
    if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,{ok:false,error:'METHOD_NOT_ALLOWED'});}
    try {
      const identity=await authenticate(req);
      // A personal license is owner-only, not shared with every authenticated account.
      if(!env.EODHD_OWNER_SUBJECT)return reply(503,{ok:false,error:'OWNER_NOT_CONFIGURED'});
      if(identity.subject!==env.EODHD_OWNER_SUBJECT)return reply(403,{ok:false,error:'OWNER_ONLY'});
      if(env.EODHD_PREVIEW_ENABLED!=='true')return reply(200,{ok:false,configured:false,status:'INTEGRATION_DISABLED'});
      if(!env.EODHD_API_KEY)return reply(200,{ok:false,configured:false,status:'PROVIDER_NOT_CONFIGURED'});
      const ticker=String(req.query?.symbol||'').trim().toUpperCase();symbolFor(ticker);
      const row=await load(ticker,env.EODHD_API_KEY);
      return reply(200,{ok:true,configured:true,mode:'READ_ONLY_PREPARATION',fundamentals:[row]});
    } catch(error) {
      const code=error?.code;
      const status=code==='UNSUPPORTED_SYMBOL'?400:code?.startsWith('NCI_AUTH_')?(error.httpStatus||401):502;
      const permitted=['UNSUPPORTED_SYMBOL','NCI_AUTH_REQUIRED','NCI_AUTH_INVALID','NCI_AUTH_SUBJECT_MISSING','PROVIDER_ACCESS_DENIED','PROVIDER_RATE_LIMIT','PROVIDER_INVALID_PAYLOAD','INSTRUMENT_MISMATCH'];
      return reply(status,{ok:false,error:permitted.includes(code)?code:'PROVIDER_UNAVAILABLE'});
    }
  };
}
