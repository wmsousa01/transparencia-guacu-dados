"""Monta site/data/indicadores.json a partir das fontes coletadas.

Uso:  python collect/build.py            (usa cache; rebaixa só o ano corrente)
      python collect/build.py --tce 2025 (também agrega fornecedores do TCE-SP)
"""
import argparse
import collections
import datetime as dt
import json
from pathlib import Path

import ipca
import siconfi
import tce

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "indicadores.json"
ANO_INI = 2015

FUNCOES = {
    "Legislativa", "Judiciária", "Essencial à Justiça", "Administração", "Segurança Pública",
    "Assistência Social", "Previdência Social", "Saúde", "Trabalho", "Educação", "Cultura",
    "Direitos da Cidadania", "Urbanismo", "Habitação", "Saneamento", "Gestão Ambiental",
    "Ciência e Tecnologia", "Agricultura", "Indústria", "Comércio e Serviços", "Comunicações",
    "Energia", "Transporte", "Desporto e Lazer", "Encargos Especiais",
}


def pick(items, anexo, cod, coluna_prefix=None, coluna_contem=None, prefixo=False):
    """Primeiro valor de (anexo, cod_conta[, coluna]) ou None. prefixo=True casa pelo início do código."""
    for i in items:
        if not i["anexo"].endswith(anexo):
            continue
        if (not i["cod_conta"].startswith(cod)) if prefixo else i["cod_conta"] != cod:
            continue
        col = i["coluna"].upper()
        if coluna_prefix and not col.startswith(coluna_prefix.upper()):
            continue
        if coluna_contem and coluna_contem.upper() not in col:
            continue
        return i["valor"]
    return None


def ano_siconfi(ano: int, corrente: bool):
    bim, r = siconfi.ultimo_rreo(ano, corrente)
    quad, g = siconfi.ultimo_rgf(ano, corrente)
    if not r and not g:
        return None

    simp = "DemonstrativoSimplificadoBalancoOrcamentario"
    receita = pick(r, "14", "ReceitasRealizadas" + simp)
    despesa = pick(r, "14", "DespesasEmpenhadas" + simp)
    primario = (pick(r, "14", "ResultadoPrimarioAcimaDaLinhaSemRPPSDemonstrativoSimplificado", coluna_contem="Apurado")
                or pick(r, "14", "ResultadoPrimarioDemonstrativoSimplificado", coluna_contem="Apurado"))

    # Composição da receita (RREO Anexo 01, coluna realizada até o bimestre)
    def rec(cod):
        return pick(r, "01", cod, coluna_prefix="At", prefixo=cod.startswith("Transferencias"))

    calculados = []
    rcl = pick(g, "06", "ReceitaCorrenteLiquida")
    rcl_aj = pick(g, "06", "ReceitaCorrenteLiquidaAjustada") or rcl

    pessoal = pick(g, "06", "DespesaTotalComPessoalDemonstrativoSimplificado", coluna_prefix="VALOR")
    pessoal_pct = pick(g, "06", "DespesaTotalComPessoalDemonstrativoSimplificado", coluna_contem="%")
    if pessoal_pct is None and pessoal and rcl_aj:
        pessoal_pct = round(100 * pessoal / rcl_aj, 2)
        calculados.append("pessoal_pct_rcl")

    # Até 2018 o anexo traz a DCL por quadrimestre ("Até o 3º Quadrimestre"), sem o %.
    dcl = (pick(g, "06", "DividaConsolidadaLiquidaDemonstrativoSimplificado", coluna_prefix="VALOR")
           or pick(g, "06", "DividaConsolidadaLiquidaDemonstrativoSimplificado", coluna_contem=f"{quad}"))
    dcl_pct = pick(g, "06", "DividaConsolidadaLiquidaDemonstrativoSimplificado", coluna_contem="%")
    if dcl_pct is None and dcl is not None and rcl_aj:
        dcl_pct = round(100 * dcl / rcl_aj, 2)
        calculados.append("dcl_pct_rcl")

    # Caixa líquida após restos a pagar. Até 2018 o anexo traz o saldo ANTES da inscrição;
    # convertemos subtraindo a inscrição de RP não processados para manter a série comparável.
    rp = "ValorTotalRestosAPagarDemonstrativoSimplificado"
    caixa = pick(g, "06", rp, coluna_contem="(APÓS")
    if caixa is None:
        antes = pick(g, "06", rp, coluna_contem="(ANTES")
        insc = pick(g, "06", rp, coluna_contem="INSCRIÇÃO EM RESTOS")
        if antes is not None and insc is not None:
            caixa = antes - insc
            calculados.append("caixa_liquida_apos_rp")

    funcoes = {}
    for i in r:
        if (i["anexo"].endswith("02") and i["conta"] in FUNCOES
                and i["coluna"].upper().startswith("DESPESAS LIQUIDADAS AT")):
            funcoes[i["conta"]] = funcoes.get(i["conta"], 0) + (i["valor"] or 0)

    pop = next((i.get("populacao") for i in r + g if i.get("populacao")), None)
    return {
        "ano": ano,
        "parcial": corrente,
        "periodo_rreo": f"{bim}º bimestre" if bim else None,
        "periodo_rgf": f"{quad}º quadrimestre" if quad else None,
        "populacao": pop,
        "receita_realizada": receita,
        "despesa_empenhada": despesa,
        "despesa_liquidada": pick(r, "14", "DespesasLiquidadas" + simp),
        "despesa_paga": pick(r, "14", "DespesasPagas" + simp),
        "resultado_orcamentario": (receita - despesa) if receita and despesa else None,
        "resultado_primario": primario,
        "rcl": rcl,
        "pessoal": pessoal,
        "pessoal_pct_rcl": pessoal_pct,
        "dcl": dcl,
        "dcl_pct_rcl": dcl_pct,
        "calculados": calculados,
        # Só existe no 3º quadrimestre: caixa líquida depois de inscrever restos a pagar.
        "caixa_liquida_apos_rp": caixa if quad == 3 else None,
        "saude_pct": pick(r, "14", "AplicacaoTotalDasDespesasComAcoesEServicosPublicosDeSaude", coluna_contem="% APLICADO"),
        "educacao_pct": pick(r, "14", "MinimoAnualDasReceitasDeImpostosNaManutencaoEDesenvolvimentoDoEnsino"
                             "DemonstrativoSimplificado", coluna_contem="% APLICADO"),
        "receita_composicao": {
            "impostos_taxas": rec("ReceitaTributaria"),
            "contribuicoes": rec("ReceitaDeContribuicoes"),
            "servicos": rec("ReceitaDeServicos"),
            "patrimonial": rec("ReceitaPatrimonial"),
            "transf_uniao": rec("TransferenciasCorrentesDaUniaoEDeSuasEntidades"),
            "transf_estado": rec("TransferenciasCorrentesDosEstados"),
            "transf_outras": rec("TransferenciasCorrentesDeOutrasInstituicoesPublicas"),
            "outras_correntes": rec("OutrasReceitasCorrentes"),
            "capital": rec("ReceitasDeCapital"),
        },
        "despesa_funcao": dict(sorted(funcoes.items(), key=lambda kv: -kv[1])),
    }


PUBLICOS = ("MINISTERIO", "INSTITUTO NACIONAL", "TRIBUNAL", "CAIXA ECONOMICA", "BANCO DO BRASIL",
            "FOLHA DE PAGAMENTO", "SERV AUTONOMO", "SECRETARIA DA FAZENDA", "RECEITA FEDERAL",
            "FUNDO", "PREFEITURA", "CAMARA MUN", "INSTITUTO DE PREVIDENCIA")


def tipo_favorecido(nome: str) -> str:
    """'publico' = encargos, dívida, precatórios e repasses a órgãos; 'terceiro' = o resto."""
    n = nome.upper()
    return "publico" if any(k in n for k in PUBLICOS) else "terceiro"


def fornecedores(ano: int, top=15):
    """Top fornecedores por valor PAGO no ano (TCE-SP), excluindo o próprio município."""
    tot = collections.Counter()
    nomes = {}
    for m in range(1, 13):
        for x in tce.despesas(ano, m):
            if x["evento"] != "Valor Pago":
                continue
            doc = x["id_fornecedor"].split(" - ")[-1]
            if doc == "45301264000113":  # CNPJ da própria Prefeitura (repasses internos)
                continue
            tot[doc] += tce.br_num(x["vl_despesa"])
            nomes[doc] = x["nm_fornecedor"]
    total = sum(tot.values())
    terceiros = [(d, v) for d, v in tot.most_common() if tipo_favorecido(nomes[d]) == "terceiro"]
    publicos = [(d, v) for d, v in tot.most_common() if tipo_favorecido(nomes[d]) == "publico"]

    def fmt(lst):
        return [{"nome": nomes[d].strip(), "doc": d if len(d) == 14 else None, "pago": round(v, 2)}
                for d, v in lst[:top]]

    return {
        "ano": ano,
        "total_pago": round(total, 2),
        "n_favorecidos": len(tot),
        "total_terceiros": round(sum(v for _, v in terceiros), 2),
        "total_publicos": round(sum(v for _, v in publicos), 2),
        "top_terceiros": fmt(terceiros),
        "top_publicos": fmt(publicos),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tce", type=int, help="ano para agregar fornecedores do TCE-SP")
    args = ap.parse_args()

    hoje = dt.date.today()
    anos = []
    for ano in range(ANO_INI, hoje.year + 1):
        a = ano_siconfi(ano, corrente=(ano == hoje.year))
        if a:
            anos.append(a)
            print(ano, "ok", a["periodo_rreo"], a["periodo_rgf"])

    ultimo_fechado = max(a["ano"] for a in anos if not a["parcial"])
    fat = ipca.fatores(ANO_INI, ultimo_fechado, refresh=True)
    for a in anos:
        a["ipca_fator"] = round(fat.get(a["ano"], 1.0), 6)

    out = {
        "municipio": "Mogi Guaçu",
        "uf": "SP",
        "ibge": siconfi.IBGE,
        "gerado_em": hoje.isoformat(),
        "base_precos": ultimo_fechado,
        "anos": anos,
        "fontes": [
            {"nome": "Siconfi / Tesouro Nacional (RREO e RGF)", "url": "https://siconfi.tesouro.gov.br"},
            {"nome": "Portal da Transparência Municipal do TCE-SP", "url": "https://transparencia.tce.sp.gov.br/municipio/mogi-guacu"},
            {"nome": "IPCA, Banco Central (SGS 433)", "url": "https://www3.bcb.gov.br/sgspub"},
        ],
    }
    if args.tce:
        out["fornecedores"] = fornecedores(args.tce)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    txt = json.dumps(out, ensure_ascii=False, indent=1)
    OUT.write_text(txt, encoding="utf-8")
    # Mesma coisa como script, para a página abrir direto do disco (file://), sem servidor.
    OUT.with_suffix(".js").write_text(f"window.DADOS = {txt};\n", encoding="utf-8")
    print("->", OUT)


if __name__ == "__main__":
    main()
