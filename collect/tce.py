"""Coleta despesas e receitas de Mogi Guaçu no Portal da Transparência Municipal do TCE-SP.

API: https://transparencia.tce.sp.gov.br/api  (dados enviados pelo município ao AUDESP)
- despesas/{municipio}/{ano}/{mes}: um registro por evento (Empenhado, Liquidado, Pago...)
- receitas/{municipio}/{ano}/{mes}: arrecadação por fonte e alínea
"""
from fetch import get_json

BASE = "https://transparencia.tce.sp.gov.br/api/json"
MUN = "mogi-guacu"


def br_num(s: str) -> float:
    return float(s.replace(".", "").replace(",", ".")) if s else 0.0


def despesas(ano: int, mes: int, refresh=False):
    d = get_json(f"{BASE}/despesas/{MUN}/{ano}/{mes}", f"tce/despesas_{ano}_{mes:02d}.json", refresh)
    return d if isinstance(d, list) else []


def receitas(ano: int, mes: int, refresh=False):
    d = get_json(f"{BASE}/receitas/{MUN}/{ano}/{mes}", f"tce/receitas_{ano}_{mes:02d}.json", refresh)
    return d if isinstance(d, list) else []
