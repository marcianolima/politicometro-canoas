"use strict";
(() => {
  const $ = (selector) => document.querySelector(selector);
  const fmt = new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"});
  const nf = new Intl.NumberFormat("pt-BR");
  const pct = new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1});
  const worksExpression = /(?:\bobras?\b|construc|paviment|asfalt|drenag|reform|restaur|requalific|urbaniz|recuperac|saneament|infraestrut|edific|contenc|\bponte\b|viaduto|desassore|rede pluvial)/i;
  const state = {fiscal:null,selected:null,pncp:null,contracts:[],filtered:[],page:1,year:"2024"};
  const compact = (v) => {
    if (!Number.isFinite(v)) return "Não disponível";
    if (Math.abs(v)>=1e9) return "R$ "+pct.format(v/1e9)+" bi";
    if (Math.abs(v)>=1e6) return "R$ "+pct.format(v/1e6)+" mi";
    return fmt.format(v);
  };
  const node = (tag,klass,text) => {
    const e=document.createElement(tag);
    if(klass)e.className=klass;
    if(text!==undefined)e.textContent=text;
    return e;
  };
  const money = (v) => Number.isFinite(v)?fmt.format(v):"Não disponível";
  const number = (v) => Number.isFinite(v)?nf.format(v):"Não disponível";
  const rate = (n,d) => Number.isFinite(n)&&Number.isFinite(d)&&d>0 ? n/d*100 : null;
  const percent = (n) => n===null?"Não disponível":pct.format(n)+"%";
  const clear = (e,...children) => e.replaceChildren(...children);
  const link = (href,label) => {
    const a=node("a","finance-text-link",label);
    a.href=href;a.target="_blank";a.rel="noopener noreferrer";
    return a;
  };
  async function data(path){
    const result=await fetch(path,{cache:"no-store"});
    if(!result.ok)throw Error("HTTP "+result.status);
    return result.json();
  }
  function metric(label,value,description){
    const card=node("article","fiscal-metric");
    const title=node("span","fiscal-metric-label",label);
    const sum=node("strong","fiscal-metric-value",compact(value));
    sum.title=money(value);
    const explanation=node("p","fiscal-metric-description",description);
    card.append(title,sum,explanation);
    return card;
  }
  function selectFiscal(period){
    state.selected=period;
    const completed=period.bimestre===6;
    const note=$("#periodNotice");
    note.className="finance-note"+(completed?"":" finance-partial");
    note.textContent=(completed?"Exercício encerrado · ":"Exercício parcial · ")+period.periodo+
      ". Fonte: RREO Anexo XIV da Prefeitura de Canoas. Valores acumulados desde 1º de janeiro."+
      " Não representam dados em tempo real de 2026.";
    $("#periodSource").href=period.fonte;
    const receipts=period.receitas,exp=period.despesas;
    clear($("#fiscalMetrics"),
      metric("Orçamento de despesa autorizado",exp.dotacaoAtualizada,"Dotação atualizada, não despesa paga."),
      metric("Receita realizada",receipts.realizadas,"Arrecadação acumulada no exercício."),
      metric("Despesa empenhada",exp.empenhadas,"Despesas com compromisso orçamentário."),
      metric("Despesa liquidada",exp.liquidadas,"Despesa com execução reconhecida."),
      metric("Despesa paga",exp.pagas,"Pagamentos contabilizados no exercício."),
      metric("Despesa de capital líquida",period.capital?.despesaCapitalLiquida??null,"Agregado divulgado quando disponível; não apenas obras.")
    );
    bars($("#execBars"),[
      ["Dotação atualizada",exp.dotacaoAtualizada,true],
      ["Empenhado",exp.empenhadas],
      ["Liquidado",exp.liquidadas],
      ["Pago",exp.pagas]],exp.dotacaoAtualizada);
    bars($("#revenueBars"),[
      ["Previsão de receita atualizada",receipts.previsaoAtualizada,true],
      ["Receita realizada",receipts.realizadas]],receipts.previsaoAtualizada);
    const ratios=$("#fiscalRatios");
    clear(ratios,
      ratio("Arrecadação da previsão atualizada",receipts.realizadas,receipts.previsaoAtualizada),
      ratio("Empenhos da dotação atualizada",exp.empenhadas,exp.dotacaoAtualizada),
      ratio("Pagamentos dos empenhos",exp.pagas,exp.empenhadas));
    $("#capitalTotal").textContent=money(period.capital?.despesaCapitalLiquida);
    $("#capitalDescription").textContent=period.capital
      ?"Despesa de capital líquida registrada pelo RREO ao final de "+period.ano+
       ". Não significa volume de obras nem pagamentos de projetos específicos."
      :"O recorte selecionado não contém dado de despesa de capital comparável validado.";
    const constitutional=$("#constitutionalRates");
    const rates=period.aplicacoesVinculadas;
    if(!rates)clear(constitutional,node("p","finance-muted","Sem percentuais consolidados e validados para este recorte."));
    else{
      const values=[
        ["Educação · MDE",rates.educacaoPercentual,rates.educacaoMinimoPercentual],
        ["Saúde · ASPS",rates.saudePercentual,rates.saudeMinimoPercentual],
        ["Remuneração FUNDEB",rates.fundebMagisterioPercentual,rates.fundebMinimoPercentual]
      ];
      clear(constitutional,...values.map(([label,observed,min])=>{
        const card=node("div","constitutional-item");
        card.append(node("strong","",label),node("span","",pct.format(observed)+"%"),
          node("small","", "Mínimo legal de referência: "+pct.format(min)+"%"));
        const track=node("div","constitutional-track");
        const fill=node("span","");fill.style.width=Math.min(100,observed)+"%";track.append(fill);card.append(track);
        return card;
      }));
    }
  }
  function ratio(label,n,d){
    const div=node("div","finance-ratio");
    div.append(node("span","",label),node("strong","",percent(rate(n,d))));
    return div;
  }
  function bars(container,items,reference){
    clear(container,...items.map(([name,v,authorized])=>{
      const line=node("div","finance-bar-row");
      const head=node("div","finance-bar-head");
      head.append(node("span","",name),node("strong","",compact(v)));
      const rail=node("div","finance-bar-rail");
      const fill=node("span",authorized?"is-authorized":"is-executed");
      fill.style.width=(Number.isFinite(v)&&reference>0?Math.max(0,Math.min(100,v/reference*100)):0)+"%";
      rail.append(fill);line.append(head,rail);return line;
    }));
  }
  function renderHistory(){
    const year=Number($("#seriesYear").value);
    const list=(state.fiscal?.periodos||[]).filter(p=>p.ano===year).sort((a,b)=>a.fim.localeCompare(b.fim));
    const plot=$("#historyPlot");
    if(!list.length){clear(plot,node("p","finance-muted","Sem série oficial armazenada para este ano."));return}
    const max=Math.max(...list.flatMap(p=>[p.receitas.realizadas,p.despesas.empenhadas,p.despesas.pagas]));
    clear(plot,...list.map(p=>{
      const g=node("div","history-group");
      g.append(node("strong","history-period",p.fim.slice(5)));
      const stack=node("div","history-bars");
      for(const [type,value] of [["receitas",p.receitas.realizadas],["empenhos",p.despesas.empenhadas],["pagamentos",p.despesas.pagas]]){
        const b=node("span","history-bar "+type);
        b.style.height=Math.max(2,100*value/max)+"%";
        b.title=type+": "+money(value)+" · "+p.periodo;
        b.setAttribute("aria-label",b.title);
        stack.append(b);
      }
      g.append(stack,node("span","history-label",p.bimestre+"º bim."));
      return g;
    }));
    clear($("#historyLegend"),...[["receitas","Receitas realizadas"],["empenhos","Despesas empenhadas"],["pagamentos","Despesas pagas"]].map(([cl,txt])=>{
      const e=node("span","");e.append(node("i",cl),document.createTextNode(txt));return e;
    }));
  }
  function csv(rows){
    return "\ufeff"+rows.map(cells=>cells.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
  }
  function download(filename,rows){
    const blob=new Blob([csv(rows)],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=node("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportFiscal(){
    const p=state.selected;if(!p)return;
    const rows=[["município","exercício","período","categoria","indicador","valor_brl","fonte"]];
    for(const [group,obj] of Object.entries({receitas:p.receitas,despesas:p.despesas,capital:p.capital||{},responsabilidadeFiscal:p.responsabilidadeFiscal||{},aplicacoesVinculadas:p.aplicacoesVinculadas||{}})){
      for(const [indicator,value] of Object.entries(obj)){
        if(Number.isFinite(value))rows.push(["Canoas",p.ano,p.fim,group,indicator,value,p.fonte]);
      }
    }
    download("canoas-rreo-"+p.fim+".csv",rows);
  }
  function contractMatchesWork(contract){
    const normalized=String(contract.objeto||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return worksExpression.test(normalized);
  }
  function contractCard(c,condensed=false){
    const card=node("article","contract-card");
    const top=node("div","contract-card-top");
    const type=contractMatchesWork(c)?"Objeto relacionado a obras":"Contrato publicado";
    top.append(node("span","contract-type",type),node("time","contract-date",c.publicacao||"Data não disponível"));
    const h=node("h3","",c.objeto);
    const details=node("p","contract-meta","Fornecedor: "+(c.fornecedor||"Não informado")+" · Contrato "+(c.numero||"sem número"));
    const bottom=node("div","contract-bottom");
    bottom.append(node("strong","",money(c.valor)),link(c.fonte,"Consultar no PNCP ↗"));
    card.append(top,h,details,bottom);
    if(condensed)card.classList.add("condensed");
    return card;
  }
  function filterContracts(){
    if(state.pncp?.status!=="verificado")return;
    const search=$("#contractSearch").value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
    const scope=$("#contractScope").value;
    const order=$("#contractOrder").value;
    state.filtered=state.contracts.filter(c=>{
      if(scope==="works"&&!contractMatchesWork(c))return false;
      const text=(c.objeto+" "+(c.fornecedor||"")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
      return !search||text.includes(search);
    }).sort(order==="value"?(a,b)=>b.valor-a.valor:(a,b)=>String(b.publicacao||"").localeCompare(a.publicacao||""));
    state.page=1;
    renderContracts();
  }
  function renderContracts(){
    const per=9,start=(state.page-1)*per,pages=Math.max(1,Math.ceil(state.filtered.length/per));
    const list=$("#contractList");
    if(!state.filtered.length){clear(list,node("p","finance-empty","Nenhum contrato encontrado com os filtros atuais."));}
    else clear(list,...state.filtered.slice(start,start+per).map(c=>contractCard(c)));
    $("#contractCount").textContent=number(state.filtered.length)+" contratos nos filtros selecionados (catálogo do PNCP).";
    const pager=$("#contractPagination");clear(pager);
    if(pages>1){
      const prev=node("button","", "← Anterior"),next=node("button","","Próxima →");
      prev.type=next.type="button";prev.disabled=state.page===1;next.disabled=state.page===pages;
      prev.onclick=()=>{state.page--;renderContracts()};
      next.onclick=()=>{state.page++;renderContracts()};
      pager.append(prev,node("span","",state.page+" / "+pages),next);
    }
  }
  function showPncp(value){
    const notice=$("#pncpNotice"),summary=$("#contractOverview"),list=$("#contractList");
    state.pncp=value;
    if(value.status!=="verificado"){
      notice.className="finance-note finance-partial";
      notice.textContent="Coleta PNCP ainda não concluída ou homologada. Sem dados coletados não significa ausência de contratos: consulte o portal oficial.";
      clear(summary);clear(list,node("p","finance-empty","Não há uma fotografia anual íntegra e validada do PNCP neste repositório. Uma atualização automatizada será apresentada depois de concluída."));
      clear($("#worksList"),node("p","finance-empty","Sem contratos oficiais coletados para classificar objetos relacionados a obras. Consulte o TCE-RS e o PNCP."));
      $("#contractCount").textContent="Sem cobertura anual validada.";return;
    }
    const cnpjOk=value.cnpjOrgao==="88577416000118";
    if(!cnpjOk||!Array.isArray(value.contratos)||value.totalRegistros!==value.contratos.length)throw Error("Catálogo PNCP inconsistente.");
    const c=value.contratos;
    state.contracts=c;
    notice.className="finance-note";
    notice.textContent="Fonte PNCP · CNPJ 88.577.416/0001-18 · publicações de "+value.inicio+" até "+value.fim+". Fotografia coletada em "+value.coletadoEm.slice(0,10)+". Atenção: o catálogo não equivale à execução orçamentária.";
    clear(summary,
      metric("Contratos publicados",c.length,"Registros no catálogo "+value.cobertura+" (não total de licitações)."),
      metric("Soma dos valores informados",c.reduce((s,v)=>s+v.valor,0),"Soma de valores contratuais; não são despesas pagas."),
      metric("Objetos ligados a obras",c.filter(contractMatchesWork).length,"Identificação temática pelo texto contratual, não medição física.")
    );
    const obras=c.filter(contractMatchesWork).slice(0,6);
    clear($("#worksList"),...(obras.length?obras.map(c=>contractCard(c,true)):[node("p","finance-empty","Nenhum objeto com os termos de obras definidos no filtro do ano consultado.")]));
    $("#exportContracts").disabled=false;filterContracts();
  }
  function exportContracts(){
    const rows=[["id_pncp","publicacao","contrato","objeto","fornecedor","valor_brl","campo_valor","relacionado_obras","fonte"]];
    for(const c of state.filtered)rows.push([c.id,c.publicacao,c.numero,c.objeto,c.fornecedor,c.valor,c.valorOrigem,contractMatchesWork(c)?"SIM":"NAO",c.fonte]);
    download("canoas-contratos-pncp-"+state.pncp.cobertura+".csv",rows);
  }
  async function boot(){
    $("#periodSelect").onchange=(e)=>{
      const p=state.fiscal.periodos.find(v=>v.fim===e.target.value);
      if(p)selectFiscal(p);
    };
    $("#seriesYear").onchange=renderHistory;
    $("#exportFiscal").onclick=exportFiscal;
    $("#contractSearch").oninput=filterContracts;
    $("#contractScope").onchange=filterContracts;
    $("#contractOrder").onchange=filterContracts;
    $("#exportContracts").onclick=exportContracts;
    try{
      const finances=await data("data/financas-rreo.json");
      if(finances.ibge!=="4304606"||!Array.isArray(finances.periodos)||!finances.periodos.length)throw Error("Série financeira inválida");
      for(const p of finances.periodos)if(!(p.despesas.pagas<=p.despesas.liquidadas&&p.despesas.liquidadas<=p.despesas.empenhadas&&p.despesas.empenhadas<=p.despesas.dotacaoAtualizada))throw Error("Etapas de despesa inconsistentes");
      state.fiscal=finances;
      const periods=[...finances.periodos].sort((a,b)=>b.fim.localeCompare(a.fim));
      clear($("#periodSelect"),...periods.map(p=>{
        const option=node("option","",p.periodo);option.value=p.fim;return option;
      }));
      const yearClose=periods.find(p=>p.bimestre===6)||periods[0];
      const query=new URL(location.href).searchParams.get("periodo");
      const chosen=periods.find(p=>p.fim===query)||yearClose;
      $("#periodSelect").value=chosen.fim;selectFiscal(chosen);
      $("#seriesYear").value=String(chosen.ano);renderHistory();
    }catch(e){
      $("#periodNotice").textContent="Não foi possível carregar os relatórios fiscais: "+e.message;
    }
    try{showPncp(await data("data/contratos-pncp.json"))}
    catch(e){$("#pncpNotice").textContent="Não foi possível validar o catálogo PNCP: "+e.message}
  }
  document.addEventListener("DOMContentLoaded",boot);
})();