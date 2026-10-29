#!/usr/bin/env python3
"""Votos nominais por zona/seção de cada eleito de Canoas, TRE-RS 2024.

Somente registros com soma verificável versus a totalização municipal são publicados.
Não associa urnas a bairros ou endereços; seções não são geocodificadas.
"""
from __future__ import annotations
import html
import json
import pathlib
import re
import sys
import urllib.request
from datetime import datetime, timezone

ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
BASE="https://resultados.tre-rs.jus.br/eleicoes/2024"
ZONE=re.compile(r"\bZona\s+(\d{1,3})\s*\(\s*([\d.]+)\s+votos?\s*\)",re.I)
SECTION=re.compile(r"\b(\d{1,4})\s*\(\s*(\d{1,4})\s*\)")

def extract(source):
    """Extrai apenas cabeçalhos de zona e pares 'seção (votos)' verificáveis."""
    source=re.sub(r"(?is)<(?:script|style)\b.*?</(?:script|style)>"," ",source)
    clean=html.unescape(re.sub(r"(?s)<[^>]*>"," ",source))
    clean=re.sub(r"\s+"," ",clean)
    marks=list(ZONE.finditer(clean))
    result=[]
    for i,match in enumerate(marks):
        zone=int(match.group(1))
        declared=int(match.group(2).replace(".",""))
        end=marks[i+1].start() if i+1<len(marks) else len(clean)
        segment=clean[match.end():end]
        sections={}
        for sec,votes in SECTION.findall(segment):
            number=int(sec);value=int(votes)
            if number in sections:
                raise ValueError(f"Seção duplicada zona {zone}: {number}")
            sections[number]=value
        if not sections or sum(sections.values())!=declared:
            raise ValueError(f"Zona {zone}: soma inválida {sum(sections.values())} x {declared}")
        result.append({"zona":zone,"votos":declared,
                       "secoes":[{"secao":k,"votos":v} for k,v in sorted(sections.items())]})
    if len(result)<2 or len({x["zona"] for x in result})!=len(result):
        raise ValueError("Zonas ausentes ou repetidas")
    return result

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (Politicometro-Canoas; consulta publica TRE-RS)","Accept":"text/html"})
    with urllib.request.urlopen(req,timeout=22) as response:
        data=response.read(2_000_001)
    if len(data)>2_000_000:raise ValueError("Resposta maior que 2MB")
    return data.decode("utf-8",errors="replace")

def collect():
    elected=json.loads((DATA/"politicos.json").read_text(encoding="utf-8"))
    old=json.loads((DATA/"secoes-2024.json").read_text(encoding="utf-8"))
    verified={}
    failures=[]
    for person in elected:
        if person["cargo"]=="Vice-prefeito":
            continue
        role=11 if person["cargo"]=="Prefeito" else 13
        turn=620 if role==11 else 619
        number=person["numero"]
        url=f"{BASE}/{turn}/85898/cand_{role}_{number}.html"
        try:
            if not re.fullmatch(r"\d{2,5}",number):
                raise ValueError("Número eleitoral inválido")
            zones=extract(fetch(url))
            sum_votes=sum(z["votos"] for z in zones)
            if sum_votes!=person["votos"]:
                raise ValueError(f"Total {sum_votes} difere da eleição {person['votos']}")
            verified[person["id"]]={"turno":2 if role==11 else 1,
                                    "fonte":url,"total":sum_votes,"zonas":zones}
            print("TRE_OK",person["id"],sum_votes,len(zones),flush=True)
        except Exception as e:
            failures.append((person["id"],str(e)))
            print("TRE_FALHA",person["id"],str(e),flush=True)
    # Não substituir um snapshot com cobertura melhor por uma coleta parcial.
    previous=old.get("candidatos") or {}
    for person_id,value in previous.items():
        if person_id not in verified and person_id in {p["id"] for p in elected}:
            verified[person_id]=value
    if len(verified)<18:
        print("TRE_INSUFICIENTE",len(verified),"arquivos conservados")
        return
    result={"status":"verificado" if len(verified)==22 else "parcial",
            "municipioIbge":"4304606","referencia":"Eleições Municipais 2024",
            "coletadoEm":datetime.now(timezone.utc).isoformat(),
            "fonte":BASE+"/619/RS85898.html",
            "metodologia":"Soma das seções deve coincidir com votos nominais; não são coordenadas geográficas.",
            "candidatos":verified}
    path=DATA/"secoes-2024.json"
    tmp=path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    tmp.replace(path)
    print("TRE_CONCLUIDO",len(verified),"erros nesta tentativa",len(failures))

if __name__=="__main__":
    collect()
