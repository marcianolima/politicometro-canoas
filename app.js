"use strict";
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const numeral=new Intl.NumberFormat("pt-BR");
const currency=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const clean=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
const number=v=>v===null||v===undefined?"Não disponível":numeral.format(v);
const state={people:[],election:null,tse:{},filter:"todos",party:"",search:"",deputies:[],opened:null,tab:"resumo",previousFocus:null};
const chamber="https://dadosabertos.camara.leg.br/api/v2";
async function json(url){const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);return response.json()}
const initials=name=>String(name||"").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toLocaleUpperCase("pt-BR");
function filtered(){
 return state.people.filter(p=>(state.filter==="todos"||(state.filter==="executivo"?p.cargo!=="Vereador":p.cargo==="Vereador"))&&(!state.party||p.partido===state.party)&&clean(p.nome+" "+p.nomeCompleto).includes(clean(state.search))).sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
}
function renderPeople(){
 const rows=filtered();$("#resultsCount").textContent=rows.length+" representantes encontrados";
 $("#people").innerHTML=rows.length?rows.map(p=>'<button type="button" class="person-card" data-person="'+esc(p.id)+'" aria-label="Abrir ficha de '+esc(p.nome)+'"><div class="person-top"><div class="avatar">'+esc(initials(p.nome))+'</div><div><h3>'+esc(p.nome)+'</h3><p>'+esc(p.cargo)+' · '+esc(p.partido)+'</p></div></div><div class="person-bottom"><span class="tag">ELEITO EM 2024</span><small>'+(p.votos===null?"Voto na chapa":number(p.votos)+" votos")+'</small><span class="round-arrow" aria-hidden="true">↗</span></div></button>').join(""):'<div class="empty"><strong>Nenhum representante encontrado.</strong><p>Experimente outro nome, partido ou cargo.</p></div>';
 $$("[data-person]",$("#people")).forEach(button=>button.addEventListener("click",()=>openProfile(button.dataset.person,"municipal")));
}
function changeRole(role){state.filter=role;$$("[data-role]").forEach(b=>{const active=b.dataset.role===role;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active))});renderPeople()}
function exportCsv(){
 const header=["Nome","Nome completo","Cargo","Partido","Número","Votos nominais","Turno","Ano","Observação"];
 const records=[header,...filtered().map(p=>[p.nome,p.nomeCompleto,p.cargo,p.partido,p.numero,p.votos===null?"":p.votos,p.turno,p.ano,p.situacao])];
 const content="\ufeff"+records.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="politicometro-canoas-eleitos-2024.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function projected(geo){
 const features=geo.type==="FeatureCollection"?geo.features:geo.type==="Feature"?[geo]:[];
 const rings=[];let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
 for(const f of features){
  const g=f.geometry;if(!g)continue;const polygons=g.type==="Polygon"?[g.coordinates]:g.type==="MultiPolygon"?g.coordinates:[];
  for(const polygon of polygons)for(const ring of polygon){if(!Array.isArray(ring)||ring.length<3)continue;rings.push(ring);for(const v of ring){const [x,y]=v;if(!Number.isFinite(x)||!Number.isFinite(y))throw Error("Coordenadas inválidas");minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)}}
 }
 if(!rings.length||minx< -52||maxx> -50||miny< -31||maxy> -29||minx>=maxx||miny>=maxy)throw Error("O contorno não corresponde a Canoas");
 return (width,height)=>{
  const cosine=Math.cos((miny+maxy)/2*Math.PI/180);
  const scale=Math.min((width-75)/((maxx-minx)*cosine),(height-55)/(maxy-miny));
  const sw=(maxx-minx)*cosine*scale,sh=(maxy-miny)*scale,x0=(width-sw)/2,y0=(height-sh)/2;
  return rings.map(r=>r.map(([x,y],i)=>(i?"L":"M")+(x0+(x-minx)*cosine*scale).toFixed(2)+","+(y0+(maxy-y)*scale).toFixed(2)).join("")+"Z").join("");
 };
}
async function map(){
 try{
  const g=await json("data/canoas.geojson"),shape=projected(g);
  $("#cityMap").innerHTML='<defs><pattern id="lines" width="27" height="27" patternUnits="userSpaceOnUse"><path d="M27 0H0V27" fill="none" stroke="#e6ede7"/></pattern></defs><rect width="520" height="360" fill="url(#lines)"/><path d="'+shape(520,360)+'" fill="#aed8bd" stroke="#287050" stroke-width="2.5" fill-rule="evenodd"/>';
  $("#heroMap").innerHTML='<path d="'+shape(420,360)+'" fill="#b6e6bf" fill-opacity=".86" stroke="#ecffed" stroke-width="2" fill-rule="evenodd"/>';
  $("#mapStatus").textContent=g.metadata?.qualidade==="oficial"?"Malha oficial IBGE (WGS84) coletada em "+(g.metadata.coletadoEm||"data não registrada")+".":"Geometria ilustrativa muito simplificada do projeto WebGIS Empreender. O workflow substitui-a pela malha oficial IBGE no site publicado.";
 }catch(e){$("#mapStatus").textContent="Não foi possível carregar a malha: "+e.message;$("#cityMap").innerHTML='<text x="45" y="160" fill="#718271">Malha municipal indisponível</text>'}
}
function sourceLinks(p){
 return '<div class="profile-sources"><strong>Fontes oficiais e conferência</strong><a href="https://resultados.tre-rs.jus.br/eleicoes/2024/'+(p.cargo==="Vereador"?"619":"620")+'/RS85898.html" target="_blank" rel="noopener noreferrer">TRE-RS: resultados de 2024 ↗</a><a href="https://dadosabertos.tse.jus.br/dataset/candidatos-2024" target="_blank" rel="noopener noreferrer">TSE: candidaturas e bens declarados ↗</a><a href="https://camaracanoas.rs.gov.br/" target="_blank" rel="noopener noreferrer">Câmara Municipal: mandatos e atividades ↗</a></div>';
}
function detailGrid(p){
 const data=[["Cargo da eleição",p.cargo],["Partido da eleição",p.partido],["Número",p.numero||"Não registrado"],["Votos",p.cargo==="Vice-prefeito"?"Votação da chapa":number(p.votos)],["Turno",String(p.turno)+"º"],["Mandato previsto","2025–2028"]];
 return '<dl class="detail-grid">'+data.map(([key,value])=>'<div><dt>'+esc(key)+'</dt><dd>'+esc(value)+'</dd></div>').join("")+'</dl>';
}
const unavailable="O indicador individual não está disponível nesta base. A falta de dados publicados não deve ser interpretada como zero, como ausência ou como inexistência de atividade.";
function municipalTab(p,tab){
 const v=state.tse?.candidatos?.[p.id];
 if(tab==="resumo")return '<div class="profile-panel">'+detailGrid(p)+'<h3>Sobre a candidatura</h3><p>'+esc(p.nomeCompleto)+' integra a lista de eleitos de Canoas em 2024. A situação efetiva em exercício depende de validação junto à Câmara ou à Prefeitura.</p>'+sourceLinks(p)+'</div>';
 if(tab==="eleicao")return '<div class="profile-panel">'+detailGrid(p)+'<h3>Como interpretar os votos</h3><p>Vereadores: votos nominais do 1º turno. Prefeito: votos do 2º turno. Vice-prefeito: eleito na mesma chapa majoritária, sem votos individualizados.</p>'+sourceLinks(p)+'</div>';
 if(tab==="bens"){
  let content='<div class="unavailable">'+unavailable+' Não é possível inferir bens inexistentes a partir de uma declaração ausente.</div>';
  if(v?.bensStatus==="declarados"&&Number.isFinite(v.totalBens))content='<dl class="detail-grid"><div><dt>Total nominal de bens declarados em 2024</dt><dd>'+esc(currency.format(v.totalBens))+'</dd></div><div><dt>Itens de bens declarados</dt><dd>'+esc(number(v.itensBens))+'</dd></div></dl><p>Montante autodeclarado na candidatura ao TSE; não corresponde ao valor de mercado ou ao patrimônio atual. Descrições e endereços não são reproduzidos.</p>';
  if(v?.bensStatus==="sem_itens")content='<div class="unavailable">Não foram localizados itens de bens para esta candidatura no arquivo analisado do TSE; isso não significa ausência de patrimônio.</div>';
  return '<div class="profile-panel"><h3>Bens declarados</h3>'+content+sourceLinks(p)+'</div>';
 }
 const labels={presenca:"Presença registrada em sessões",votacoes:"Votações nominais",proposicoes:"Proposições legislativas",gastos:"Gastos e cota parlamentar"};
 return '<div class="profile-panel"><h3>'+labels[tab]+'</h3><div class="unavailable">'+unavailable+'</div><p>As informações de mandatos municipais exigem base identificada e verificável de sessões, votos e despesas. Não cruzamos homônimos por aproximação nem consideramos falta de lista como ausência.</p>'+sourceLinks(p)+'</div>';
}
function federalTab(p,tab){
 const id=encodeURIComponent(p.id);
 if(tab==="resumo")return '<div class="profile-panel"><dl class="detail-grid"><div><dt>Cargo</dt><dd>Deputado federal</dd></div><div><dt>Unidade federativa</dt><dd>RS</dd></div><div><dt>Partido informado pela Câmara</dt><dd>'+esc(p.siglaPartido)+'</dd></div><div><dt>Consulta</dt><dd>API oficial, ao vivo</dd></div></dl><p>Este cadastro representa a bancada federal do RS, e não apenas candidatos votados em Canoas.</p><div class="profile-sources"><a target="_blank" rel="noopener noreferrer" href="https://www.camara.leg.br/deputados/'+id+'">Perfil oficial na Câmara ↗</a></div></div>';
 if(tab==="presenca")return '<div class="profile-panel"><h3>Presença em sessões deliberativas</h3><div class="unavailable">Não disponível aqui: exige conciliação das sessões encerradas com o período efetivo de exercício do deputado, inclusive afastamentos e licenças. Não é inferida por participação em votações.</div></div>';
 const title=tab==="gastos"?"Lançamentos de despesas da cota":"Proposições de autoria";
 const path=chamber+"/deputados/"+id+"/"+(tab==="gastos"?"despesas?ano=2026&itens=30":"proposicoes?itens=30");
 return '<div class="profile-panel"><h3>'+title+'</h3><div id="federalRecords" class="unavailable">Consultando registros oficiais...</div><p class="fine">Somente a primeira página de registros da API. Isto não é soma de despesas, produção total do mandato nem ranking.</p><div class="profile-sources"><a href="'+path+'" target="_blank" rel="noopener noreferrer">Ver resposta da API ↗</a></div></div>';
}
function showProfile(){
 if(!state.opened)return;const {p,kind}=state.opened;const federal=kind==="federal";
 const tabs=federal?[["resumo","Resumo"],["proposicoes","Proposições"],["gastos","Despesas"],["presenca","Presença"]]:[["resumo","Resumo"],["eleicao","Eleição"],["bens","Bens"],["presenca","Presença"],["votacoes","Votações"],["proposicoes","Projetos"],["gastos","Gastos"]];
 $("#profile").innerHTML='<p class="overline dark">PERFIL PÚBLICO · '+(federal?"CÂMARA FEDERAL":"CANOAS / RS")+'</p><div class="avatar profile-avatar">'+esc(initials(p.nome))+'</div><h2 class="profile-title" id="profileTitle">'+esc(p.nome)+'</h2><p class="profile-caption">'+esc(federal?"Deputado federal · RS · "+p.siglaPartido:p.cargo+" · "+p.partido)+'</p>'+(federal?'':'<p class="profile-alert">Registro de eleito em 2024, não certificação de exercício atual. A cadeira pode ter sido alterada por suplência ou afastamento.</p>')+'<div class="profile-tabs" role="tablist">'+tabs.map(([id,label])=>'<button type="button" role="tab" data-tab="'+id+'" aria-selected="'+String(state.tab===id)+'" class="'+(state.tab===id?"selected":"")+'">'+label+'</button>').join("")+'</div><div id="profileTab">'+(federal?federalTab(p,state.tab):municipalTab(p,state.tab))+'</div><div class="profile-actions"><button type="button" id="copyProfile">Copiar link desta ficha</button></div>';
 $$("[data-tab]",$("#profile")).forEach(button=>button.addEventListener("click",()=>{state.tab=button.dataset.tab;showProfile();if(federal&&(state.tab==="proposicoes"||state.tab==="gastos"))loadFederalDetails(p,state.tab)}));
 $("#copyProfile").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);$("#copyProfile").textContent="Link copiado"}catch{$("#copyProfile").textContent="Copie o endereço na barra do navegador"}});
}
function openProfile(id,kind,updateUrl=true){
 const p=kind==="federal"?state.deputies.find(x=>String(x.id)===String(id)):state.people.find(x=>x.id===id);if(!p)return;
 state.previousFocus=document.activeElement;state.opened={p,kind};state.tab="resumo";
 if(updateUrl){const u=new URL(location.href);u.searchParams.set("p",kind==="federal"?"dep-"+id:id);history.pushState(null,"",u.pathname+u.search+u.hash)}
 showProfile();$("#modal").hidden=false;document.body.style.overflow="hidden";$("#closeModal").focus();
}
function closeProfile(updateUrl=true){
 $("#modal").hidden=true;document.body.style.overflow="";state.opened=null;
 if(updateUrl){const u=new URL(location.href);u.searchParams.delete("p");history.replaceState(null,"",u.pathname+u.search+u.hash)}
 if(state.previousFocus&&document.contains(state.previousFocus))state.previousFocus.focus();
}
async function loadFederalDetails(p,tab){
 const target=$("#federalRecords");if(!target)return;
 const path=chamber+"/deputados/"+encodeURIComponent(p.id)+"/"+(tab==="gastos"?"despesas?ano=2026&itens=30":"proposicoes?itens=30");
 try{const response=await json(path);if(!state.opened||state.opened.p.id!==p.id||state.tab!==tab)return;
 const records=Array.isArray(response.dados)?response.dados:[];
 target.className="";target.innerHTML=records.length?records.slice(0,25).map(v=>'<div class="record"><strong>'+esc(tab==="gastos"?(v.tipoDespesa||"Despesa"):(v.siglaTipo||"Proposição")+" "+(v.numero||"")+"/"+(v.ano||""))+'</strong><span>'+esc(tab==="gastos"?(v.nomeFornecedor||"Fornecedor não informado")+(typeof v.valorDocumento==="number"?" · "+currency.format(v.valorDocumento):""):(v.ementa||"Ementa não informada"))+'</span></div>').join(""):'<div class="unavailable">A API não retornou registros para os parâmetros desta consulta.</div>';
 }catch(e){if($("#federalRecords"))$("#federalRecords").textContent="Consulta indisponível no momento: "+e.message}
}
async function loadDeputies(){
 const b=$("#loadDeputies");b.disabled=true;$("#deputiesStatus").textContent="Consultando a Câmara dos Deputados...";
 try{const data=await json(chamber+"/deputados?siglaUf=RS&ordem=ASC&ordenarPor=nome&itens=100");
 if(!Array.isArray(data.dados))throw Error("Formato de resposta inesperado");
 state.deputies=data.dados.filter(p=>p.id&&p.nome&&p.siglaUf==="RS").sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
 $("#deputiesStatus").textContent=state.deputies.length+" deputados retornados pela API oficial. Consultado em "+new Date().toLocaleDateString("pt-BR")+".";
 $("#deputies").innerHTML=state.deputies.map(p=>'<button type="button" class="deputy-row" data-deputy="'+esc(p.id)+'"><span><strong>'+esc(p.nome)+'</strong><small>'+esc(p.siglaPartido)+' · RS</small></span><span aria-hidden="true">↗</span></button>').join("");
 $$("[data-deputy]",$("#deputies")).forEach(el=>el.addEventListener("click",()=>openProfile(el.dataset.deputy,"federal")));
 const direct=new URL(location.href).searchParams.get("p");if(direct?.startsWith("dep-"))openProfile(direct.substring(4),"federal",false);
 }catch(e){$("#deputiesStatus").textContent="Falha na consulta ao vivo: "+e.message;$("#deputies").innerHTML='<div class="federal-empty"><strong>API indisponível agora</strong><p>Consulte a lista diretamente na Câmara.</p><a href="https://www.camara.leg.br/deputados/quem-sao" target="_blank" rel="noopener noreferrer">Abrir portal oficial ↗</a></div>'}
 finally{b.disabled=false;b.textContent="Atualizar lista do RS ↻"}
}
function focusTrap(e){
 if($("#modal").hidden||e.key!=="Tab")return;
 const focusables=$$('button:not([disabled]),a[href],input,select,[tabindex="0"]',$("#modal")).filter(el=>el.getClientRects().length);
 if(!focusables.length)return;
 if(e.shiftKey&&document.activeElement===focusables[0]){e.preventDefault();focusables.at(-1).focus()}
 else if(!e.shiftKey&&document.activeElement===focusables.at(-1)){e.preventDefault();focusables[0].focus()}
}
async function boot(){
 $("#search").addEventListener("input",e=>{state.search=e.target.value;renderPeople()});
 $("#party").addEventListener("change",e=>{state.party=e.target.value;renderPeople()});
 $$("[data-role]").forEach(b=>b.addEventListener("click",()=>changeRole(b.dataset.role)));
 $("#export").addEventListener("click",exportCsv);$("#loadDeputies").addEventListener("click",loadDeputies);
 $("#closeModal").addEventListener("click",()=>closeProfile());$("[data-dismiss]").addEventListener("click",()=>closeProfile());
 window.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#modal").hidden)closeProfile();focusTrap(e)});
 window.addEventListener("popstate",()=>{const id=new URL(location.href).searchParams.get("p");if(!id&&!$("#modal").hidden)closeProfile(false)});
 map();
 try{
  const [list,election]=await Promise.all([json("data/politicos.json"),json("data/eleicoes.json")]);
  if(!Array.isArray(list)||list.length!==23||list.filter(p=>p.cargo==="Vereador").length!==21||election.ibge!=="4304606")throw Error("Base municipal incompleta");
  state.people=list;state.election=election;
  const parties=[...new Set(list.map(x=>x.partido))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  $("#party").innerHTML='<option value="">Todos os partidos</option>'+parties.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  changeRole("todos");
  const direct=new URL(location.href).searchParams.get("p");if(direct&&!direct.startsWith("dep-"))openProfile(direct,"municipal",false);
 }catch(e){$("#resultsCount").textContent="Não foi possível carregar a base eleitoral";$("#people").innerHTML='<div class="empty">Erro na base: '+esc(e.message)+'</div>'}
 try{const tse=await json("data/tse-2024.json");state.tse=tse;$("#freshness").textContent=tse.status==="verificado"?"TSE conciliado em "+new Date(tse.coletadoEm).toLocaleDateString("pt-BR")+" ("+Object.keys(tse.candidatos||{}).length+" fichas).":"Enriquecimento TSE pendente; a base de resultados eleitorais permanece consultável."}catch{$("#freshness").textContent="Enriquecimento TSE indisponível."}
}
document.addEventListener("DOMContentLoaded",boot);
