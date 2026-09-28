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
    const overlapStatus=upper(input.overlapStatus);
    const missing=[...new Set((input.missing||[]).map(String).filter(Boolean))];
    const price=finite(input.price)?Number(input.price):null;
    const analystTargetPrice=finite(input.analystTargetPrice)?Number(input.analystTargetPrice):null;
    const targetBelowMarket=price!==null&&analystTargetPrice!==null&&analystTargetPrice<=price;
    const blockers=[];
    const add=(code,label,detail,priority)=>blockers.push({code,label,detail,priority});

    if(!dataComplete||buyScore===null)add('DATA_INCOMPLETE','Dados fundamentais incompletos',missing.length?`Faltam: ${missing.join(', ')}.`:'Atualizar fundamentos, preço e campos essenciais.',100);
    if(!thesisApproved)add('THESIS_NOT_VALID',thesisStatus==='REJECTED'?'Tese rejeitada':'Tese ainda não validada',input.isHeld?'Revisar saída da posição; nenhuma venda automática.':'Rebaixar ou arquivar no Radar.',95);
    if(targetBelowMarket)add('TARGET_BELOW_MARKET','Preço acima do alvo disponível',`Cotação US$ ${price.toFixed(2)} versus alvo US$ ${analystTargetPrice.toFixed(2)}.`,90);
    if(overlapStatus==='BLOCK')add('OVERLAP_BLOCKED','Sobreposição estratégica bloqueada','Revisar exposição direta e indireta antes de considerar capital.',85);
    if(!valuationApproved)add('VALUATION_NOT_APPROVED','Valuation não aprovado',valuationStatus==='WAIT'?'Margem de segurança insuficiente no preço atual.':'Definir retorno esperado e faixa de entrada.',80);
    if(buyScore!==null&&buyScore<60)add('BUY_SCORE_BELOW_MINIMUM','Buy Score abaixo do mínimo',`Buy Score ${buyScore.toFixed(0)}/100; mínimo operacional 60.`,75);
    if(WAIT_PRICE_STATES.has(priceActionState))add('PRICE_EXTENDED','Preço sem condição de entrada',priceActionState==='SPIKE'?'Movimento acelerado; aguardar normalização.':'Preço estendido; não perseguir entrada.',70);
    blockers.sort((a,b)=>b.priority-a.priority);

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
      primaryBlocker:blockers[0]||null,
      blockers,
      recommendedAction:blockers.length?(input.isHeld&&thesisStatus==='REJECTED'?'EXIT_REVIEW':'RESOLVE_BLOCKERS'):'CONTINUE_MONITORING',
      evidence:{
        thesisStatus,valuationStatus,priceActionState,buyScore,
        dataComplete,fundamentalsApproved,valuationApproved,overlapStatus,
        price,analystTargetPrice,targetBelowMarket
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
