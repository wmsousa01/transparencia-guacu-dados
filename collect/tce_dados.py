"""Conjuntos de dados abertos do TCE-SP (https://transparencia.tce.sp.gov.br/conjunto-de-dados).

- resultado_analises_audesp: cálculo do próprio Tribunal, por município e exercício (2016→),
  de resultado orçamentário, aplicação em ensino e saúde, FUNDEB e despesa com pessoal.
  É a mesma régua para os 644 municípios, por isso é a base da comparação.
- pareceres: parecer prévio das contas anuais (favorável/desfavorável), com link do voto.
"""
import csv
import io
import zipfile

from fetch import get_bytes

BASE = "https://transparencia.tce.sp.gov.br/sites/default/files/conjunto-dados"


def _csv(url, cache, membro, refresh):
    raw = zipfile.ZipFile(io.BytesIO(get_bytes(url, cache, refresh, timeout=300))).read(membro)
    return list(csv.reader(io.StringIO(raw.decode("latin-1")), delimiter=";"))


def _num(s):
    s = (s or "").strip()
    return float(s.replace(".", "").replace(",", ".")) if s else None


def analises(refresh=False) -> dict[tuple[int, int], dict]:
    """{(ibge, ano): {...}} com percentuais já em 0–100."""
    rows = _csv(f"{BASE}/resultado_analises_audesp.zip", "tce/resultado_analises_audesp.zip",
                "resultado_analises_audesp.csv", refresh)
    out = {}
    for r in rows[1:]:
        if len(r) < 13 or not r[0].strip().isdigit():
            continue
        pct = lambda v: None if _num(v) is None else round(100 * _num(v), 2)  # noqa: E731
        out[(int(r[1]), int(r[0]))] = {
            "resultado": _num(r[3]),
            "resultado_pct": pct(r[4]),
            "fundeb_pct": pct(r[5]),
            "fundeb_profissionais_pct": pct(r[6]),
            "ensino": _num(r[7]),
            "ensino_pct": pct(r[8]),
            "saude": _num(r[9]),
            "saude_pct": pct(r[10]),
            "pessoal": _num(r[11]),
            "pessoal_pct": pct(r[12]),
        }
    return out


def pareceres(ibge: int, refresh=False) -> list[dict]:
    rows = _csv(f"{BASE}/pareceres/pareceres.zip", "tce/pareceres.zip", "pareceres.csv", refresh)
    return [{"ano": int(r[2]), "parecer": r[4].strip(), "processo": r[3].strip(), "voto": r[5].strip()}
            for r in rows[1:] if r and r[0].strip() == str(ibge)]
