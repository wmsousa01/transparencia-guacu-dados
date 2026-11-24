"use client";
// Cartões do resumo no padrão Dash UI (ícone no canto, número grande), com selo de situação,
// variação contra o ano anterior, minigráfico de tendência e contagem animada do número.
import { useEffect, useState } from "react";
import { Card, Col, ProgressBar, Row } from "react-bootstrap";
import { AlertCircle, CheckCircle, Activity, Briefcase, CreditCard, DollarSign } from "react-feather";
import { Sparkline } from "@/components/graficos";
import { semMovimentoReact } from "@/components/ui/base";
import { mi, pct, pontos } from "@/lib/formato";
import { dinheiro, nivelDivida, nivelPessoal, prepara } from "@/lib/dados";

const COR_NIVEL = { good: "success", warning: "warning", serious: "danger", critical: "danger" };

function Contagem({ valor, fmt }) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    if (semMovimentoReact()) { setV(valor); return; }
    let raf;
    const t0 = performance.now();
    const passo = (t) => {
      const p = Math.min(1, (t - t0) / 1000);
      setV(valor * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{fmt(v)}</>;
}

function Variacao({ atual, anterior, anoAnt, fmtDiff, melhor }) {
  if (atual == null || anterior == null) return null;
  const d = atual - anterior;
  const bom = melhor === "maior" ? d > 0 : d < 0;
  return (
    <span className={`badge rounded-pill ${bom ? "bg-light-success text-dark-success" : "bg-light-danger text-dark-danger"}`}>
      <span aria-hidden="true">{d > 0 ? "↑" : "↓"}</span> {fmtDiff(Math.abs(d))}
      <span className="visually-hidden">{d > 0 ? " a mais" : " a menos"}</span> vs {anoAnt}
    </span>
  );
}

function Cartao({ icone, titulo, nivel, selo, valor, fmt, sufixo, variacao, spark, medidor, contexto, href }) {
  return (
    <Card className="h-100 cartao-stat">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
          <div>
            <span className={`badge rounded-pill bg-light-${COR_NIVEL[nivel]} text-dark-${COR_NIVEL[nivel]} selo`}>
              {nivel === "good" ? <CheckCircle size={13} aria-hidden="true" /> : <AlertCircle size={13} aria-hidden="true" />} {selo}
            </span>
            <h3 className="h5 mt-2 mb-0">{titulo}</h3>
          </div>
          <div className="icon-shape icon-md bg-light-primary text-primary rounded-2" aria-hidden="true">{icone}</div>
        </div>
        <p className="valor mb-1"><Contagem valor={valor} fmt={fmt} />{sufixo && <small> {sufixo}</small>}</p>
        <div className="mb-2">{variacao}</div>
        {spark}
        {medidor}
        <p className="contexto">{contexto}</p>
        <a className="mais mt-auto" href={href}>Ver a evolução <span aria-hidden="true">→</span></a>
      </Card.Body>
    </Card>
  );
}

export default function Resumo({ D, modo }) {
  const { fechados, ult: a, ant } = prepara(D);
  const m = dinheiro(modo);
  const serie = (f) => fechados.map((x) => ({ ano: x.ano, v: f(x) }));
  const res = a.resultado_orcamentario;
  const resPct = (100 * res) / a.receita_realizada;
  const cx = a.caixa_liquida_apos_rp;
  const pN = nivelPessoal(a.pessoal_pct_rcl);
  const dN = nivelDivida(a.dcl_pct_rcl);
  // Barra até o valor, com traços nos limites da lei.
  const medidor = (v, max, lims, nivel) => (
    <div className="medidor" aria-hidden="true">
      <ProgressBar now={(100 * v) / max} variant={COR_NIVEL[nivel]} />
      {lims.map((l) => <i key={l} style={{ left: `${(100 * l) / max}%` }} />)}
    </div>
  );

  return (
    <Row className="g-4">
      <Col xl={3} md={6} xs={12}>
        <Cartao icone={<DollarSign size={20} />} titulo="Receita menos despesa" nivel={res >= 0 ? "good" : resPct > -3 ? "warning" : "serious"}
          selo={res >= 0 ? "Superávit" : "Déficit"} valor={m(a, res)} fmt={mi}
          variacao={<Variacao atual={m(a, res)} anterior={m(ant, ant.resultado_orcamentario)} anoAnt={ant.ano} fmtDiff={mi} melhor="maior" />}
          spark={<Sparkline dados={serie((x) => m(x, x.resultado_orcamentario))} tipo="bar" sinal />}
          contexto={`${res >= 0 ? "Sobrou" : "Faltou"} o equivalente a ${pct(Math.abs(resPct))} da receita do ano.`} href="#resultado" />
      </Col>
      {cx != null && (
        <Col xl={3} md={6} xs={12}>
          <Cartao icone={<CreditCard size={20} />} titulo="Dinheiro em caixa" nivel={cx >= 0 ? "good" : "serious"}
            selo={cx >= 0 ? "Caixa cobre as contas" : "Caixa no vermelho"} valor={m(a, cx)} fmt={mi}
            variacao={<Variacao atual={m(a, cx)} anterior={m(ant, ant.caixa_liquida_apos_rp)} anoAnt={ant.ano} fmtDiff={mi} melhor="maior" />}
            spark={<Sparkline dados={serie((x) => m(x, x.caixa_liquida_apos_rp))} tipo="bar" sinal />}
            contexto={`${cx >= 0 ? "Sobra" : "Falta"} depois de reservar as contas que ficaram para o ano seguinte.`} href="#caixa" />
        </Col>
      )}
      <Col xl={3} md={6} xs={12}>
        <Cartao icone={<Briefcase size={20} />} titulo="Salários e encargos" nivel={pN}
          selo={{ good: "Abaixo do alerta", warning: "Limite de alerta", serious: "Limite prudencial", critical: "Acima do teto" }[pN]}
          valor={a.pessoal_pct_rcl} fmt={pct} sufixo="da receita"
          variacao={<Variacao atual={a.pessoal_pct_rcl} anterior={ant.pessoal_pct_rcl} anoAnt={ant.ano} fmtDiff={pontos} melhor="menor" />}
          spark={<Sparkline dados={serie((x) => x.pessoal_pct_rcl)} />}
          medidor={medidor(a.pessoal_pct_rcl, 60, [48.6, 51.3, 54], pN)}
          contexto="A barra mostra a distância até o teto da lei, de 54%." href="#pessoal" />
      </Col>
      <Col xl={3} md={6} xs={12}>
        <Cartao icone={<Activity size={20} />} titulo="Dívida" nivel={dN}
          selo={dN === "good" ? "Bem abaixo do limite" : dN === "warning" ? "Perto do limite" : "Acima do limite"}
          valor={a.dcl_pct_rcl} fmt={pct} sufixo="da receita"
          variacao={<Variacao atual={a.dcl_pct_rcl} anterior={ant.dcl_pct_rcl} anoAnt={ant.ano} fmtDiff={pontos} melhor="menor" />}
          spark={<Sparkline dados={serie((x) => x.dcl_pct_rcl)} />}
          medidor={medidor(a.dcl_pct_rcl, 130, [120], dN)}
          contexto={`${mi(m(a, a.dcl))}. A barra mostra a distância até o limite de 120%.`} href="#divida" />
      </Col>
    </Row>
  );
}
