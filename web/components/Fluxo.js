"use client";
// O caminho do dinheiro: fluxo de Sankey (origens → Prefeitura → áreas), animado entre anos.
// Desenhado à mão em SVG porque o ApexCharts não tem Sankey; navegável por teclado.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "react-feather";
import { ComoLer, Resposta, TabelaDados, useLargura } from "@/components/ui/base";
import { COR, mi, nf0, pct } from "@/lib/formato";
import { dinheiro } from "@/lib/dados";
import { bindTip, el, navegavel, semMovimento, txt } from "@/lib/svg";

export const ORIGENS = [
  { k: "propria", nome: "Arrecadação própria", curto: "Própria", soma: ["impostos_taxas", "contribuicoes", "servicos", "patrimonial", "outras_correntes"], cor: COR.s1, det: "IPTU, ISS, ITBI, taxas e tarifas de serviços" },
  { k: "estado", nome: "Repasses do Estado", curto: "Estado", soma: ["transf_estado"], cor: COR.s2, det: "Principalmente a parte da cidade no ICMS e no IPVA" },
  { k: "uniao", nome: "Repasses da União", curto: "União", soma: ["transf_uniao"], cor: COR.s3, det: "Fundo de Participação dos Municípios, SUS e programas federais" },
  { k: "outras", nome: "Fundeb e outros repasses", curto: "Fundeb e outros", soma: ["transf_outras"], cor: COR.s4, det: "Sobretudo o retorno do Fundeb, o fundo da educação básica" },
  { k: "capital", nome: "Receitas de capital", curto: "Capital", soma: ["capital"], cor: COR.s5, det: "Convênios para obras, venda de bens e empréstimos" },
];
export const CURTO_AREA = {
  "Encargos Especiais": "Encargos e dívida", "Assistência Social": "Assistência social", "Segurança Pública": "Segurança",
  "Gestão Ambiental": "Meio ambiente", "Desporto e Lazer": "Esporte e lazer", "Ciência e Tecnologia": "Ciência e tecnologia",
  "Previdência Social": "Previdência", "Legislativa": "Câmara Municipal",
};
export const DESC_AREA = {
  "Educação": "Escolas, creches, merenda e transporte escolar",
  "Saúde": "Unidades de saúde, hospital, exames e remédios",
  "Encargos Especiais": "Parcelas e juros da dívida, precatórios e outros encargos",
  "Saneamento": "Saneamento básico: água, esgoto, drenagem e resíduos",
  "Urbanismo": "Ruas, iluminação, praças e serviços urbanos",
  "Administração": "Funcionamento da própria Prefeitura",
  "Assistência Social": "Atendimento a famílias em vulnerabilidade",
  "Previdência Social": "Aposentadorias e pensões dos servidores",
  "Segurança Pública": "Guarda Municipal e Defesa Civil",
  "Legislativa": "Funcionamento da Câmara Municipal",
};

const soma = (xs) => xs.reduce((s, n) => s + n.v, 0);

function dadosFluxo(a, m, destinos) {
  const c = a.receita_composicao;
  const f = a.despesa_funcao;
  const ent = ORIGENS.map((o) => ({ ...o, lado: "ent", v: m(a, o.soma.reduce((s, k) => s + (c[k] || 0), 0)) }));
  const sai = destinos.map((n) => ({ k: `d:${n}`, lado: "sai", nome: n, curto: CURTO_AREA[n] || n, det: DESC_AREA[n] || "", v: m(a, f[n] || 0) }));
  const resto = Object.entries(f).filter(([n]) => !destinos.includes(n)).sort((p, q) => q[1] - p[1]);
  sai.push({ k: "d:demais", lado: "sai", nome: "Demais áreas", curto: "Demais áreas", det: resto.slice(0, 6).map(([n]) => n).join(", ") + (resto.length > 6 ? " e outras" : ""), v: m(a, resto.reduce((s, [, v]) => s + v, 0)) });
  const E = soma(ent);
  const S = soma(sai);
  ent.push({ k: "reservas", lado: "ent", nome: "Saldo de anos anteriores", curto: "Saldo anterior", cor: COR.neutro, v: Math.max(0, S - E),
    det: "Neste ano se gastou mais do que entrou. A diferença saiu de dinheiro guardado ou virou conta para depois." });
  sai.push({ k: "naogasto", lado: "sai", nome: "Não gasto no ano", curto: "Não gasto", v: Math.max(0, E - S),
    det: "Parte do que entrou não virou despesa no ano: ficou em caixa ou paga contas já assumidas." });
  return { a, ent, sai, E, S, T: Math.max(E, S) };
}

// Posições de tudo como números, para interpolar entre dois anos.
function geoFluxo(d, W, H, estreito) {
  const labelW = estreito ? Math.min(116, W * 0.36) : 178;
  const nw = 12;
  const gap = estreito ? 7 : 10;
  const pt = 34;
  const pb = 6;
  const xL = labelW;
  const xR = W - labelW - nw;
  const xM = (W - nw) / 2;
  const nL = d.ent.filter((n) => n.v > 0).length;
  const nR = d.sai.filter((n) => n.v > 0).length;
  const k = (H - pt - pb - (Math.max(nL, nR) - 1) * gap) / d.T;
  const coluna = (lista, n) => {
    let y = pt + (H - pt - pb - (d.T * k + (n - 1) * gap)) / 2;
    return lista.map((no) => { const g = { y, h: no.v * k }; if (no.v > 0) y += g.h + gap; return g; });
  };
  const L = coluna(d.ent, nL);
  const R = coluna(d.sai, nR);
  const mh = d.T * k;
  const my = pt + (H - pt - pb - mh) / 2;
  const links = {};
  let ym = my;
  d.ent.forEach((n, i) => { links[`${n.k}>m`] = [L[i].y, L[i].y + L[i].h, ym, ym + L[i].h]; ym += L[i].h; });
  ym = my;
  d.sai.forEach((n, i) => { links[`m>${n.k}`] = [ym, ym + R[i].h, R[i].y, R[i].y + R[i].h]; ym += R[i].h; });
  const lh = estreito ? 28 : 32;
  const rotulos = (lista, gs) => {
    const vis = lista.map((n, i) => ({ i, y: gs[i].y + gs[i].h / 2 })).filter((o) => lista[o.i].v > 0);
    for (let j = 1; j < vis.length; j++) vis[j].y = Math.max(vis[j].y, vis[j - 1].y + lh);
    if (vis.length) vis[vis.length - 1].y = Math.min(vis[vis.length - 1].y, H - lh / 2);
    for (let j = vis.length - 2; j >= 0; j--) vis[j].y = Math.min(vis[j].y, vis[j + 1].y - lh);
    const out = gs.map((g) => g.y + g.h / 2);
    vis.forEach((o) => { out[o.i] = o.y; });
    return out;
  };
  return { L, R, links, mid: [my, mh], labL: rotulos(d.ent, L), labR: rotulos(d.sai, R), xL, xR, xM, nw };
}
const lerpGeo = (a, b, t) => {
  const l = (p, q) => p + (q - p) * t;
  const arr = (p, q) => p.map((v, i) => l(v, q[i]));
  const links = {};
  Object.keys(b.links).forEach((k) => { links[k] = arr(a.links[k] || b.links[k], b.links[k]); });
  return {
    ...b, links,
    L: b.L.map((g, i) => ({ y: l(a.L[i].y, g.y), h: l(a.L[i].h, g.h) })),
    R: b.R.map((g, i) => ({ y: l(a.R[i].y, g.y), h: l(a.R[i].h, g.h) })),
    mid: arr(a.mid, b.mid), labL: arr(a.labL, b.labL), labR: arr(a.labR, b.labR),
  };
};
const fita = (x0, a0, a1, x1, b0, b1) => {
  const xm = (x0 + x1) / 2;
  return `M${x0},${a0}C${xm},${a0} ${xm},${b0} ${x1},${b0}L${x1},${b1}C${xm},${b1} ${xm},${a1} ${x0},${a1}Z`;
};

// Monta o SVG uma vez e devolve funções para trocar de ano (com animação) e desmontar.
function criarFluxo(box, W, dados0) {
  box.innerHTML = "";
  const estreito = W < 600;
  const H = estreito ? 460 : 430;
  let dados = dados0;
  let geo = geoFluxo(dados, W, H, estreito);
  let raf = 0;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "sankey" }, box);
  const gL = el("g", {}, svg);
  const gN = el("g", {}, svg);
  const gT = el("g", {}, svg);
  const gH = el("g", {}, svg);
  const e = { links: {}, nos: {}, txt: {}, hits: {} };
  const realce = (ks) => { svg.classList.add("foco"); ks.forEach((k) => e.links[k]?.classList.add("on")); };
  const apaga = () => { svg.classList.remove("foco"); Object.values(e.links).forEach((p) => p.classList.remove("on")); };

  const tipNo = (k) => {
    const d = dados;
    const ano = d.a.ano;
    if (k === "mid") return `<strong>Prefeitura em ${ano}</strong>Entraram ${mi(d.E)}<br>Gastos (despesa liquidada): ${mi(d.S)}`;
    const n = [...d.ent, ...d.sai].find((x) => x.k === k);
    if (!n.v) return `<strong>${n.nome}</strong>Não houve em ${ano}`;
    const base = n.lado === "ent" ? d.E : d.S;
    const parte = n.k === "reservas" || n.k === "naogasto" ? "" : ` · ${pct((100 * n.v) / base)} ${n.lado === "ent" ? "do que entrou" : "do gasto"}`;
    return `<strong>${n.nome}</strong>${mi(n.v)}${parte}${n.det ? `<br><span class="muted">${n.det}</span>` : ""}`;
  };

  dados.ent.forEach((n) => {
    const p = el("path", { class: "link", fill: n.cor }, gL);
    e.links[`${n.k}>m`] = p;
    bindTip(p, () => tipNo(n.k), () => realce([`${n.k}>m`]), apaga);
  });
  dados.sai.forEach((n) => {
    const p = el("path", { class: "link sai" }, gL);
    e.links[`m>${n.k}`] = p;
    bindTip(p, () => tipNo(n.k), () => realce([`m>${n.k}`]), apaga);
  });
  const alvos = [];
  const no = (n, x, cor) => {
    e.nos[n.k] = el("rect", { x, width: geo.nw, rx: 2, fill: cor, class: "no" }, gN);
    const t = el("g", { class: "rot" }, gT);
    const anchor = n.lado === "ent" ? "end" : "start";
    el("text", { class: "lbl n", "text-anchor": anchor, y: -3 }, t);
    el("text", { class: "tick v", "text-anchor": anchor, y: 12 }, t);
    e.txt[n.k] = t;
    const hx = n.lado === "ent" ? 0 : geo.xR - 4;
    const hw = n.lado === "ent" ? geo.xL + geo.nw + 4 : W - geo.xR + 4;
    e.hits[n.k] = el("rect", { x: hx, width: hw, class: "hit" }, gH);
    const lk = n.lado === "ent" ? `${n.k}>m` : `m>${n.k}`;
    alvos.push(bindTip(e.hits[n.k], () => tipNo(n.k), () => realce([lk]), apaga));
  };
  dados.ent.forEach((n) => no(n, geo.xL, n.cor));
  e.mid = el("rect", { x: geo.xM, width: geo.nw, rx: 2, fill: COR.texto, class: "no" }, gN);
  e.midTxt = txt(gT, geo.xM + geo.nw / 2, 18, "", "lbl n");
  e.hits.mid = el("rect", { x: geo.xM - 14, width: geo.nw + 28, class: "hit" }, gH);
  alvos.push(bindTip(e.hits.mid, () => tipNo("mid")));
  dados.sai.forEach((n) => no(n, geo.xR, COR.texto2));

  const aplicar = (g) => {
    dados.ent.forEach((n, i) => {
      const [a0, a1, b0, b1] = g.links[`${n.k}>m`];
      e.links[`${n.k}>m`].setAttribute("d", fita(g.xL + g.nw, a0, a1, g.xM, b0, b1));
      e.nos[n.k].setAttribute("y", g.L[i].y);
      e.nos[n.k].setAttribute("height", Math.max(0, g.L[i].h));
      e.txt[n.k].setAttribute("transform", `translate(${g.xL - 8},${g.labL[i]})`);
      e.hits[n.k].setAttribute("y", Math.min(g.L[i].y, g.labL[i] - 15));
      e.hits[n.k].setAttribute("height", Math.max(g.L[i].h, 30));
    });
    dados.sai.forEach((n, i) => {
      const [a0, a1, b0, b1] = g.links[`m>${n.k}`];
      e.links[`m>${n.k}`].setAttribute("d", fita(g.xM + g.nw, a0, a1, g.xR, b0, b1));
      e.nos[n.k].setAttribute("y", g.R[i].y);
      e.nos[n.k].setAttribute("height", Math.max(0, g.R[i].h));
      e.txt[n.k].setAttribute("transform", `translate(${g.xR + g.nw + 8},${g.labR[i]})`);
      e.hits[n.k].setAttribute("y", Math.min(g.R[i].y, g.labR[i] - 15));
      e.hits[n.k].setAttribute("height", Math.max(g.R[i].h, 30));
    });
    e.mid.setAttribute("y", g.mid[0]);
    e.mid.setAttribute("height", g.mid[1]);
    e.hits.mid.setAttribute("y", g.mid[0]);
    e.hits.mid.setAttribute("height", g.mid[1]);
  };
  const textos = () => {
    [...dados.ent, ...dados.sai].forEach((n) => {
      const t = e.txt[n.k];
      const base = n.lado === "ent" ? dados.E : dados.S;
      const parte = `${nf0.format((100 * n.v) / base)}%`;
      const extra = n.k === "reservas" || n.k === "naogasto";
      t.querySelector(".n").textContent = estreito ? n.curto : n.nome;
      t.querySelector(".v").textContent = estreito ? (extra ? mi(n.v).replace("R$ ", "") : parte) : extra ? mi(n.v) : `${mi(n.v)} · ${parte}`;
      t.style.opacity = n.v > 0 ? 1 : 0;
      e.nos[n.k].style.opacity = n.v > 0 ? 1 : 0;
    });
    e.midTxt.textContent = estreito ? `Prefeitura · ${mi(dados.E)}` : `Prefeitura · ${mi(dados.E)} entraram`;
  };
  textos();
  aplicar(geo);
  navegavel(svg, alvos, "O caminho do dinheiro");

  return {
    trocar(novos) {
      const de = geo;
      dados = novos;
      geo = geoFluxo(dados, W, H, estreito);
      textos();
      cancelAnimationFrame(raf);
      if (semMovimento()) { aplicar(geo); return; }
      const para = geo;
      const t0 = performance.now();
      const passo = (t) => {
        const p = Math.min(1, (t - t0) / 650);
        const ease = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
        aplicar(lerpGeo(de, para, ease));
        if (p < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    },
    destruir() { cancelAnimationFrame(raf); box.innerHTML = ""; },
  };
}

export default function Fluxo({ D, fechados, modo }) {
  const anos = useMemo(() => fechados.filter((a) => a.receita_composicao && a.despesa_funcao), [fechados]);
  const destinos = useMemo(() => {
    const tot = {};
    anos.forEach((a) => Object.entries(a.despesa_funcao).forEach(([n, v]) => { tot[n] = (tot[n] || 0) + v * a.ipca_fator; }));
    return Object.entries(tot).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([n]) => n);
  }, [anos]);
  const [ano, setAno] = useState(anos[anos.length - 1]?.ano);
  const [tocando, setTocando] = useState(false);
  const [boxRef, W] = useLargura();
  const svgRef = useRef(null);
  const api = useRef(null);
  const m = dinheiro(modo);
  const a = anos.find((x) => x.ano === ano);
  const d = useMemo(() => dadosFluxo(a, m, destinos), [a, modo, destinos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remonta ao mudar largura ou modo; troca de ano anima sobre o mesmo SVG.
  useEffect(() => {
    if (!W || !svgRef.current) return;
    api.current = criarFluxo(svgRef.current, W, d);
    return () => api.current?.destruir();
  }, [W, modo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.trocar(d); }, [ano]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tocando) return;
    const id = setInterval(() => {
      setAno((atual) => {
        const i = anos.findIndex((x) => x.ano === atual);
        if (i >= anos.length - 1) { setTocando(false); return atual; }
        return anos[i + 1].ano;
      });
    }, 1400);
    return () => clearInterval(id);
  }, [tocando, anos]);
  const tocar = () => {
    if (tocando) { setTocando(false); return; }
    if (ano === anos[anos.length - 1].ano) setAno(anos[0].ano);
    setTocando(true);
  };

  if (!a) return null;
  const prop = d.ent.find((n) => n.k === "propria").v;
  const areas = d.sai.filter((n) => n.k.startsWith("d:") && n.k !== "d:demais").sort((p, q) => q.v - p.v);
  const resposta = `Em ${ano} entraram <strong>${mi(d.E)}</strong>. De cada R$ 100, <strong>R$ ${nf0.format((100 * prop) / d.E)} foram arrecadados pela própria cidade</strong>, ` +
    `e o resto veio de repasses. Na saída, <strong>${areas[0].nome} e ${areas[1].nome.toLowerCase()} levaram R$ ${nf0.format((100 * (areas[0].v + areas[1].v)) / d.S)} de cada R$ 100</strong> gastos.`;
  const lin = (lista, base) => lista.filter((n) => n.v > 0).map((n) => [n.nome, mi(n.v), pct((100 * n.v) / base)]);

  return (
    <>
      <Resposta html={resposta} vivo={!tocando} />
      <ComoLer>à esquerda, de onde o dinheiro veio. No meio, o caixa da Prefeitura. À direita, as áreas em que foi gasto. Quanto mais grossa a faixa, mais dinheiro. Passe o dedo ou o mouse numa faixa para ver o valor, ou toque ▶ para ver os anos passando.</ComoLer>
      <div className="tempo">
        <button type="button" className="btn btn-primary tocar" aria-pressed={tocando} aria-label={tocando ? "Pausar" : "Reproduzir a evolução ano a ano"} onClick={tocar}>
          {tocando ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        <div className="tempo-trilho">
          <label htmlFor="ano-fluxo">Ano <output htmlFor="ano-fluxo">{ano}</output></label>
          <input type="range" className="form-range" id="ano-fluxo" min={anos[0].ano} max={anos[anos.length - 1].ano} step={1} value={ano}
            onChange={(ev) => { setTocando(false); setAno(+ev.target.value); }} />
          <div className="tempo-limites" aria-hidden="true"><span>{anos[0].ano}</span><span>{anos[anos.length - 1].ano}</span></div>
        </div>
      </div>
      <div ref={boxRef} className="grafico-box"><div ref={svgRef} /></div>
      <TabelaDados titulo={`Ver os números de ${ano} em tabela`} legenda={`De onde veio e para onde foi o dinheiro em ${ano}`}
        cabecalho={["Origem ou destino", "Valor", "Parte"]}
        linhas={[...lin(d.ent.filter((n) => n.k !== "reservas"), d.E), ...lin(d.sai.filter((n) => n.k !== "naogasto"), d.S)]} />
    </>
  );
}
