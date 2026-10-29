"""Testes de integridade do recorte Canoas, sem acesso à internet."""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


class TestPoliticalRecords(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.people = load("politicos.json")
        cls.vote = load("eleicoes.json")

    def test_municipality_and_counts(self):
        self.assertEqual(self.vote["ibge"], "4304606")
        self.assertEqual(self.vote["uf"], "RS")
        self.assertEqual(len(self.people), 23)
        self.assertEqual(sum(x["cargo"] == "Vereador" for x in self.people), 21)
        self.assertEqual(sum(x["cargo"] == "Prefeito" for x in self.people), 1)
        self.assertEqual(sum(x["cargo"] == "Vice-prefeito" for x in self.people), 1)
        self.assertEqual(len({x["partido"] for x in self.people if x["cargo"] == "Vereador"}), 11)

    def test_candidate_identifiers_unique(self):
        ids = [x["id"] for x in self.people]
        self.assertEqual(len(ids), len(set(ids)))
        for x in self.people:
            self.assertTrue(re.fullmatch(r"[a-z0-9-]+", x["id"]))
            self.assertEqual(x["ano"], 2024)
            self.assertEqual(x["turno"], 2 if x["cargo"] != "Vereador" else 1)
            if x["cargo"] == "Vice-prefeito":
                self.assertIsNone(x["votos"])
            else:
                self.assertGreater(x["votos"], 0)

    def test_majoritarian_math(self):
        a = self.vote["primeiroTurno"]
        b = self.vote["segundoTurno"]
        self.assertEqual(a["aptos"], a["comparecimento"] + a["abstencao"])
        self.assertEqual(b["aptos"], b["comparecimento"] + b["abstencao"])
        self.assertEqual(b["airtonSouza"] + b["jairoJorge"],
                         b["comparecimento"] - b["brancos"] - b["nulos"])
        airton = next(x for x in self.people if x["cargo"] == "Prefeito")
        self.assertEqual(airton["votos"], b["airtonSouza"])

    def test_enrichment_is_optional_but_territorial(self):
        t = load("tse-2024.json")
        self.assertEqual(t["municipioIbge"], "4304606")
        self.assertIn(t["status"], ("pendente", "verificado"))
        candidates = t.get("candidatos") or {}
        self.assertTrue(set(candidates).issubset({x["id"] for x in self.people}))
        for record in candidates.values():
            if record.get("totalBens") is not None:
                self.assertGreaterEqual(record["totalBens"], 0)
                self.assertGreaterEqual(record["itensBens"], 1)

    def test_geojson(self):
        g = load("canoas.geojson")
        self.assertEqual(g["type"], "FeatureCollection")
        self.assertTrue(g["features"])
        self.assertIn(g["metadata"]["qualidade"], ("simplificado", "oficial"))
        for feature in g["features"]:
            self.assertEqual(str(feature["properties"]["codarea"]), "4304606")
            self.assertIn(feature["geometry"]["type"], ("Polygon", "MultiPolygon"))

    def test_site_assets_and_neutrality(self):
        for name in ("index.html", "styles.css", "app.js", "favicon.svg"):
            self.assertTrue((ROOT / name).is_file(), name)
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        script = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn('id="representantes"', html)
        self.assertIn('id="cityMap"', html)
        self.assertIn('id="modal"', html)
        self.assertIn("Não disponível", script)
        self.assertNotIn("nota de desempenho", html.lower())
        self.assertIn("sem", html.lower())
        self.assertNotIn("Math.random", script)


if __name__ == "__main__":
    unittest.main()
