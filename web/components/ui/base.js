"use client";
// Peças de interface compartilhadas: seção em cartão, termo do glossário, tabela de dados,
// gráfico ApexCharts carregado só quando entra na tela.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Card, OverlayTrigger, Popover } from "react-bootstrap";
import { GLOSSARIO } from "@/lib/glossario";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function Termo({ k, children }) {
  const [t, d] = GLOSSARIO[k];
  const pop = (
    <Popover id={`pop-${k}`} className="pop-termo">
      <Popover.Header as="h3">{t}</Popover.Header>
      <Popover.Body>{d} <a href={`#g-${k}`}>Ver no glossário</a></Popover.Body>
    </Popover>
  );
  return (
    <OverlayTrigger trigger="click" placement="auto" overlay={pop} rootClose>
      <button type="button" className="termo">{children}</button>
    </OverlayTrigger>
  );
}

export function Resposta({ html, vivo = false }) {
  if (!html) return null;
  return <p className="resposta" aria-live={vivo ? "polite" : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ComoLer({ children }) {
  return <p className="como-ler"><b>Como ler:</b> {children}</p>;
}

export function Secao({ id, icone, kicker, titulo, resposta, respostaViva, comoLer, entenda, entendaTitulo = "Entenda este número", children, className = "" }) {
  return (
    <Card as="section" id={id} aria-labelledby={`h-${id}`} className={`secao mb-6 ${className}`}>
      <Card.Body className="p-4 p-lg-5">
        <div className="secao-topo">
          {icone && <div className="icon-shape icon-lg bg-light-primary text-primary rounded-3" aria-hidden="true">{icone}</div>}
          <div>
            {kicker && <p className="kicker mb-1">{kicker}</p>}
            <h2 id={`h-${id}`} className="h3 mb-0">{titulo}</h2>
          </div>
        </div>
        <Resposta html={resposta} vivo={respostaViva} />
        {comoLer && <ComoLer>{comoLer}</ComoLer>}
        {children}
        {entenda && (
          <details className="entenda">
            <summary>{entendaTitulo}</summary>
            <div className="entenda-corpo">{entenda}</div>
          </details>
        )}
      </Card.Body>
    </Card>
  );
}

export function TabelaDados({ titulo = "Ver os números em tabela", cabecalho, linhas, legenda }) {
  return (
    <details className="tabela">
      <summary>{titulo}</summary>
      <div className="table-responsive">
        <table className="table table-sm table-hover mb-0">
          {legenda && <caption className="visually-hidden">{legenda}</caption>}
          <thead><tr>{cabecalho.map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>{l.map((c, j) => (j ? <td key={j}>{c}</td> : <th scope="row" key={j}>{c}</th>))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// Observa se o elemento já entrou na tela (uma vez só).
export function useVisto(margem = "0px 0px -10% 0px") {
  const ref = useRef(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const n = ref.current;
    if (!n || visto) return;
    if (!("IntersectionObserver" in window)) { setVisto(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect(); } }, { rootMargin: margem });
    io.observe(n);
    return () => io.disconnect();
  }, [visto, margem]);
  return [ref, visto];
}

export function useLargura() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const n = ref.current;
    if (!n) return;
    let ultimo = 0;
    const ro = new ResizeObserver(([e]) => {
      const v = Math.round(e.contentRect.width);
      if (v !== ultimo) { ultimo = v; setW(v); }
    });
    ro.observe(n);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export const semMovimentoReact = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Gráfico ApexCharts que só monta quando aparece: a animação de entrada acontece à vista do leitor.
export function Grafico({ type, series, options, height, rotulo }) {
  const [ref, visto] = useVisto();
  const anima = !semMovimentoReact();
  const opts = {
    ...options,
    chart: {
      fontFamily: "Inter, system-ui, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      animations: { enabled: anima, speed: 700, animateGradually: { enabled: anima, delay: 40 } },
      ...(options.chart || {}),
    },
  };
  return (
    <div ref={ref} className="grafico" style={{ minHeight: height }} role="img" aria-label={rotulo}>
      {visto && <ApexChart type={type} series={series} options={opts} height={height} width="100%" />}
    </div>
  );
}
