"""SIOPS (Ministério da Saúde): % de recursos próprios aplicados em saúde (indicador 3.2, LC 141/2012).

Não há API: os indicadores municipais saem do TabNet do DataSUS
(siops-asp.datasus.gov.br). O formulário identifica o município por um número de
ordem na lista, então primeiro lemos o formulário para mapear código IBGE (6 dígitos)
→ número de ordem, depois fazemos um POST pedindo a saída em texto (prn).
"""
import hashlib
import html
import re
import urllib.parse

from fetch import get_bytes

DEF = "http://siops-asp.datasus.gov.br/CGI/tabcgi.exe?SIOPS/serhist/municipio/mIndicadores.def"
INDICADOR = "3.2_%R.Próprios_em_Saúde-EC_29"


def _opcoes(refresh=False) -> tuple[dict[str, str], list[int]]:
    s = get_bytes(DEF, "siops/form.html", refresh).decode("latin-1")
    sel = dict(re.findall(r'<select[^>]*name="?([^" >]+)[^>]*>(.*?)</select>', s, re.S | re.I))
    munis = {}
    for v, t in re.findall(r'<option[^>]*value="?([^">]*)"?[^>]*>([^<]*)', sel["SMunic-BR"], re.I):
        m = re.match(r"\s*(\d{6})\s", html.unescape(t))
        if m:
            munis[m.group(1)] = v
    anos = [int(a) for a in re.findall(r'indmun(\d\d)\.dbf', sel["Arquivos"])]
    return munis, sorted(2000 + a if a < 90 else 1900 + a for a in anos)


def saude_pct(ibges: list[int], ano_ini: int, refresh=False) -> dict[tuple[int, int], float]:
    """{(ibge7, ano): %} para os municípios pedidos."""
    munis, anos = _opcoes(refresh)
    por6 = {str(i)[:6]: i for i in ibges}
    alvo = [munis[c] for c in por6 if c in munis]
    form = [("Linha", "Munic-BR"), ("Coluna", "Ano"), ("Incremento", INDICADOR)]
    form += [("Arquivos", f"indmun{a % 100:02d}.dbf") for a in anos if a >= ano_ini]
    form += [("SMunic-BR", v) for v in alvo] + [("formato", "prn"), ("mostre", "Mostra")]
    body = urllib.parse.urlencode(form, encoding="latin-1").encode()
    chave = "-".join(sorted(por6))
    s = get_bytes(DEF, f"siops/ind32_{ano_ini}_{hashlib.sha1(chave.encode()).hexdigest()[:8]}.html", refresh,
                  data=body).decode("latin-1")
    pre = re.search(r"<PRE>(.*?)</PRE>", s, re.S | re.I)
    if not pre:
        raise RuntimeError("SIOPS: resposta sem tabela")
    # Desfaz entidades ANTES de separar: "Gua&ccedil;u" tem um ";" que deslocaria as colunas.
    linhas = [html.unescape(l).split(";") for l in pre.group(1).strip().splitlines()]
    cab = [c.strip('"') for c in linhas[0]]
    out = {}
    for l in linhas[1:]:
        m = re.match(r'"(\d{6}) ', l[0])
        if not m or m.group(1) not in por6:
            continue
        for ano, v in zip(cab[1:], l[1:]):
            v = v.strip().strip('"').strip()
            if ano.isdigit() and re.fullmatch(r"-?\d+(,\d+)?", v):
                out[(por6[m.group(1)], int(ano))] = float(v.replace(",", "."))
    return out
