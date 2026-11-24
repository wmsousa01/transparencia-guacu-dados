"""Compara o indicadores.json novo com o publicado e barra a publicação se algo regrediu.

Uso: python collect/check.py ANTIGO.json NOVO.json   (sai com código 1 se reprovar)

Reprova (não publica):
- um ano que existia sumiu da série;
- um campo-chave de ano fechado que tinha valor ficou vazio;
- a comparação perdeu mais de 3 municípios.
Só avisa (publica mesmo assim): valor de ano fechado que mudou mais de 25%. Prefeituras
retificam relatórios, então mudança não é erro, mas vale olhar.
"""
import json
import sys

CHAVE = ["receita_realizada", "despesa_empenhada", "rcl", "pessoal_pct_rcl", "dcl_pct_rcl",
         "educacao_pct", "saude_pct"]


def main(antigo_path, novo_path):
    antigo = json.load(open(antigo_path, encoding="utf-8"))
    novo = json.load(open(novo_path, encoding="utf-8"))
    erros, avisos = [], list(novo.get("avisos", []))

    velhos = {a["ano"]: a for a in antigo.get("anos", [])}
    novos = {a["ano"]: a for a in novo.get("anos", [])}
    for ano in sorted(set(velhos) - set(novos)):
        erros.append(f"o ano {ano} sumiu da série")

    for ano, v in velhos.items():
        n = novos.get(ano)
        if not n or v.get("parcial"):
            continue
        for k in CHAVE:
            if v.get(k) is not None and n.get(k) is None:
                erros.append(f"{ano}.{k} tinha {v[k]} e ficou vazio")
            elif v.get(k) and n.get(k) is not None and abs(n[k] - v[k]) / abs(v[k]) > 0.25:
                avisos.append(f"{ano}.{k} mudou de {v[k]} para {n[k]} (retificação?)")

    cv = len((antigo.get("comparacao") or {}).get("municipios", []))
    cn = len((novo.get("comparacao") or {}).get("municipios", []))
    if cn < cv - 3:
        erros.append(f"comparação caiu de {cv} para {cn} municípios")

    for a in avisos:
        print("AVISO:", a)
    for e in erros:
        print("ERRO:", e)
    print("reprovado" if erros else "aprovado", f"({len(novos)} anos, {cn} municípios na comparação)")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:3]))
