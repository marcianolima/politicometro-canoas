"use strict";
(()=>{
const $=s=>document.querySelector(s);
const curr=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:2});
const compact=n=>"R$ "+new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(n/1e9)+" bi";
const div=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
function download(data){
 const header=["ano","receita_realizada_brl","despesa_empenhada_brl","diferenca_brl","metodologia"];
 const rows=[header,...data.anuais.map(p=>[p.ano,p.receitaRealizada,p.despesaEmpenhada,p.resultado,"DCA exceto intraorçamentárias"])];
 const csv="\ufeff"+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob);
 const a=div("a");a.href=url;a.download="canoas-historico-dca-2015-2025.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function render(data){
 const annual=[...data.anuais].sort((a,b)=>a.ano-b.ano),last=annual.at(-1);
 const cards=[
 ["Receita realizada · DCA "+last.ano,last.receitaRealizada,"Receita líquida exceto intraorçamentárias."],
 ["Despesa empenhada · DCA "+last.ano,last.despesaEmpenhada,"Compromissos exceto intraorçamentários."],
 ["Despesa paga · DCA "+last.ano,last.despesaPaga,"Valor pago, não equivalendo ao total empenhado."]
 ];
 $("#dcaSummary").replaceChildren(...cards.map(([title,value,note])=>{
   const box=div("article","fiscal-metric");
   box.append(div("span","fiscal-metric-label",title),div("strong","fiscal-metric-value",compact(value)),div("p","fiscal-metric-description",note));
   return box;
 }));
 const max=Math.max(...annual.flatMap(p=>[p.receitaRealizada,p.despesaEmpenhada]));
 $("#dcaChart").replaceChildren(...annual.map(p=>{
   const outer=div("div","dca-year");
   const bars=div("div","dca-twin");
   const inc=div("span","dca-income"),out=div("span","dca-expense");
   inc.style.height=(100*p.receitaRealizada/max).toFixed(2)+"%";
   out.style.height=(100*p.despesaEmpenhada/max).toFixed(2)+"%";
   inc.title="Receita "+p.ano+" · "+curr.format(p.receitaRealizada);
   out.title="Empenhado "+p.ano+" · "+curr.format(p.despesaEmpenhada);
   bars.append(inc,out);
   outer.append(bars,div("span","dca-year-label",String(p.ano)));
   return outer;
 }));
 const func=[...data.funcoes2025].sort((a,b)=>b.empenhadoAproximado-a.empenhadoAproximado),peak=func[0]?.empenhadoAproximado||1;
 $("#dcaFunctions").replaceChildren(...func.map(p=>{
   const row=div("div","dca-function");
   const label=div("div","dca-func-top");
   label.append(div("span","",p.funcao),div("strong","",curr.format(p.empenhadoAproximado)));
   const rail=div("div","dca-func-rail"),fill=div("span");
   fill.style.width=(100*p.empenhadoAproximado/peak).toFixed(2)+"%";rail.append(fill);
   row.append(label,rail);
   return row;
 }));
 $("#dcaRows").replaceChildren(...annual.reverse().map(p=>{
   const tr=div("tr");const diff=p.resultado;
   for(const value of [p.ano,curr.format(p.receitaRealizada),curr.format(p.despesaEmpenhada),curr.format(diff)]){
     tr.append(div("td","",String(value)));
   }
   return tr;
 }));
 $("#exportDca").disabled=false;
 $("#exportDca").addEventListener("click",()=>download(data));
}
async function boot(){
 try{
  const r=await fetch("data/financas-dca.json",{cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status);
  const d=await r.json();
  if(d.municipioIbge!=="4304606"||d.anuais.length<10||d.status!=="reproducao-secundaria-pendente-conciliacao-direta")throw Error("Base DCA inesperada");
  render(d);
 }catch(error){
  $("#dcaSummary").replaceChildren(div("p","finance-empty","Não foi possível carregar o histórico DCA: "+error.message));
 }
}
document.addEventListener("DOMContentLoaded",boot);
})();