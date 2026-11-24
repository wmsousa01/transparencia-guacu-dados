"""Monta web/data/indicadores.json a partir das fontes coletadas (o site lê no build).

Uso:  python collect/build.py            (usa cache; rebaixa só o ano corrente)
      python collect/build.py --tce 2025 (também agrega fornecedores do TCE-SP)
"""
import argparse
import collections
import datetime as dt
import json
from pathlib import Path

import ipca
import municipios
import siconfi
import siops
import tce
import tce_dados

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "data" / "indicadores.json"
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


def ano_siconfi(ano: int, corrente: bool, ibge: int = siconfi.IBGE):
    bim, r = siconfi.ultimo_rreo(ano, corrente, ibge)
    quad, g = siconfi.ultimo_rgf(ano, corrente, ibge)
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
        # Parcial = ainda falta o relatório de fechamento (6º bimestre ou 3º quadrimestre).
        "parcial": not (bim == 6 and quad == 3),
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
        "saude_pct_rreo": pick(r, "14", "AplicacaoTotalDasDespesasComAcoesEServicosPublicosDeSaude", coluna_contem="% APLICADO"),
        "educacao_pct_rreo": pick(r, "14", "MinimoAnualDasReceitasDeImpostosNaManutencaoEDesenvolvimentoDoEnsino"
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
            "correntes": rec("ReceitasCorrentes"),
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


def enriquecer_minimos(anos, analises, saude_siops):
    """Ensino e saúde: TCE-SP (régua do Tribunal) como principal; RREO onde o TCE não cobre (2015).
    O SIOPS de saúde vai junto para conferência, porque os sistemas divergem em alguns anos."""
    for a in anos:
        t = analises.get((siconfi.IBGE, a["ano"]), {})
        fonte = {}
        for k, tk in (("educacao_pct", "ensino_pct"), ("saude_pct", "saude_pct")):
            if t.get(tk) is not None and not a["parcial"]:
                a[k], fonte[k] = t[tk], "TCE-SP"
            elif a.get(k + "_rreo") is not None:
                a[k], fonte[k] = a[k + "_rreo"], "RREO"
            else:
                a[k] = None
        a["fonte_minimos"] = fonte
        a["saude_pct_siops"] = None if a["parcial"] else saude_siops.get((siconfi.IBGE, a["ano"]))
        a["fundeb_profissionais_pct"] = t.get("fundeb_profissionais_pct")


def comparacao(ano: int, analises, saude_siops):
    """Um registro por município (alvo + grupos) com os indicadores do ano fechado."""
    linhas = []
    for cod, nome in municipios.todos().items():
        s = ano_siconfi(ano, False, cod) or {}
        t = analises.get((cod, ano), {})
        rc = s.get("receita_composicao") or {}
        pop = s.get("populacao")
        tribut = (rc.get("impostos_taxas") or 0) + (rc.get("contribuicoes") or 0)
        div = lambda x, y: None if x is None or not y else x / y  # noqa: E731
        linhas.append({
            "ibge": cod,
            "nome": nome,
            "alvo": cod == siconfi.IBGE,
            "grupos": [g for g, lst in (("regiao", municipios.REGIAO), ("porte", municipios.PORTE))
                       if any(c == cod for c, _ in lst)],
            "populacao": pop,
            "pessoal_pct": s.get("pessoal_pct_rcl") if s.get("pessoal_pct_rcl") is not None else t.get("pessoal_pct"),
            "dcl_pct": s.get("dcl_pct_rcl"),
            "resultado_pct": t.get("resultado_pct"),
            "caixa_hab": div(s.get("caixa_liquida_apos_rp"), pop),
            "rcl_hab": div(s.get("rcl"), pop),
            "tributaria_pct": None if not rc.get("correntes") else round(100 * tribut / rc["correntes"], 2),
            "ensino_pct": t.get("ensino_pct"),
            "saude_pct": t.get("saude_pct"),
            "saude_pct_siops": saude_siops.get((cod, ano)),
            "faltando_siconfi": not s,
        })
        print(f"  comparação {nome}: {'ok' if s else 'SEM SICONFI'}")
    return {"ano": ano, "municipios": linhas,
            "criterios": {"regiao": "Cidades da Baixa Mogiana e entorno de Mogi Guaçu",
                          "porte": "Municípios paulistas com população até 20% acima ou abaixo da de "
                                   "Mogi Guaçu, fora da Região Metropolitana de São Paulo"}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tce", type=int, help="ano para agregar fornecedores do TCE-SP")
    ap.add_argument("--sem-comparacao", action="store_true", help="pula a coleta dos municípios vizinhos")
    args = ap.parse_args()

    hoje = dt.date.today()
    anterior = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    avisos = []

    def opcional(nome, fn, fallback):
        """Fonte que pode cair num mês sem travar a atualização: mantém o valor anterior."""
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            avisos.append(f"{nome}: {e}")
            print(f"AVISO {nome} falhou, mantendo valor anterior: {e}")
            return fallback

    anos = []
    for ano in range(ANO_INI, hoje.year + 1):
        # O ano anterior segue "em andamento" até o relatório de fechamento sair (fim de janeiro/fevereiro).
        a = ano_siconfi(ano, corrente=(ano >= hoje.year - 1))
        if a:
            anos.append(a)
            print(ano, "ok", a["periodo_rreo"], a["periodo_rgf"])

    ultimo_fechado = max(a["ano"] for a in anos if not a["parcial"])
    fat = ipca.fatores(ANO_INI, ultimo_fechado, refresh=True)
    for a in anos:
        a["ipca_fator"] = round(fat.get(a["ano"], 1.0), 6)

    analises = opcional("TCE-SP análises", lambda: tce_dados.analises(refresh=True), {})
    if not analises:  # sem TCE-SP, reaproveita ensino/saúde já publicados ano a ano
        prev = {a["ano"]: a for a in anterior.get("anos", [])}
        analises = {(siconfi.IBGE, y): {"ensino_pct": p.get("educacao_pct"), "saude_pct": p.get("saude_pct"),
                                        "fundeb_profissionais_pct": p.get("fundeb_profissionais_pct")}
                    for y, p in prev.items() if not p.get("parcial")}
    saude_siops = opcional("SIOPS", lambda: siops.saude_pct(list(municipios.todos()), ANO_INI, refresh=True), None)
    if saude_siops is None:
        saude_siops = {(siconfi.IBGE, a["ano"]): a.get("saude_pct_siops") for a in anterior.get("anos", [])
                       if a.get("saude_pct_siops") is not None}
    enriquecer_minimos(anos, analises, saude_siops)

    out = {
        "municipio": "Mogi Guaçu",
        "uf": "SP",
        "ibge": siconfi.IBGE,
        "gerado_em": hoje.isoformat(),
        "base_precos": ultimo_fechado,
        "anos": anos,
        "pareceres": opcional("TCE-SP pareceres", lambda: tce_dados.pareceres(siconfi.IBGE, refresh=True),
                              anterior.get("pareceres", [])),
        "fontes": [
            {"nome": "Siconfi / Tesouro Nacional (RREO e RGF)", "url": "https://siconfi.tesouro.gov.br"},
            {"nome": "TCE-SP: Resultado das Análises Audesp (LRF, Ensino, Saúde) e Pareceres",
             "url": "https://transparencia.tce.sp.gov.br/conjunto-de-dados"},
            {"nome": "Portal da Transparência Municipal do TCE-SP", "url": "https://transparencia.tce.sp.gov.br/municipio/mogi-guacu"},
            {"nome": "SIOPS / Ministério da Saúde (indicador 3.2, LC 141/2012)",
             "url": "http://siops-asp.datasus.gov.br/CGI/tabcgi.exe?SIOPS/serhist/municipio/mIndicadores.def"},
            {"nome": "IPCA, Banco Central (SGS 433)", "url": "https://www3.bcb.gov.br/sgspub"},
        ],
    }
    if not args.sem_comparacao:
        out["comparacao"] = opcional("comparação", lambda: comparacao(ultimo_fechado, analises, saude_siops),
                                     anterior.get("comparacao"))
    if args.tce:
        out["fornecedores"] = opcional("fornecedores", lambda: fornecedores(args.tce), anterior.get("fornecedores"))
    out = {k: v for k, v in out.items() if v is not None}
    out["avisos"] = avisos

    OUT.parent.mkdir(parents=True, exist_ok=True)
    txt = json.dumps(out, ensure_ascii=False, indent=1)
    OUT.write_text(txt, encoding="utf-8")
    print("->", OUT)


if __name__ == "__main__":
    main()
