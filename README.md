# Transparência Guaçu

Infográfico da saúde financeira da Prefeitura de Mogi Guaçu (SP), montado a partir de dados
oficiais e abertos. No ar em **https://transparencia-guacu.vercel.app**, atualizado todo dia 10.
Sem backend: um script Python coleta e agrega, a página estática desenha.

## Fontes

| Fonte | O que entrega | Como |
|---|---|---|
| **Siconfi / Tesouro Nacional** | RREO e RGF (relatórios da LRF) 2015 → ano corrente: receita, despesa, resultado, RCL, pessoal, dívida, caixa, mínimos de saúde e educação, despesa por função | API REST `apidatalake.tesouro.gov.br/ords/siconfi/tt` (IBGE 3530706) |
| **TCE-SP, Portal da Transparência Municipal** | Cada empenho, liquidação e pagamento (com favorecido e CNPJ), e a arrecadação por fonte/alínea, mês a mês (dados do AUDESP) | API `transparencia.tce.sp.gov.br/api/json/{despesas,receitas}/mogi-guacu/{ano}/{mes}` |
| **TCE-SP, conjuntos de dados** | "Resultado das Análises Audesp": % em ensino e saúde, resultado e pessoal calculados pelo Tribunal para os 644 municípios, 2016→. "Pareceres": parecer prévio das contas (arquivo público para em 2017) | ZIP/CSV em `transparencia.tce.sp.gov.br/conjunto-de-dados` |
| **SIOPS (Ministério da Saúde)** | Indicador 3.2: % de recursos próprios aplicados em saúde (LC 141), 2000→ | TabNet do DataSUS (POST no formulário, saída `prn`); sem API |
| **Banco Central (SGS 433)** | IPCA mensal, para corrigir valores pela inflação | API SGS |
| ~~SIOPE (FNDE)~~ | Educação | **Não usado**: a API OData (Olinda) responde HTTP 500 desde a migração de plataforma do FNDE, e a consulta web exige reCAPTCHA. O % de ensino vem do TCE-SP |
| Portal da Prefeitura (Intertec/APEX) | Mesmos dados de execução do AUDESP + documentos (contas anuais, licitações, LOA/LDO) | Ainda não coletado: é Oracle APEX com sessão; os números já vêm do TCE-SP |

## Uso

```bash
python collect/build.py --tce 2025   # Python 3.10+, só stdlib (--sem-comparacao pula os vizinhos)
# abre site/index.html no navegador (funciona via file://)
```

- Atualização automática: `.github/workflows/atualizar-dados.yml` roda todo dia 10 (e sob demanda em Actions → "Atualizar dados" → Run workflow). Coleta, passa por `collect/check.py` (barra publicação se sumir ano ou campo-chave ficar vazio) e commita `site/data/`. O push dispara o deploy de produção na Vercel. Se uma fonte opcional (SIOPS, TCE-SP, vizinhos) cair, o bloco mantém o valor anterior e o aviso vai para `avisos` no JSON. Se a execução falhar, o GitHub avisa por e-mail.
- O ano anterior é tratado como "em andamento" até o RREO do 6º bimestre e o RGF do 3º quadrimestre saírem (fim de janeiro/fevereiro).
- Downloads ficam em `data/raw/` (fora do git). Exercícios fechados são cache permanente; o ano corrente é rebaixado a cada execução.
- Saída: `site/data/indicadores.json` (e `.js`, o mesmo conteúdo para a página abrir sem servidor).

## Decisões e ressalvas

- **Ano fechado = RREO do 6º bimestre + RGF do 3º quadrimestre** (Poder Executivo). Ano corrente usa o último período entregue e só aparece nos indicadores de 12 meses (pessoal, dívida).
- **Valores calculados**: quando o relatório traz o valor e não o % (pessoal 2020, dívida 2017–2018), ou o caixa *antes* da inscrição de restos a pagar (2015–2018), calculamos com os números do próprio relatório. Fica registrado em `calculados` por ano e aparece no tooltip.
- **Saúde/educação**: o Siconfi de Mogi Guaçu não traz esses % em 2020 e 2023–2025 (os vizinhos trazem). Usamos o cálculo do TCE-SP (2016→) e o RREO só em 2015. O SIOPS entra como conferência: ele diverge do TCE-SP em alguns anos (2024: 33,2% × 26,6%).
- **Comparação** (`collect/municipios.py`): região (Baixa Mogiana) e mesmo porte (±20% da população, fora da RMSP), último ano fechado, valores da época. Pessoal/dívida/caixa/receita vêm do Siconfi; resultado/ensino/saúde, do TCE-SP.
- **Fornecedores**: soma de "Valor Pago" no TCE-SP, sem o CNPJ da própria Prefeitura. A separação entre terceiros e órgãos públicos é por palavra-chave no nome (`PUBLICOS` em `collect/build.py`).

## Próximos passos

- SIOPE de novo quando a plataforma nova do FNDE publicar API
- IEGM (TCE-SP) e CAPAG (Tesouro)
- Pareceres de 2018 em diante (o conjunto de dados do TCE-SP para em 2017; buscar no e-TCESP)
