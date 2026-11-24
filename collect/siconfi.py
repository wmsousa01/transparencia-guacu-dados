"""Coleta RREO e RGF no Siconfi (Tesouro Nacional) para qualquer município.

API: https://apidatalake.tesouro.gov.br/docs/siconfi/
- RREO do 6º bimestre = execução orçamentária do ano fechado.
- RGF do 3º quadrimestre (Poder Executivo) = limites da LRF no fechamento.
- Para o ano corrente, usa o último período já entregue.
"""
from fetch import get_json

BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt"
IBGE = 3530706  # Mogi Guaçu


def _items(data):
    return data.get("items", []) if isinstance(data, dict) else []


def rreo(ano: int, bimestre: int, refresh=False, ibge=IBGE):
    url = (f"{BASE}/rreo?an_exercicio={ano}&nr_periodo={bimestre}"
           f"&co_tipo_demonstrativo=RREO&id_ente={ibge}")
    return _items(get_json(url, f"siconfi/{ibge}/rreo_{ano}_b{bimestre}.json", refresh))


def rgf(ano: int, quad: int, refresh=False, ibge=IBGE):
    url = (f"{BASE}/rgf?an_exercicio={ano}&in_periodicidade=Q&nr_periodo={quad}"
           f"&co_tipo_demonstrativo=RGF&co_esfera=M&co_poder=E&id_ente={ibge}")
    return _items(get_json(url, f"siconfi/{ibge}/rgf_{ano}_q{quad}.json", refresh))


def ultimo_rreo(ano: int, corrente: bool, ibge=IBGE):
    """Último bimestre entregue do ano (6 se fechado)."""
    for b in range(6, 0, -1):
        it = rreo(ano, b, refresh=corrente, ibge=ibge)
        if it:
            return b, it
        if not corrente:  # ano antigo sem 6º bimestre: não entregou, não adianta descer
            return None, []
    return None, []


def ultimo_rgf(ano: int, corrente: bool, ibge=IBGE):
    for q in range(3, 0, -1):
        it = rgf(ano, q, refresh=corrente, ibge=ibge)
        if it:
            return q, it
        if not corrente:
            return None, []
    return None, []
