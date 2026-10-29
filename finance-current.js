"use strict";(()=>{
 const $=s=>document.querySelector(s);
 const fmt=n=>"≈ R$ "+new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(n/1e9)+" bi";
 const fmtInvest=n=>"≈ R$ "+new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(n/1e6)+" mi";
 const card=(title,value,desc,invest=false)=>{
   const el=document.createElement("article");el.className="fiscal-metric";
   const h=document.createElement("span");h.className="fiscal-metric-label";h.textContent=title;
   const v=document.createElement("strong");v.className="fiscal-metric-value";v.textContent=(invest?fmtInvest:fmt)(value);
   const p=document.createElement("p");p.className="fiscal-metric-description";p.textContent=desc;
   el.append(h,v,p);return el;
 };
 document.addEventListener("DOMContentLoaded",async()=>{
  try{
   const response=await fetch("data/financas-2026-referencia.json",{cache:"no-store"});
   if(!response.ok)throw Error("HTTP "+response.status);
   const d=await response.json();
   if(d.municipioIbge!=="4304606"||d.ano!==2026||d.bimestre!==4||!d.aproximado||!d.status.includes("secundaria"))throw Error("Referência fiscal fora da metodologia");
   if(!(d.despesaPaga<=d.despesaLiquidada&&d.despesaLiquidada<=d.despesaEmpenhada&&d.despesaEmpenhada<=d.dotacaoAtualizada))throw Error("Etapas de despesa não conciliadas");
   $("#current2026Notice").textContent="Parcial de janeiro a agosto de 2026. Valores aproximados de reprodução secundária do RREO/SICONFI, ainda sem conciliação numérica direta ao arquivo original. Não somar estes agregados com o RREO consolidado de 2024–2025.";
   const metrics=[
    ["Receita arrecadada",d.receitaRealizada,"Receita líquida acumulada até agosto de 2026.",false],
    ["Previsão de receita",d.receitaPrevista,"Receita prevista para o ano, não arrecadação.",false],
    ["Dotação de despesa",d.dotacaoAtualizada,"Orçamento autorizado após alterações.",false],
    ["Despesas empenhadas",d.despesaEmpenhada,"Compromissos orçamentários acumulados.",false],
    ["Despesas liquidadas",d.despesaLiquidada,"Execução reconhecida contabilmente.",false],
    ["Despesas pagas",d.despesaPaga,"Pagamentos efetuados até o período.",false],
    ["Investimentos empenhados",d.investimentosEmpenhados,"Grupo de investimentos; não equivale a obras entregues.",true]
   ];
   $("#current2026Metrics").replaceChildren(...metrics.map(x=>card(...x)));
  }catch(e){$("#current2026Notice").textContent="Não foi possível carregar a referência fiscal parcial de 2026: "+e.message}
 });
})();