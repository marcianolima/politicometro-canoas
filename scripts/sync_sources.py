#!/usr/bin/env python3
"""Atualiza malha IBGE e perfis TSE para o Politicômetro Canoas.

Coleta best effort; dados previamente validados não são apagados em falhas externas.
Nenhuma identificação por CPF ou fuzzy matching e nenhuma descrição de bens é publicada.
"""
from __future__ import annotations

import csv
import datetime as dt
import decimal
import io
import json
import logging
import pathlib
import re
import tempfile
import unicodedata
import urllib.parse
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
IBGE = "4304606"
TSE_MUN = "85898"
API = "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2024"
MALHA = (
    "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/4304606?"
    "formato=application/vnd.geo%2Bjson&qualidade=maxima"
)
LOG = logging.getLogger("politicometro")

def request(url: str, timeout: int = 120):
    req = urllib.request.Request(
        url, headers={"User-Agent": "PoliticometroCanoas/1.0 (public-data-observatory)",
                      "Accept": "application/json, application/zip, */*"}
    )
    return urllib.request.urlopen(req, timeout=timeout)

def now():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()

def atomic_json(filename: str, payload):
    destination = DATA / filename
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                                     dir=DATA, prefix=".sync-", suffix=".json",
                                     delete=False) as tmp:
        json.dump(payload, tmp, ensure_ascii=False, separators=(",", ":"))
        tmp.write("\n")
        source = pathlib.Path(tmp.name)
    source.replace(destination)

def normalize(text):
    return "".join(c for c in unicodedata.normalize("NFD", str(text or ""))
                   if unicodedata.category(c) != "Mn").upper().strip()

def resolve_geo():
    with request(MALHA, 45) as r:
        raw = r.read(5_000_001)
    if len(raw) > 5_000_000:
        raise ValueError("Malha IBGE maior do que 5 MB")
    value = json.loads(raw.decode("utf-8"))
    features = value.get("features", []) if value.get("type") == "FeatureCollection" else (
        [value] if value.get("type") == "Feature" else []
    )
    if not features:
        raise ValueError("IBGE não retornou feições GeoJSON")
    coords = []
    for feature in features:
        geom = feature.get("geometry") or {}
        if geom.get("type") == "Polygon":
            polygons = [geom["coordinates"]]
        elif geom.get("type") == "MultiPolygon":
            polygons = geom["coordinates"]
        else:
            raise ValueError("Tipo de geometria não suportado pelo mapa")
        for poly in polygons:
            for ring in poly:
                for vertex in ring:
                    coords.append(vertex[:2])
    if len(coords) < 12:
        raise ValueError("Geometria oficial estranhamente simplificada")
    xs = [xy[0] for xy in coords]
    ys = [xy[1] for xy in coords]
    if not (-52 < min(xs) < max(xs) < -50 and -31 < min(ys) < max(ys) < -29):
        raise ValueError("Malha fora do entorno de Canoas")
    if not (-51.7 < min(xs) and max(xs) < -50.7 and -30.4 < min(ys) and max(ys) < -29.5):
        raise ValueError("Limites de Canoas fora de envelope esperado")
    for feature in features:
        props = feature.setdefault("properties", {})
        code = str(props.get("codarea") or props.get("CD_MUN") or props.get("codigo") or IBGE)
        if code != IBGE:
            raise ValueError("Geometria de município diferente: " + code)
        props["codarea"] = IBGE
    value["metadata"] = {"qualidade": "oficial", "fonte": MALHA, "coletadoEm": now(),
                         "municipioIbge": IBGE, "crs": "EPSG:4326"}
    atomic_json("canoas.geojson", value)
    LOG.info("IBGE: %s vertices carregados", len(coords))

def download_resource(url, dest):
    if not url.startswith("https://"):
        raise ValueError("Recurso TSE sem HTTPS")
    with request(url, 180) as r, open(dest, "wb") as out:
        size = 0
        while chunk := r.read(1024 * 1024):
            size += len(chunk)
            if size > 180 * 1024 * 1024:
                raise ValueError("Arquivo excede 180 MB")
            out.write(chunk)
    if not zipfile.is_zipfile(dest):
        raise ValueError("Recurso TSE não é ZIP")
    LOG.info("TSE: obtido ZIP %.1f MB", size / 1024 / 1024)

def find_resource(resources, prefix):
    for res in resources:
        texts = " ".join(str(res.get(k) or "") for k in ("name", "url", "description")).lower()
        if prefix + "_2024.zip" in texts:
            return res["url"]
    raise ValueError("Recurso TSE não localizado: " + prefix)

def table_rows(zip_path, prefix):
    with zipfile.ZipFile(zip_path) as archive:
        matches = [name for name in archive.namelist()
                   if re.search(r"(?:^|/)"+re.escape(prefix)+r"_2024_rs\.csv$", name.lower())]
        if len(matches) != 1:
            raise ValueError("CSV RS ausente ou ambíguo no ZIP: " + prefix)
        with archive.open(matches[0]) as binary:
            text = io.TextIOWrapper(binary, encoding="latin-1", newline="", errors="replace")
            reader = csv.DictReader(text, delimiter=";", quotechar='"')
            if not reader.fieldnames or "SQ_CANDIDATO" not in reader.fieldnames:
                raise ValueError("Esquema de CSV inesperado: " + prefix)
            for row in reader:
                yield row

def asset_decimal(value):
    original = str(value or "").strip().replace(".", "").replace(",", ".")
    try:
        amount = decimal.Decimal(original)
        return amount if amount.is_finite() and amount >= 0 else None
    except decimal.InvalidOperation:
        return None

def candidates():
    local = json.loads((DATA / "politicos.json").read_text(encoding="utf-8"))
    with request(API, 45) as r:
        catalogue = json.load(r)
    if not catalogue.get("success") or not catalogue.get("result", {}).get("resources"):
        raise ValueError("CKAN TSE sem recursos")
    resources = catalogue["result"]["resources"]
    with tempfile.TemporaryDirectory(prefix="politicometro-") as temp:
        candzip = pathlib.Path(temp) / "candidatos.zip"
        benszip = pathlib.Path(temp) / "bens.zip"
        download_resource(find_resource(resources, "consulta_cand"), candzip)
        index = {}
        for row in table_rows(candzip, "consulta_cand"):
            if normalize(row.get("SG_UE")) != TSE_MUN and normalize(row.get("NM_UE")) != "CANOAS":
                continue
            role = normalize(row.get("DS_CARGO"))
            key = (normalize(row.get("NR_CANDIDATO")), normalize(row.get("SG_PARTIDO")), role)
            index.setdefault(key, {})[row["SQ_CANDIDATO"]] = row
        enriched = {}
        candidate_sq = {}
        roles = {"Prefeito": "PREFEITO", "Vice-prefeito": "VICE-PREFEITO", "Vereador": "VEREADOR"}
        for item in local:
            if not item.get("numero"):
                continue
            key = (normalize(item["numero"]), normalize(item["partido"]), roles[item["cargo"]])
            found = index.get(key, {})
            if len(found) != 1:
                LOG.warning("TSE: conciliação não única em %s (%d)", item["id"], len(found))
                continue
            sq, row = next(iter(found.items()))
            enriched[item["id"]] = {
                "sqCandidato": sq,
                "nomeTse": row.get("NM_CANDIDATO"),
                "ocupacao": row.get("DS_OCUPACAO"),
                "instrucao": row.get("DS_GRAU_INSTRUCAO"),
                "bensStatus": "indisponivel",
                "totalBens": None,
                "itensBens": None,
            }
            candidate_sq[sq] = item["id"]
        if len(enriched) < 19:
            raise ValueError("Conciliação TSE insuficiente: %d" % len(enriched))
        try:
            download_resource(find_resource(resources, "bem_candidato"), benszip)
            sums = {}
            counts = {}
            for row in table_rows(benszip, "bem_candidato"):
                sq = row.get("SQ_CANDIDATO")
                if sq not in candidate_sq:
                    continue
                amount = asset_decimal(row.get("VR_BEM_CANDIDATO"))
                if amount is None:
                    continue
                sums[sq] = sums.get(sq, decimal.Decimal(0)) + amount
                counts[sq] = counts.get(sq, 0) + 1
            for sq, item_id in candidate_sq.items():
                record = enriched[item_id]
                if sq in sums:
                    record.update(bensStatus="declarados", totalBens=float(sums[sq]),
                                  itensBens=counts[sq])
                else:
                    record["bensStatus"] = "sem_itens"
        except Exception as exc:
            LOG.warning("Bens TSE indisponíveis, cadastro preservado: %s", exc)
        payload = {
            "status": "verificado", "municipioIbge": IBGE, "coletadoEm": now(),
            "fonte": "https://dadosabertos.tse.jus.br/dataset/candidatos-2024",
            "metodo": "chave exata SG_UE/NM_UE + cargo + numero + partido; sem CPF",
            "candidatos": enriched,
        }
        atomic_json("tse-2024.json", payload)
        LOG.info("TSE: %d candidaturas conciliadas", len(enriched))

def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    successes = 0
    for label, task in (("IBGE", resolve_geo), ("TSE", candidates)):
        try:
            task()
            successes += 1
        except Exception as exc:
            LOG.error("%s: não foi possível atualizar: %s; fotografia anterior mantida", label, exc)
    LOG.info("Coletas concluídas: %d de 2", successes)

if __name__ == "__main__":
    main()
