"""Valida dados fiscais de Canoas, contratos PNCP e integridade do painel."""
import importlib.util
import json
import pathlib
import re
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/"data"

def read(name):
    return json.loads((DATA/name).read_text(encoding="utf-8"))

class FinanceTests(unittest.TestCase):
    def test_rreo_bimonthly(self):
        data=read("financas-rreo.json")
        self.assertEqual(data["ibge"],"4304606")
        self.assertEqual(data["unidade"],"BRL")
        self.assertGreaterEqual(len(data["periodos"]),5)
        unique=set()
        for p in data["periodos"]:
            self.assertNotIn(p["fim"],unique)
            unique.add(p["fim"])
            self.assertTrue(p["fonte"].startswith("https://www.canoas.rs.gov.br/"))
            self.assertEqual(p["bimestre"],(int(p["fim"][5:7])+1)//2)
            d,r=p["despesas"],p["receitas"]
            self.assertAlmostEqual(d["dotacaoInicial"]+d["creditosAdicionais"],d["dotacaoAtualizada"],places=1)
            self.assertLessEqual(d["pagas"],d["liquidadas"])
            self.assertLessEqual(d["liquidadas"],d["empenhadas"])
            self.assertLessEqual(d["empenhadas"],d["dotacaoAtualizada"])
            self.assertGreater(r["realizadas"],0)
            self.assertGreater(r["previsaoAtualizada"],0)
            self.assertGreater(d["pagas"],0)

    def test_fechamento_2024(self):
        p=next(x for x in read("financas-rreo.json")["periodos"] if x["fim"]=="2024-12-31")
        self.assertEqual(p["bimestre"],6)
        self.assertAlmostEqual(p["receitas"]["realizadas"],2834585104.50,places=2)
        self.assertAlmostEqual(p["despesas"]["empenhadas"],2873227271.30,places=2)
        self.assertAlmostEqual(p["despesas"]["liquidadas"],2493771598.00,places=2)
        self.assertAlmostEqual(p["despesas"]["pagas"],2420664324.96,places=2)
        self.assertAlmostEqual(p["capital"]["despesaCapitalLiquida"],339443194.55,places=2)
        self.assertAlmostEqual(p["responsabilidadeFiscal"]["restosAPagarSaldo"],43713269.80,places=2)
        self.assertGreater(p["aplicacoesVinculadas"]["educacaoPercentual"],25)
        self.assertGreater(p["aplicacoesVinculadas"]["saudePercentual"],15)

    def test_2026_partial_rreo_is_explicitly_approximate(self):
        data=read("financas-2026-referencia.json")
        self.assertEqual(data["municipioIbge"],"4304606")
        self.assertEqual(data["ano"],2026)
        self.assertEqual(data["bimestre"],4)
        self.assertTrue(data["aproximado"])
        self.assertIn("secundaria",data["status"])
        self.assertEqual(data["ate"],"2026-08-31")
        self.assertLessEqual(data["despesaPaga"],data["despesaLiquidada"])
        self.assertLessEqual(data["despesaLiquidada"],data["despesaEmpenhada"])
        self.assertLess(data["investimentosEmpenhados"],data["despesaEmpenhada"])
        self.assertGreaterEqual(len(data["fontes"]),2)

    def test_pncp_contracts_not_inferred_from_missing_records(self):
        data=read("contratos-pncp.json")
        self.assertEqual(data["cnpjOrgao"],"88577416000118")
        self.assertEqual(data["ibge"],"4304606")
        self.assertIn(data["status"],("aguardando-coleta","parcial","verificado"))
        if data["status"]=="aguardando-coleta":
            self.assertIsNone(data["coletadoEm"])
            self.assertFalse(data["contratos"])
        else:
            self.assertEqual(data["totalRegistros"],len(data["contratos"]))
            self.assertGreaterEqual(data["mesesCompletos"],1)
            self.assertLessEqual(data["mesesCompletos"],12)
            self.assertGreaterEqual(data["fim"],data["inicio"])
            ids=set()
            for contract in data["contratos"]:
                self.assertNotIn(contract["id"],ids)
                ids.add(contract["id"])
                self.assertGreaterEqual(contract["valor"],0)
                self.assertRegex(contract["id"],r"^88577416000118-")
                self.assertTrue(contract["fonte"].startswith("https://pncp.gov.br/"))
                self.assertTrue(contract["objeto"])

    def test_dca_annual_separate_from_rreo(self):
        data=read("financas-dca.json")
        self.assertEqual(data["municipioIbge"],"4304606")
        self.assertIn("intraorçamentárias",data["escopo"])
        self.assertEqual(data["status"],"reproducao-secundaria-pendente-conciliacao-direta")
        self.assertEqual([row["ano"] for row in data["anuais"]],list(range(2015,2026)))
        self.assertEqual(len(data["funcoes2025"]),19)
        for p in data["anuais"]:
            self.assertAlmostEqual(p["resultado"],p["receitaRealizada"]-p["despesaEmpenhada"],places=2)
            self.assertGreater(p["receitaRealizada"],0)
            self.assertGreater(p["despesaEmpenhada"],0)
        y25=data["anuais"][-1]
        self.assertAlmostEqual(y25["receitaRealizada"],2592407674.90,places=2)
        self.assertAlmostEqual(y25["despesaEmpenhada"],2699399163.23,places=2)
        self.assertAlmostEqual(y25["despesaLiquidada"],2455324934.20,places=2)
        self.assertAlmostEqual(y25["despesaPaga"],2279083240.29,places=2)
        self.assertGreater(y25["despesaEmpenhada"],y25["despesaLiquidada"])
        self.assertGreater(y25["despesaLiquidada"],y25["despesaPaga"])
        self.assertTrue(any("siconfi" in (f["tipo"]+" "+f["url"]).lower() for f in data["fontes"]))
        self.assertNotAlmostEqual(y25["receitaRealizada"],next(x for x in read("financas-rreo.json")["periodos"] if x["fim"]=="2024-12-31")["receitas"]["realizadas"])

    def test_contract_parser_validation(self):
        spec=importlib.util.spec_from_file_location("sync_pncp",ROOT/"scripts"/"sync_pncp.py")
        module=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sample={"orgaoEntidade":{"cnpj":"88577416000118"},
                "numeroControlePNCP":"88577416000118-2-000012/2026",
                "anoContrato":2026,"sequencialContrato":12,
                "objetoContrato":"Reforma de escola municipal",
                "valorGlobal":120000.50,"nomeRazaoSocialFornecedor":"Empresa Teste",
                "dataPublicacaoPncp":"2026-04-25T12:00:00"}
        contract=module.extract(sample)
        self.assertEqual(contract["valor"],120000.50)
        self.assertEqual(contract["publicacao"],"2026-04-25")
        with self.assertRaises(ValueError):
            module.extract({**sample,"orgaoEntidade":{"cnpj":"00000000000000"}})
        with self.assertRaises(ValueError):
            module.extract({**sample,"valorGlobal":"não informado"})
        with self.assertRaises(ValueError):
            module.extract({**sample,"numeroControlePNCP":"invalido"})
        self.assertIsNone(module.money(-1))
        self.assertIsNone(module.money("NaN"))

    def test_finance_frontend_assets(self):
        page=(ROOT/"financas.html").read_text(encoding="utf-8")
        js=(ROOT/"financas.js").read_text(encoding="utf-8")
        home=(ROOT/"index.html").read_text(encoding="utf-8")
        for file in ("financas.html","financas.css","financas.js","dca.js","dca.css","finance-current.js"):
            self.assertTrue((ROOT/file).is_file())
        self.assertIn("financas.html",home)
        ids=re.findall(r'\bid="([^"]+)"',page)
        self.assertEqual(len(ids),len(set(ids)))
        for target in ("periodSelect","fiscalMetrics","execBars","historyPlot","contractList","worksList","pncpNotice","exportFiscal","exportContracts"):
            self.assertIn(target,ids)
        self.assertIn("financas-rreo.json",js)
        self.assertIn("contratos-pncp.json",js)
        self.assertIn("financas-dca.json",(ROOT/"dca.js").read_text(encoding="utf-8"))
        self.assertIn('id="contas-anuais"',page)
        self.assertNotIn("Math.random",js)
        self.assertIn("não",page.lower())

if __name__=="__main__":
    unittest.main()
