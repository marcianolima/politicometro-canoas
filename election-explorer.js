"use strict";
(function(){
const $=s=>document.querySelector(s);
const el=(tag,attrs={},text="")=>{const node=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="class")node.className=v;else node.setAttribute(k,v)}node.textContent=text;return node};
const nf=new Intl.NumberFormat("pt-BR");
const z={mayor:null,people:null,sections:{},role:"pref1",candidate:"",zone:"all",page:1,order:"secao"};
const BASE="https://resultados.tre-rs.jus.br/eleicoes/2024/";
async function load(path){const r=await fetch(path,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);return r.json()}
function all(){
 if(!z.mayor||!z.people)return [];
 if(z.role==="pref1")return z.mayor.primeiroTurno.map(v=>({...v,cargo:"Prefeito",turno:1}));
 if(z.role==="pref2")return z.mayor.segundoTurno.map(v=>({...v,cargo:"Prefeito",turno:2}));
 return z.people.filter(v=>v.cargo==="Vereador").map(v=>({...v,turno:1}));
}
function voteUrl(c){
 const code=c.cargo==="Vereador"?"13":"11",turn=c.turno===2?"620":"619";
 return BASE+turn+"/85898/cand_"+code+"_"+encodeURIComponent(c.numero)+".html";
}
function selected(){return all().find(v=>v.id===z.candidate)}
function renderCandidates(){
 const list=all().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
 $("#electionCandidate").replaceChildren(...list.map(c=>{
  const opt=el("option",{value:c.id},c.nome+" · "+c.partido);return opt;
 }));
 const param=new URL(location.href).searchParams.get("candidate");
 if(param&&list.some(c=>c.id===param)){z.candidate=param;const url=new URL(location.href);url.searchParams.delete("candidate");history.replaceState(null,"",url.pathname+url.search+url.hash)}
 if(!list.some(c=>c.id===z.candidate))z.candidate=list[0]?.id||"";
 $("#electionCandidate").value=z.candidate;
 const total=list.reduce((s,c)=>s+c.votos,0);
 const max=Math.max(1,...list.map(c=>c.votos));
 const rows=list.map(c=>{
  const btn=el("button",{type:"button",class:"candidate-bar"+(z.candidate===c.id?" chosen":""),"data-candidate":c.id,"aria-label":"Selecionar "+c.nome+" para consultar seções"});
  const name=el("span",{class:"candidate-bar-label"},c.nome);
  const track=el("span",{class:"candidate-bar-track"});
  track.append(el("span",{class:"candidate-bar-fill",style:"width:"+(100*c.votos/max).toFixed(2)+"%"}));
  const value=el("strong",{},nf.format(c.votos)+" votos");
  btn.append(name,track,value);
  return btn;
 });
 $("#electionBars").replaceChildren(...rows);
 $("#barInfo").textContent=(z.role==="pref1"?"1º turno · prefeitura":z.role==="pref2"?"2º turno · prefeitura":"1º turno · vereadores eleitos")+" · "+nf.format(total)+" votos nas candidaturas exibidas. Não equivale necessariamente ao total de votos válidos da eleição.";
 $("#electionBars").querySelectorAll("[data-candidate]").forEach(button=>button.addEventListener("click",()=>{z.candidate=button.dataset.candidate;z.page=1;renderCandidates();renderSections()}));
 renderSections();
}
function renderSections(){
 const c=selected();if(!c)return;
 $("#electionSource").href=voteUrl(c);
 $("#candidateVoteTotal").textContent=nf.format(c.votos);
 $("#candidateVoteName").textContent=c.nome+" · "+c.partido;
 const item=z.sections?.candidatos?.[c.id];
 const status=$("#sectionStatus"),zones=$("#zones"),table=$("#sectionRows"),pagination=$("#sectionPager");
 zones.replaceChildren();table.replaceChildren();pagination.replaceChildren();
 const options=$("#zoneFilter");options.replaceChildren(el("option",{value:"all"},"Todas as zonas"));
 if(!item||!item.zonas?.length){
  status.textContent="Dados por seção ainda não materializados ou não validados. O resultado total é do TRE-RS; acesse a fonte oficial para consultar cada seção. A coleta automatizada será publicada apenas quando as somas forem conferidas.";
  $("#sectionTableWrap").hidden=true;$("#exportSections").disabled=true;
  return;
 }
 status.textContent="Seções verificadas contra o total oficial de "+nf.format(item.total)+" votos. Zonas e seções eleitorais não são polígonos de bairros.";
 item.zonas.sort((a,b)=>a.zona-b.zona);
 for(const zone of item.zonas){
  const stat=el("div",{class:"zone-stat"});
  stat.append(el("strong",{},"Zona "+zone.zona),el("span",{},nf.format(zone.votos)+" votos"),el("small",{},zone.secoes.length+" seções com votos"));
  zones.append(stat);options.append(el("option",{value:String(zone.zona)},"Zona "+zone.zona));
 }
 if(z.zone!=="all"&&!item.zonas.some(v=>String(v.zona)===z.zone))z.zone="all";
 options.value=z.zone;
 let entries=item.zonas.flatMap(v=>v.secoes.map(s=>({...s,zona:v.zona})));
 if(z.zone!=="all")entries=entries.filter(x=>String(x.zona)===z.zone);
 entries.sort(z.order==="votos"?(a,b)=>b.votos-a.votos||a.zona-b.zona||a.secao-b.secao:(a,b)=>a.zona-b.zona||a.secao-b.secao);
 $("#sectionTableWrap").hidden=false;$("#exportSections").disabled=false;
 const per=50,pages=Math.max(1,Math.ceil(entries.length/per));z.page=Math.max(1,Math.min(pages,z.page));
 const slice=entries.slice((z.page-1)*per,z.page*per);
 const max=Math.max(1,...entries.map(e=>e.votos));
 for(const row of slice){
  const tr=el("tr");
  tr.append(el("td",{},""+row.zona),el("td",{},""+row.secao));
  const td=el("td",{class:"vote-value"});
  const bar=el("span",{class:"mini-vote-bar",style:"width:"+(100*row.votos/max).toFixed(1)+"%"});
  td.append(bar,el("strong",{},nf.format(row.votos)));tr.append(td);table.append(tr);
 }
 pagination.append(el("span",{},"Mostrando "+slice.length+" de "+nf.format(entries.length)+" seções"));
 const prev=el("button",{type:"button"},"← Anterior");prev.disabled=z.page===1;prev.onclick=()=>{z.page--;renderSections()};
 const next=el("button",{type:"button"},"Próxima →");next.disabled=z.page===pages;next.onclick=()=>{z.page++;renderSections()};
 pagination.append(prev,el("strong",{},z.page+" / "+pages),next);
}
function exportSections(){
 const person=selected(),item=z.sections?.candidatos?.[person?.id];
 if(!person||!item)return;
 const rows=[["municipio_ibge","eleicao","turno","cargo","candidato","partido","numero","zona","secao","votos","fonte"]];
 for(const zone of item.zonas)for(const s of zone.secoes)if(z.zone==="all"||String(zone.zona)===z.zone)rows.push(["4304606",2024,person.turno,person.cargo,person.nome,person.partido,person.numero,zone.zona,s.secao,s.votos,item.fonte]);
 const csv="\ufeff"+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=el("a");
 a.href=url;a.download="canoas-2024-secoes-"+person.id+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function boot(){
 const root=$("#analise-eleitoral");if(!root)return;
 $("#electionGroup").addEventListener("change",e=>{z.role=e.target.value;z.candidate="";z.zone="all";z.page=1;renderCandidates()});
 $("#electionCandidate").addEventListener("change",e=>{z.candidate=e.target.value;z.zone="all";z.page=1;renderCandidates()});
 $("#zoneFilter").addEventListener("change",e=>{z.zone=e.target.value;z.page=1;renderSections()});
 $("#orderSections").addEventListener("change",e=>{z.order=e.target.value;z.page=1;renderSections()});
 $("#exportSections").addEventListener("click",exportSections);
 try{
  const [major,people,sections]=await Promise.all([load("data/prefeito-2024.json"),load("data/politicos.json"),load("data/secoes-2024.json")]);
  if(major.municipioIbge!=="4304606"||!Array.isArray(people)||people.length!==23||sections.municipioIbge!=="4304606")throw Error("Dados não pertencem a Canoas");
  z.mayor=major;z.people=people;z.sections=sections;renderCandidates();
 }catch(error){$("#sectionStatus").textContent="Erro ao carregar os dados eleitorais: "+error.message}
}
document.addEventListener("DOMContentLoaded",boot);
})();
