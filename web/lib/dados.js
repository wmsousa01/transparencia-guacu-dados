// Derivações a partir de data/indicadores.json (gerado por collect/build.py).
// As frases de resposta são HTML simples (<strong>) montado só com números do próprio arquivo.
import { mi, pct, reais, nf0, plural } from "./formato";

export function prepara(D) {
  const fechados = D.anos.filter((a) => !a.parcial);
  const ult = fechados[fechados.length - 1];
  const ant = fechados[fechados.length - 2];
  const parcial = D.anos.find((a) => a.parcial) || null;
  return { fechados, ult, ant, parcial };
}

// Valores em reais: corrigidos pelo IPCA (preços do último ano fechado) ou da época.
export const dinheiro = (modo) => (a, v) => (v == null ? null : modo === "real" ? v * a.ipca_fator : v);

export const nivelPessoal = (p) => (p >= 54 ? "critical" : p >= 51.3 ? "serious" : p >= 48.6 ? "warning" : "good");
export const nivelDivida = (d) => (d >= 120 ? "critical" : d >= 108 ? "warning" : "good");

export function manchete(D, modo) {
  const { fechados, ult } = prepara(D);
  const m = dinheiro(modo);
  const res = ult.resultado_orcamentario;
  const nDef = fechados.slice(-3).filter((x) => x.resultado_orcamentario < 0).length;
  const titulo = res < 0
    ? `Mogi Guaçu gastou ${mi(m(ult, -res))} a mais do que arrecadou em ${ult.ano}`
    : `Mogi Guaçu fechou ${ult.ano} com ${mi(m(ult, res))} de sobra no orçamento`;
  const folha = nivelPessoal(ult.pessoal_pct_rcl) === "good" ? "abaixo do alerta" : "acima do alerta";
  const divida = nivelDivida(ult.dcl_pct_rcl) === "good" ? "longe do limite" : "perto do limite";
  const linha = `${res < 0 ? (nDef >= 2 ? `É o ${nDef}º déficit em três anos. ` : "") : ""}` +
    `Gasto com salários (${pct(ult.pessoal_pct_rcl)} da receita) segue ${folha} da lei, e a dívida (${pct(ult.dcl_pct_rcl)}) está ${divida}.`;
  return { titulo, linha };
}

export function respostas(D, modo) {
  const { fechados, ult: a } = prepara(D);
  const m = dinheiro(modo);
  const ano = a.ano;
  const r = {};

  const res = a.resultado_orcamentario;
  const nDef = fechados.slice(-5).filter((x) => x.resultado_orcamentario < 0).length;
  r.resultado = (res >= 0
    ? `<strong>Sim.</strong> Em ${ano} a Prefeitura arrecadou <strong>${mi(m(a, res))} a mais</strong> do que se comprometeu a gastar.`
    : `<strong>Não.</strong> Em ${ano} a Prefeitura se comprometeu a gastar <strong>${mi(m(a, -res))} a mais</strong> do que arrecadou.`) +
    ` Nos últimos 5 anos, ${nDef ? `foram <strong>${plural(nDef, "ano", "anos")} de déficit</strong>` : "não houve déficit"}.`;

  const cx = a.caixa_liquida_apos_rp;
  if (cx != null) {
    const ultPos = [...fechados].reverse().find((x) => x.caixa_liquida_apos_rp > 0);
    r.caixa = cx >= 0
      ? `<strong>Sim.</strong> No fim de ${ano}, depois de reservar as contas pendentes, sobraram <strong>${mi(m(a, cx))}</strong>.`
      : `<strong>Não.</strong> No fim de ${ano}, as contas deixadas para o ano seguinte eram <strong>${mi(m(a, -cx))} maiores</strong> que o dinheiro em caixa.` +
        (ultPos ? ` A última vez que sobrou dinheiro foi em ${ultPos.ano}.` : "");
  }

  const p = a.pessoal_pct_rcl;
  const p0 = fechados[0];
  const pTxt = p >= 54 ? "<strong>acima do teto</strong> de 54% da lei" : p >= 51.3 ? "acima do limite prudencial (51,3%)" : p >= 48.6 ? "acima do alerta da lei (48,6%)" : "<strong>abaixo do alerta</strong> da lei (48,6%)";
  r.pessoal = `De cada R$ 100 da receita, <strong>R$ ${nf0.format(p)} vão para salários e encargos</strong> dos servidores, ${pTxt}. Em ${p0.ano} eram R$ ${nf0.format(p0.pessoal_pct_rcl)}.`;

  const dcl = a.dcl_pct_rcl;
  const d4 = fechados[fechados.length - 4];
  r.divida = `A dívida equivale a <strong>${pct(dcl)} da receita de um ano</strong>. ` +
    (dcl < 108 ? "O limite é 120%, então há <strong>folga grande</strong>." : dcl < 120 ? "O limite é 120%: está <strong>perto do limite</strong>." : "Passou do limite de 120%.") +
    (d4 ? ` Em ${d4.ano} era ${pct(d4.dcl_pct_rcl)}.` : "");

  const comMin = fechados.filter((x) => x.educacao_pct != null && x.saude_pct != null);
  const falhas = comMin.filter((x) => x.educacao_pct < 25 || x.saude_pct < 15);
  r.minimos = `<strong>${falhas.length ? "Nem sempre." : "Sim."}</strong> Em ${ano}: <strong>${pct(a.educacao_pct)} em educação</strong> (mínimo 25%) e <strong>${pct(a.saude_pct)} em saúde</strong> (mínimo 15%). ` +
    (falhas.length ? `Ficou abaixo do mínimo em ${falhas.map((x) => x.ano).join(", ")}.` : `Os dois mínimos foram cumpridos em todos os anos desde ${comMin[0]?.ano}.`);

  const pc = (x) => (x.rcl && x.populacao ? (x.rcl * x.ipca_fator) / x.populacao : null);
  const v0 = pc(p0);
  const v1 = pc(a);
  if (v0 && v1) {
    const d = (100 * (v1 - v0)) / v0;
    r.rcl = `Em ${ano}, a receita foi de <strong>${reais(m(a, a.rcl / a.populacao))} por morador</strong>. ` +
      `Descontada a inflação, são <strong>${pct(Math.abs(d))} ${d >= 0 ? "a mais" : "a menos"}</strong> que em ${p0.ano}.`;
  }

  const P = D.pareceres || [];
  if (P.length) {
    const fav = P.filter((x) => x.parecer.toLowerCase().startsWith("favor"));
    const desf = P.filter((x) => !x.parecer.toLowerCase().startsWith("favor"));
    r.pareceres = `Das <strong>${P.length} contas anuais</strong> analisadas entre ${P[0].ano} e ${P[P.length - 1].ano}, ` +
      `<strong>${fav.length} receberam parecer favorável</strong> e ${desf.length} desfavorável` +
      (desf.length ? ` (${desf.map((x) => x.ano).join(", ")}).` : ".");
  }

  if (D.fornecedores) {
    const fo = D.fornecedores;
    r.fornecedores = `Em ${fo.ano} a Prefeitura pagou <strong>${mi(fo.total_pago)}</strong> a ${nf0.format(fo.n_favorecidos)} favorecidos, sem contar a folha. ` +
      `<strong>${mi(fo.total_terceiros)}</strong> foram para empresas, entidades e prestadores. Estes são os 15 que mais receberam (valores da época).`;
  }
  return r;
}
