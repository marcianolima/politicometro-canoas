#!/usr/bin/env python3
"""Consulta pública PNCP por data de publicação de contrato de Canoas.

Dados de contratação NÃO são despesa empenhada, liquidada, paga ou obra entregue.
Só substitui arquivo após concluir TODAS as páginas e janelas requeridas.
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import logging
import os
import pathlib
import re
import tempfile
import time
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation

ROOT=pathlib.Path(__file__).resolve().parents[1]
FILE=ROOT/"data"/"contratos-pncp.json"
API="https://pncp.gov.br/api/consulta/v1/contratos"
CNPJ="88577416000118"
IBGE="4304606"
LOG=logging.getLogger("pncp")
YEAR=int(os.environ.get("PNCP_YEAR",str(dt.datetime.now(dt.timezone.utc).year)))
MAX_PAGES=100
PAGE_SIZE=100

def money(x):
    if x is None or isinstance(x,bool): return None
    try:
        v=Decimal(str(x))
        return round(float(v),2) if v.is_finite() and v>=0 and v<10**13 else None
    except (InvalidOperation,ValueError,OverflowError):return None

def clean(x,n=500):
    return re.sub(r"\s+"," ",str(x or "")).strip()[:n]

def pubdate(s):
    if not s:return None
    txt=str(s)
    return txt[:10] if re.fullmatch(r"\d{4}-\d{2}-\d{2}",txt[:10]) else None

def extract(record):
    """Aceita apenas contratos com CNPJ público municipal exato."""
    org=record.get("orgaoEntidade") or {}
    org_cnpj=re.sub(r"\D","",str(org.get("cnpj") or record.get("cnpjOrgao") or ""))
    if org_cnpj!=CNPJ:raise ValueError("CNPJ diferente do Município de Canoas")
    token=clean(record.get("numeroControlePNCP"),110)
    if not re.fullmatch(r"[0-9]{14}-[0-9]{1,6}-[0-9]{1,6}/[0-9]{4}",token):
        raise ValueError("Identificador PNCP ausente ou inesperado")
    year=record.get("anoContrato")
    seq=record.get("sequencialContrato")
    value=money(record.get("valorGlobal"))
    if value is None:value=money(record.get("valorInicial"))
    if value is None:raise ValueError("Contrato sem valor global ou inicial numérico")
    obj=clean(record.get("objetoContrato"),1200)
    if not obj:raise ValueError("Objeto contratual vazio")
    provider=clean(record.get("nomeRazaoSocialFornecedor"),200)
    pncp_match=re.fullmatch(r"([0-9]{14})-([0-9]{1,6})-([0-9]{1,6})/([0-9]{4})",token)
    pncp_year=int(pncp_match.group(4))
    pncp_seq=int(pncp_match.group(3))
    url=f"https://pncp.gov.br/api/consulta/v1/orgaos/{CNPJ}/contratos/{pncp_year}/{pncp_seq}"
    return {"id":token,"ano":year,"sequencial":seq,
            "numero":clean(record.get("numeroContratoEmpenho"),70),
            "objeto":obj,"valor":value,
            "valorOrigem":"valorGlobal" if money(record.get("valorGlobal")) is not None else "valorInicial",
            "fornecedor":provider,"publicacao":pubdate(record.get("dataPublicacaoPncp")),
            "assinatura":pubdate(record.get("dataAssinatura")),
            "vigenciaInicio":pubdate(record.get("dataVigenciaInicio")),
            "vigenciaFim":pubdate(record.get("dataVigenciaFim")),
            "fonte":url}

def fetch_json(params):
    query=urllib.parse.urlencode(params)
    req=urllib.request.Request(API+"?"+query,headers={
        "Accept":"application/json","User-Agent":"PoliticometroCanoas/1.1 (observatorio dados publicos)"})
    with urllib.request.urlopen(req,timeout=35) as res:
        body=res.read(8_000_001)
    if len(body)>8_000_000:raise ValueError("Página PNCP ultrapassa limite")
    return json.loads(body.decode("utf-8"))

def month_window(year,month):
    first=dt.date(year,month,1)
    last=dt.date(year,month,calendar.monthrange(year,month)[1])
    today=dt.datetime.now(dt.timezone.utc).date()
    if first>today:return None
    return first,min(last,today)

def collect(year=YEAR):
    today=dt.datetime.now(dt.timezone.utc).date()
    if year<2021 or year>today.year:raise ValueError("Ano inválido")
    contracts={}
    windows=0
    for month in range(1,13):
        dates=month_window(year,month)
        if not dates:break
        first,last=dates
        for page in range(1,MAX_PAGES+1):
            payload=fetch_json({"dataInicial":first.strftime("%Y%m%d"),
                                "dataFinal":last.strftime("%Y%m%d"),
                                "cnpjOrgao":CNPJ,"pagina":page,"tamanhoPagina":PAGE_SIZE})
            if not isinstance(payload,dict) or not isinstance(payload.get("data"),list):
                raise ValueError(f"PNCP sem campo data verificável: {year}/{month}/{page}")
            entries=payload["data"]
            for item in entries:
                c=extract(item)
                contracts[c["id"]]=c
            pages=payload.get("totalPaginas")
            # Tamanho menor que página significa fim, a menos que haja totalPaginas confiável.
            if pages is not None:
                if int(pages)>MAX_PAGES:raise ValueError("Excesso de páginas; cobertura não verificada")
                done=page>=int(pages)
            else:
                done=len(entries)<PAGE_SIZE
            if done:break
            time.sleep(.35)
        else:
            raise ValueError("Paginação PNCP excede limite de segurança")
        windows+=1
        LOG.info("PNCP %s-%02d: %s registros acumulados",year,month,len(contracts))
        time.sleep(.35)
    if windows<1:raise ValueError("Nenhum mês consultado")
    output={"status":"verificado","cnpjOrgao":CNPJ,"municipio":"Canoas","ibge":IBGE,
            "inicio":f"{year}-01-01","fim":min(today,dt.date(year,12,31)).isoformat(),
            "coletadoEm":dt.datetime.now(dt.timezone.utc).isoformat(),
            "cobertura":str(year),"fonte":"https://pncp.gov.br/api/consulta/swagger-ui/index.html",
            "totalRegistros":len(contracts),
            "contratos":sorted(contracts.values(),key=lambda x:(x.get("publicacao") or "",x["id"]),reverse=True),
            "observacao":"Contratos publicados no PNCP pelo CNPJ do Município; valor contratual não é gasto pago nem obra entregue. Pode não incluir entidades municipais com outros CNPJs, contratações ainda não publicadas ou registros fora do ano."}
    FILE.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w",dir=FILE.parent,prefix=".pncp-",
                                     suffix=".json",delete=False,encoding="utf-8") as file:
        json.dump(output,file,ensure_ascii=False,separators=(",",":"))
        file.write("\n")
        temporary=pathlib.Path(file.name)
    temporary.replace(FILE)
    LOG.info("PNCP confirmado %s: %s contratos",year,len(contracts))
    return output

if __name__=="__main__":
    logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")
    try:collect()
    except Exception as e:
        LOG.warning("Falha de coleta, fotografia anterior preservada: %s",e)
