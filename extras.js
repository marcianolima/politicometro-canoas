"use strict";
(function(){
 const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g,"");
 async function load(path){const response=await fetch(path,{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);return response.json()}
 async function council(){
  const node=document.querySelector("#currentCouncil");if(!node)return;
  try{
   const snapshot=await load("data/composicao-camara.json");
   if(snapshot.municipioIbge!=="4304606"||!Array.isArray(snapshot.vereadores)||snapshot.vereadores.length!==21)throw Error("Fotografia institucional não validada");
   node.innerHTML=snapshot.vereadores.map(name=>{
    const note="Relação institucional consultada";
    return '<div class="council-member"><span class="roster-dot" aria-hidden="true"></span><span><strong>'+escape(name)+'</strong><small>'+escape(note)+'</small></span></div>'
   }).join("");
  }catch(error){node.innerHTML='<p class="roster-error">Composição institucional indisponível. Consulte a relação diretamente na Câmara.</p>'}
 }
 async function senate(){
  const node=document.querySelector("#senators");if(!node)return;
  try{
   const snapshot=await load("data/senadores-rs.json");
   if(snapshot.uf!=="RS"||!Array.isArray(snapshot.senadores)||snapshot.senadores.length!==3)throw Error("Bancada incompleta");
   node.innerHTML=snapshot.senadores.map(s=>'<article class="senator-card"><div class="senator-avatar" aria-hidden="true">◎</div><p class="senator-label">SENADO FEDERAL · RS</p><h3>'+escape(s.nome)+'</h3><div class="senator-badges"><span>'+escape(s.partido)+'</span><span>'+escape(s.mandato)+'</span></div><a href="'+escape(s.perfil||"https://www.congressonacional.leg.br/web/senadores/em-exercicio")+'" target="_blank" rel="noopener noreferrer">Ver perfil no Senado ↗</a></article>').join("");
  }catch(error){node.innerHTML='<div class="roster-error">Bancada não carregada. Consulte o site do Senado Federal.</div>'}
 }
 document.addEventListener("DOMContentLoaded",()=>{council();senate()});
})();
