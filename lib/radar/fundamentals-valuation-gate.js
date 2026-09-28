const NCIFundamentalsValuationGate=(function(){
  const APPROVED_VALUATIONS=new Set(['ATTRACTIVE','FAIR']);
  const WAIT_PRICE_STATES=new Set(['EXTENDED','SPIKE']);

  function upper(value){return String(value||'').trim().toUpperCase()}
  function finite(value){return Number.isFinite(Number(value))}

  function evaluate(input={}){
    const thesisStatus=upper(input.thesisStatus);
    const valuationStatus=upper(input.valuationStatus);
    const priceActionState=upper(input.priceActionState)||'DATA_UNAVAILABLE';
    const dataComplete=input.dataComplete===true;
    const buyScore=finite(input.buyScore)?Number(input.buyScore):null;
    const fundamentalsApproved=dataComplete&&buyScore!==null&&buyScore>=60;
    const valuationApproved=APPROVED_VALUATIONS.has(valuationStatus);
    const thesisApproved=thesisStatus==='VALID';

    let decision='MONITOR';
    let tone='neutral';
    let headline='Monitorar fundamentos, valuation e preço.';

    if(!dataComplete||buyScore===null){
      decision='BLOCKED_DATA';tone='blocked';
      headline='Dados fundamentais insuficientes; nenhuma conclusão de entrada.';
    }else if(!thesisApproved){
      decision='BLOCKED_THESIS';tone='blocked';
      headline='Tese não validada; preço não transforma o ativo em oportunidade.';
    }else if(WAIT_PRICE_STATES.has(priceActionState)){
      decision='WAIT_PRICE';tone='wait';
      headline='Preço estendido; preservar disciplina e aguardar nova assimetria.';
    }else if(priceActionState==='PULLBACK'&&!valuationApproved){
      decision='VALIDATE_VALUATION';tone='review';
      headline='Preço em correção; validar margem de segurança antes de avançar.';
    }else if(priceActionState==='PULLBACK'&&valuationApproved&&fundamentalsApproved){
      decision='REVIEW_ENTRY';tone='review';
      headline='Convergência de preço e fundamentos; encaminhar para decisão humana.';
    }else if(!valuationApproved){
      decision='VALUATION_PENDING';tone='wait';
      headline='Fundamentos disponíveis, mas valuation ainda não aprovado.';
    }

    return {
      strategy:'FUNDAMENTALS_VALUATION_GATE_V1',
      decision,tone,headline,
      evidence:{
        thesisStatus,valuationStatus,priceActionState,buyScore,
        dataComplete,fundamentalsApproved,valuationApproved
      },
      signalScope:'ANALYSIS_ONLY',
      decisionAuthorization:false,
      automaticPromotion:false,
      writeOperationsEnabled:false
    };
  }

  return {evaluate};
})();

if(typeof window!=='undefined')window.NCIFundamentalsValuationGate=NCIFundamentalsValuationGate;
export const evaluate=NCIFundamentalsValuationGate.evaluate;
export default NCIFundamentalsValuationGate;
