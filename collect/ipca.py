"""IPCA mensal (BCB/SGS série 433) para trazer valores nominais a preços do último ano."""
from fetch import get_json

URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/{ini}"


def fatores(ano_ini: int, ano_base: int, refresh=False) -> dict[int, float]:
    """{ano: fator} que multiplica um valor nominal do ano para preços médios de ano_base."""
    serie = get_json(URL.format(ini=ano_ini), f"bcb/ipca_{ano_ini}.json", refresh)
    idx, acc, por_ano = 100.0, [], {}
    for p in serie:
        idx *= 1 + float(p["valor"]) / 100
        ano = int(p["data"][-4:])
        por_ano.setdefault(ano, []).append(idx)
    media = {a: sum(v) / len(v) for a, v in por_ano.items()}
    base = media[ano_base]
    return {a: base / m for a, m in media.items()}
