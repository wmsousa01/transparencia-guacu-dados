# Transparência Guaçu

Infográfico da saúde financeira da Prefeitura de Mogi Guaçu (SP), montado a partir de dados
oficiais e abertos. Sem backend: um script Python coleta e agrega, a página estática desenha.

## Fontes

| Fonte | O que entrega | Como |
|---|---|---|
| **Siconfi / Tesouro Nacional** | RREO e RGF (relatórios da LRF) 2015 → ano corrente: receita, despesa, resultado, RCL, pessoal, dívida, caixa, mínimos de saúde e educação, despesa por função | API REST `apidatalake.tesouro.gov.br/ords/siconfi/tt` (IBGE 3530706) |
| **TCE-SP, Portal da Transparência Municipal** | Cada empenho, liquidação e pagamento (com favorecido e CNPJ), e a arrecadação por fonte/alínea, mês a mês (dados do AUDESP) | API `transparencia.tce.sp.gov.br/api/json/{despesas,receitas}/mogi-guacu/{ano}/{mes}` |
| **Banco Central (SGS 433)** | IPCA mensal, para corrigir valores pela inflação | API SGS |
| Portal da Prefeitura (Intertec/APEX) | Mesmos dados de execução do AUDESP + documentos (contas anuais, licitações, LOA/LDO) | Ainda não coletado: é Oracle APEX com sessão; os números já vêm do TCE-SP |

## Uso

```bash
python collect/build.py --tce 2025   # Python 3.10+, só stdlib
# abre site/index.html no navegador (funciona via file://)
```

- Downloads ficam em `data/raw/` (fora do git). Exercícios fechados são cache permanente; o ano corrente é rebaixado a cada execução.
- Saída: `site/data/indicadores.json` (e `.js`, o mesmo conteúdo para a página abrir sem servidor).

## Decisões e ressalvas

- **Ano fechado = RREO do 6º bimestre + RGF do 3º quadrimestre** (Poder Executivo). Ano corrente usa o último período entregue e só aparece nos indicadores de 12 meses (pessoal, dívida).
- **Valores calculados**: quando o relatório traz o valor e não o % (pessoal 2020, dívida 2017–2018), ou o caixa *antes* da inscrição de restos a pagar (2015–2018), calculamos com os números do próprio relatório. Fica registrado em `calculados` por ano e aparece no tooltip.
- **Saúde/educação** faltam no Siconfi em 2020 e 2023–2025 → próximo passo: SIOPS e SIOPE.
- **Fornecedores**: soma de "Valor Pago" no TCE-SP, sem o CNPJ da própria Prefeitura. A separação entre terceiros e órgãos públicos é por palavra-chave no nome (`PUBLICOS` em `collect/build.py`).

## Próximos passos

- SIOPS/SIOPE para fechar a série de saúde e educação
- Comparação com municípios vizinhos e de mesmo porte (o Siconfi já permite, basta trocar o IBGE)
- IEGM (TCE-SP), CAPAG (Tesouro) e pareceres das contas anuais
- Deploy estático (Vercel) com atualização agendada
