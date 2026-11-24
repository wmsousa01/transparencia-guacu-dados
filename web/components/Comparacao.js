"use client";
// Comparação com cidades parecidas: enxame (cada cidade é uma bolinha numa régua).
// As bolinhas lembram a posição anterior e deslizam até a nova quando o indicador muda.
import { useEffect, useRef, useState } from "react";
import { ButtonGroup, Button } from "react-bootstrap";
import { TabelaDados, useLargura } from "@/components/ui/base";
import { COR, nf0, pct, reais } from "@/lib/formato";
import { bindTip, el, navegavel, niceTicks, txt } from "@/lib/svg";

const METRICAS = [
  { k: "pessoal_pct", nome: "Gasto com pessoal", desc: "despesa com pessoal do Executivo, % da Receita Corrente Líquida", fmt: pct, melhor: "menor", limite: { v: 54, label: "Teto 54%" } },
  { k: "resultado_pct", nome: "Resultado do orçamento", desc: "receita menos despesa empenhada, % da receita", fmt: pct, melhor: "maior" },
  { k: "caixa_hab", nome: "Caixa por habitante", desc: "caixa após restos a pagar, em reais por habitante", fmt: reais, melhor: "maior" },
  { k: "dcl_pct", nome: "Dívida", desc: "dívida consolidada líquida, % da Receita Corrente Líquida (limite 120%)", fmt: pct, melhor: "menor" },
  { k: "tributaria_pct", nome: "Arrecadação própria", desc: "impostos, taxas e contribuições, % da receita corrente", fmt: pct, melhor: "maior" },
  { k: "rcl_hab", nome: "Receita por habitante", desc: "Receita Corrente Líquida por habitante", fmt: reais, melhor: null },
  { k: "ensino_pct", nome: "Educação", desc: "aplicação em ensino segundo o TCE-SP, % da receita de impostos", fmt: pct, melhor: null, limite: { v: 25, label: "Mínimo 25%" } },
  { k: "saude_pct", nome: "Saúde", desc: "aplicação em saúde segundo o TCE-SP, % da receita de impostos", fmt: pct, melhor: null, limite: { v: 15, label: "Mínimo 15%" } },
];
const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};

function desenharEnxame(box, W, { itens, fmt, refs }, antes) {
  box.innerHTML = "";
  const estreito = W < 500;
  const com = itens.filter((i) => i.valor != null);
  const r = estreito ? 7 : 9;
  const m = { l: 16, r: 16, t: 50, b: 30 };
  const vals = [...com.map((i) => i.valor), ...refs.map((x) => x.v)];
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals), estreito ? 4 : 6);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const x = (v) => m.l + ((v - lo) / (hi - lo || 1)) * (W - m.l - m.r);
  const pos = [];
  [...com].sort((a, b) => a.valor - b.valor).forEach((it) => {
    const px = x(it.valor);
    const rr = it.alvo ? r + 2 : r;
    let dy = 0;
    for (let k = 0; k < 600; k++) {
      const cand = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2);
      if (pos.every((p) => Math.hypot(p.x - px, p.dy - cand) >= p.r + rr + 2)) { dy = cand; break; }
    }
    pos.push({ it, x: px, dy, r: rr });
  });
  const amp = Math.max(r + 2, ...pos.map((p) => Math.abs(p.dy) + p.r));
  const cy = m.t + amp;
  const H = cy + amp + m.b;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "enxame" }, box);
  ticks.forEach((t) => {
    el("line", { x1: x(t), x2: x(t), y1: m.t - 6, y2: H - m.b + 4, class: "grid" }, svg);
    txt(svg, x(t), H - 8, fmt(t), "tick");
  });
  const rs = [...refs].sort((a, b) => a.v - b.v);
  rs.forEach((ref, k) => {
    el("line", { x1: x(ref.v), x2: x(ref.v), y1: 18, y2: H - m.b + 4, class: "limit" }, svg);
    const perto = rs.length > 1 && Math.abs(x(rs[0].v) - x(rs[1].v)) < 110;
    const anchor = perto ? (k === 0 ? "end" : "start") : x(ref.v) < 60 ? "start" : x(ref.v) > W - 60 ? "end" : "middle";
    txt(svg, x(ref.v) + (anchor === "end" ? -4 : anchor === "start" ? 4 : 0), 13, ref.label, "lbl", anchor);
  });
  const gDots = el("g", {}, svg);
  const mover = [];
  const porNome = new Map();
  const novo = new Map();
  pos.sort((a, b) => a.it.alvo - b.it.alvo).forEach((p) => {
    const g = el("g", { class: "dot" }, gDots);
    const para = [p.x, cy + p.dy];
    const de = antes.get(p.it.nome);
    g.style.transform = `translate(${(de || para)[0]}px, ${(de || para)[1]}px)`;
    if (!de) g.style.opacity = "0";
    el("circle", { r: p.r, fill: p.it.alvo ? COR.s1 : COR.neutro, stroke: "#fff", "stroke-width": 2 }, g);
    const hit = el("circle", { r: p.r + 5, class: "hit" }, g);
    porNome.set(p.it.nome, bindTip(hit, `<strong>${p.it.nome}</strong>${fmt(p.it.valor)}${p.it.extra ? `<br><span class="muted">${p.it.extra}</span>` : ""}`));
    novo.set(p.it.nome, para);
    mover.push(() => { g.style.transform = `translate(${para[0]}px, ${para[1]}px)`; g.style.opacity = "1"; });
    if (p.it.alvo) {
      const anchor = p.x < 90 ? "start" : p.x > W - 90 ? "end" : "middle";
      const gl = el("g", { class: "dot" }, svg);
      gl.style.transform = `translate(${de ? de[0] : p.x}px, 0px)`;
      el("line", { x1: 0, x2: 0, y1: 36, y2: cy + p.dy - p.r - 2, stroke: COR.s1, "stroke-width": 1.5 }, gl);
      txt(gl, 0, 32, `Mogi Guaçu ${fmt(p.it.valor)}`, "val", anchor);
      mover.push(() => { gl.style.transform = `translate(${p.x}px, 0px)`; });
    }
  });
  requestAnimationFrame(() => requestAnimationFrame(() => mover.forEach((f) => f())));
  navegavel(svg, com.map((i) => porNome.get(i.nome)).filter(Boolean), "Comparação entre cidades");
  return novo;
}

export default function Comparacao({ C }) {
  const [grupo, setGrupo] = useState("regiao");
  const [metrica, setMetrica] = useState(METRICAS[0].k);
  const [boxRef, W] = useLargura();
  const svgRef = useRef(null);
  const posicoes = useRef(new Map());

  const m = METRICAS.find((x) => x.k === metrica);
  const lista = C.municipios.filter((x) => x.alvo || x.grupos.includes(grupo));
  const itens = lista.map((x) => ({
    nome: x.nome, alvo: x.alvo, valor: x[m.k],
    extra: [x.populacao ? `${nf0.format(x.populacao)} habitantes` : "", m.k === "saude_pct" && x.saude_pct_siops != null ? `SIOPS: ${pct(x.saude_pct_siops)}` : ""].filter(Boolean).join(" · "),
  }));
  itens.sort((a, b) => (a.valor == null) - (b.valor == null) || (m.melhor === "menor" ? a.valor - b.valor : b.valor - a.valor));
  const med = mediana(itens.filter((i) => i.valor != null && !i.alvo).map((i) => i.valor));
  const refs = [];
  if (med != null) refs.push({ v: med, label: `Mediana ${m.fmt(med)}` });
  if (m.limite) refs.push(m.limite);
  const sem = itens.filter((i) => i.valor == null);

  useEffect(() => {
    if (!W || !svgRef.current) return;
    posicoes.current = desenharEnxame(svgRef.current, W, { itens, fmt: m.fmt, refs }, posicoes.current);
  }, [W, grupo, metrica]); // eslint-disable-line react-hooks/exhaustive-deps

  const alvo = itens.find((i) => i.alvo);
  const comDado = itens.filter((i) => i.valor != null);
  const pos = comDado.indexOf(alvo) + 1;
  const nomeGrupo = grupo === "regiao" ? "cidades da região" : "cidades do mesmo porte";
  let leitura = "";
  if (alvo && alvo.valor != null && med != null) {
    const rel = alvo.valor > med ? "acima" : alvo.valor < med ? "abaixo" : "igual";
    const juizo = !m.melhor || rel === "igual" ? "" : (rel === "acima") === (m.melhor === "maior") ? " Neste indicador, isso é bom." : " Neste indicador, isso é ruim.";
    leitura = `<strong>${m.nome}:</strong> Mogi Guaçu tem <strong>${m.fmt(alvo.valor)}</strong>, ${rel === "igual" ? "igual ao" : `${rel} do`} valor típico das ${nomeGrupo} (${m.fmt(med)}).` +
      (m.melhor ? ` Fica em <strong>${pos}º lugar entre ${comDado.length}</strong>.${juizo}` : "");
  }

  return (
    <>
      <p className="resposta" aria-live="polite" dangerouslySetInnerHTML={{ __html: leitura }} />
      <p className="como-ler">{m.desc[0].toUpperCase() + m.desc.slice(1)}. Cada bolinha é uma cidade; a linha tracejada marca a mediana do grupo (sem Mogi Guaçu) e, quando existe, o limite legal.</p>
      <div className="filtros">
        <div className="filtro">
          <span className="filtro-rotulo" id="lbl-grupo">Comparar com</span>
          <ButtonGroup aria-labelledby="lbl-grupo">
            {[["regiao", "Cidades da região"], ["porte", "Mesmo porte"]].map(([k, n]) => (
              <Button key={k} variant={grupo === k ? "primary" : "outline-primary"} aria-pressed={grupo === k} onClick={() => setGrupo(k)}>{n}</Button>
            ))}
          </ButtonGroup>
        </div>
        <div className="filtro">
          <span className="filtro-rotulo" id="lbl-ind">Indicador</span>
          <div className="d-flex flex-wrap gap-2" role="group" aria-labelledby="lbl-ind">
            {METRICAS.map((x) => (
              <Button key={x.k} size="sm" variant={metrica === x.k ? "dark" : "light"} className="rounded-pill px-3" aria-pressed={metrica === x.k} onClick={() => setMetrica(x.k)}>{x.nome}</Button>
            ))}
          </div>
        </div>
      </div>
      <ul className="legenda" aria-hidden="true">
        <li><span className="sw" style={{ background: COR.s1 }} />Mogi Guaçu</li>
        <li><span className="sw" style={{ background: COR.neutro }} />Outras cidades</li>
      </ul>
      <div ref={boxRef} className="grafico-box"><div ref={svgRef} /></div>
      {sem.length > 0 && <p className="dica-grafico">Sem dado: {sem.map((i) => i.nome).join(", ")}.</p>}
      <TabelaDados cabecalho={["Município", m.nome]} linhas={itens.map((i) => [i.nome, i.valor == null ? "sem dado" : m.fmt(i.valor)])} legenda={`${m.nome} nas ${nomeGrupo}`} />
      <details className="entenda">
        <summary>Quais cidades entram na comparação</summary>
        <div className="entenda-corpo">
          <p>Região: {C.municipios.filter((x) => x.grupos.includes("regiao")).map((x) => x.nome).join(", ")}.</p>
          <p>Mesmo porte: {C.criterios.porte[0].toLowerCase()}{C.criterios.porte.slice(1)}.</p>
          <p>Dados de {C.ano}, o mesmo ano para todas as cidades, em valores da época.</p>
        </div>
      </details>
    </>
  );
}
