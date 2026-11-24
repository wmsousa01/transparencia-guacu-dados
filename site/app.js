/* Transparência Guaçu: desenha os gráficos a partir de window.DADOS (gerado por collect/build.py). */
(() => {
  const D = window.DADOS;
  const NS = "http://www.w3.org/2000/svg";
  const fechados = D.anos.filter((a) => !a.parcial);
  const ult = fechados[fechados.length - 1];
  const parcial = D.anos.find((a) => a.parcial);
  let modo = "real";

  // ---------- formatação ----------
  const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const pct = (v) => (v == null ? "—" : `${v < 0 ? "−" : ""}${nf1.format(Math.abs(v))}%`);
  const mi = (v) => {
    if (v == null) return "—";
    const a = Math.abs(v);
    const s = v < 0 ? "−" : "";
    if (a >= 1e9) return `${s}R$ ${nf1.format(a / 1e9)} bi`;
    if (a >= 1e6) return `${s}R$ ${nf1.format(a / 1e6)} mi`;
    if (a >= 1e3) return `${s}R$ ${nf0.format(a / 1e3)} mil`;
    return `${s}R$ ${nf0.format(a)}`;
  };
  const reais = (v) => (v == null ? "—" : `R$ ${nf0.format(v)}`);
  const money = (a, v) => (v == null ? null : modo === "real" ? v * a.ipca_fator : v);
  const sufixoModo = () => (modo === "real" ? ` (a preços de ${D.base_precos})` : " (valores da época)");

  // ---------- svg helpers ----------
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const txt = (parent, x, y, s, cls, anchor = "middle", extra = {}) => {
    const t = el("text", { x, y, class: cls, "text-anchor": anchor, ...extra }, parent);
    t.textContent = s;
    return t;
  };
  // Barra com 4px arredondados só na ponta de dados; base reta.
  const barPath = (x, y0, y1, w) => {
    const up = y1 < y0;
    const h = Math.abs(y1 - y0);
    const r = Math.min(4, h, w / 2);
    if (h < 0.5) return "";
    return up
      ? `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`
      : `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
  };
  const hbarPath = (x0, y, x1, h) => {
    const w = x1 - x0;
    const r = Math.min(4, w, h / 2);
    if (w < 0.5) return "";
    return `M${x0},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${y + h} ${x1 - r},${y + h}H${x0}Z`;
  };
  const niceTicks = (min, max, n = 5) => {
    const span = max - min || 1;
    const raw = span / n;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  };

  // ---------- tooltip ----------
  const tip = document.getElementById("tooltip");
  const showTip = (ev, html) => {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = ev.clientX + 14;
    let y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };
  const hideTip = () => { tip.hidden = true; };
  const bindTip = (node, html, onEnter, onLeave) => {
    node.addEventListener("pointermove", (e) => { showTip(e, typeof html === "function" ? html() : html); onEnter?.(); });
    node.addEventListener("pointerleave", () => { hideTip(); onLeave?.(); });
  };

  // ---------- tabela (acessibilidade) ----------
  const tabela = (fig, head, rows) => {
    const d = document.createElement("details");
    d.className = "tabela";
    d.innerHTML = `<summary>Ver os números em tabela</summary>`;
    const t = document.createElement("table");
    t.innerHTML = `<thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`)).join("")}</tr>`).join("")}</tbody>`;
    d.appendChild(t);
    fig.appendChild(d);
  };
  const legenda = (fig, items) => {
    const ul = document.createElement("ul");
    ul.className = "legend";
    ul.innerHTML = items.map((i) => `<li><span class="${i.line ? "ln" : "sw"}" style="background:${i.color}"></span>${i.name}</li>`).join("");
    fig.appendChild(ul);
  };
  const cssVar = (n) => getComputedStyle(document.querySelector(".viz-root")).getPropertyValue(n).trim();

  // ---------- coluna com sinal (déficit/superávit) ----------
  function colunasSinal(fig, { anos, valor, nota, tipExtra }) {
    fig.innerHTML = "";
    const W = Math.max(fig.clientWidth - 32, 300);
    const H = 260;
    const m = { t: 20, r: 8, b: 28, l: 64 };
    const vals = anos.map(valor);
    const nums = vals.filter((v) => v != null);
    // folga de 15% para o rótulo do extremo não encostar no eixo
    const ticks = niceTicks(Math.min(0, ...nums) * 1.15, Math.max(0, ...nums) * 1.15, 4);
    const y = (v) => m.t + ((ticks[ticks.length - 1] - v) / (ticks[ticks.length - 1] - ticks[0])) * (H - m.t - m.b);
    const band = (W - m.l - m.r) / anos.length;
    const bw = Math.min(24, band * 0.6);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": fig.dataset.aria || "" }, fig);
    ticks.forEach((t) => {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? "base" : "grid" }, svg);
      txt(svg, m.l - 8, y(t) + 4, mi(t).replace("R$ ", ""), "tick", "end");
    });
    const pos = cssVar("--series-1");
    const neg = cssVar("--neg");
    const iMin = vals.indexOf(Math.min(...nums));
    const iMax = vals.indexOf(Math.max(...nums));
    anos.forEach((a, i) => {
      const cx = m.l + band * i + band / 2;
      txt(svg, cx, H - 8, a.ano, "tick");
      const v = vals[i];
      if (v == null) {
        txt(svg, cx, y(0) - 6, "s/ dado", "tick");
        return;
      }
      el("path", { d: barPath(cx - bw / 2, y(0), y(v), bw), fill: v >= 0 ? pos : neg }, svg);
      if (i === iMin || i === iMax || i === anos.length - 1) {
        txt(svg, cx, v >= 0 ? y(v) - 6 : y(v) + 14, mi(v).replace("R$ ", ""), "val");
      }
      const hit = el("rect", { x: m.l + band * i, y: m.t, width: band, height: H - m.t - m.b, class: "hit" }, svg);
      bindTip(hit, () => `<strong>${a.ano}</strong>${mi(v)}${tipExtra ? `<br><span class="muted">${tipExtra(a)}</span>` : ""}`);
    });
    if (nota) txt(svg, m.l, 12, nota, "lbl", "start");
  }

  // ---------- linhas (% com limites) ----------
  function linhas(fig, { anos, series, limites = [], limitesAbaixo = false, yMax, fmt = pct, yFmtTick = (t) => `${nf0.format(t)}%` }) {
    fig.innerHTML = "";
    if (series.length > 1) legenda(fig, series.map((s) => ({ name: s.name, color: s.color, line: true })));
    const W = Math.max(fig.clientWidth - 32, 300);
    const H = 280;
    const m = { t: 16, r: 72, b: 28, l: 48 };
    const all = series.flatMap((s) => anos.map(s.valor)).filter((v) => v != null);
    const hi = yMax ?? Math.max(...all, ...limites.map((l) => l.y)) * 1.08;
    const ticks = niceTicks(0, hi, 5);
    const top = ticks[ticks.length - 1];
    const y = (v) => m.t + ((top - v) / top) * (H - m.t - m.b);
    const step = (W - m.l - m.r) / (anos.length - 1);
    const x = (i) => m.l + step * i;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, fig);
    ticks.forEach((t) => {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? "base" : "grid" }, svg);
      txt(svg, m.l - 8, y(t) + 4, yFmtTick(t), "tick", "end");
    });
    // Rótulos dos limites acima da linha, alinhados à direita. Limites próximos (< 14px)
    // não empilham: o seguinte vai para a esquerda do anterior, cada um sobre a própria linha.
    let prev = null;
    [...limites].sort((a, b) => b.y - a.y).forEach((l) => {
      el("line", { x1: m.l, x2: W - m.r, y1: y(l.y), y2: y(l.y), class: "limit" }, svg);
      const xEnd = prev && y(l.y) - prev.y < 14 ? prev.x - prev.w - 14 : W - m.r - 4;
      txt(svg, xEnd, limitesAbaixo ? y(l.y) + 14 : y(l.y) - 4, l.label, "lbl", "end");
      prev = { x: xEnd, y: y(l.y), w: l.label.length * 6.6 };
    });
    anos.forEach((a, i) => txt(svg, x(i), H - 8, a.parcial ? `${a.ano}*` : a.ano, "tick"));

    const surface = cssVar("--surface-1");
    const pontos = [];
    series.forEach((s) => {
      let d = "";
      let pen = false;
      anos.forEach((a, i) => {
        const v = s.valor(a);
        if (v == null) { pen = false; return; }
        d += `${pen ? "L" : "M"}${x(i)},${y(v)}`;
        pen = true;
      });
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      anos.forEach((a, i) => {
        const v = s.valor(a);
        if (v == null) return;
        const c = el("circle", { cx: x(i), cy: y(v), r: 4, fill: a.parcial ? surface : s.color, stroke: a.parcial ? s.color : surface, "stroke-width": 2 }, svg);
        pontos.push({ i, s, v, c });
      });
      // rótulo direto no último ponto válido
      const lastI = anos.map(s.valor).map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
      if (lastI != null && series.length <= 4) {
        txt(svg, x(lastI) + 10, y(s.valor(anos[lastI])) + 4, fmt(s.valor(anos[lastI])), "val", "start");
      }
    });
    // crosshair por ano
    const cross = el("line", { y1: m.t, y2: H - m.b, class: "base", opacity: 0 }, svg);
    anos.forEach((a, i) => {
      const hit = el("rect", { x: x(i) - step / 2, y: m.t, width: step, height: H - m.t - m.b, class: "hit" }, svg);
      bindTip(hit, () => {
        const linhasTip = series.map((s) => {
          const v = s.valor(a);
          const calc = (s.calc && a.calculados?.includes(s.calc) ? ' <span class="muted">(calculado)</span>' : "")
            + (s.fonte && a.fonte_minimos?.[s.fonte] === "RREO" ? ' <span class="muted">(RREO)</span>' : "");
          return `${series.length > 1 ? `${s.name}: ` : ""}${v == null ? "sem dado" : fmt(v)}${calc}`;
        }).join("<br>");
        const p = a.parcial ? `<br><span class="muted">12 meses até o ${a.periodo_rgf}</span>` : "";
        return `<strong>${a.ano}</strong>${linhasTip}${p}`;
      }, () => { cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", 1); },
      () => cross.setAttribute("opacity", 0));
    });
  }

  // ---------- barras horizontais ----------
  function barrasH(fig, { itens, color, fmt = mi }) {
    fig.innerHTML = "";
    const W = Math.max(fig.clientWidth - 32, 300);
    const rowH = 30;
    const labelW = Math.min(300, W * 0.45);
    const maxChars = Math.floor((labelW - 12) / 6.6);
    const H = itens.length * rowH + 4;
    const max = Math.max(...itens.map((i) => i.valor));
    const valW = 84;
    const x = (v) => labelW + (v / max) * (W - labelW - valW);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, fig);
    el("line", { x1: labelW, x2: labelW, y1: 0, y2: H, class: "base" }, svg);
    itens.forEach((it, k) => {
      const y0 = k * rowH + 3;
      const nome = it.nome.length > maxChars ? `${it.nome.slice(0, maxChars - 1).trim()}…` : it.nome;
      txt(svg, labelW - 8, y0 + 16, nome, "lbl", "end");
      el("path", { d: hbarPath(labelW, y0 + 2, x(it.valor), 20), fill: color }, svg);
      txt(svg, x(it.valor) + 6, y0 + 16, fmt(it.valor), "val", "start");
      const hit = el("rect", { x: 0, y: y0 - 3, width: W, height: rowH, class: "hit" }, svg);
      bindTip(hit, `<strong>${it.nome}</strong>${fmt(it.valor)}${it.extra ? `<br><span class="muted">${it.extra}</span>` : ""}`);
    });
  }

  // ---------- barra segmentada (composição) ----------
  function segmentada(fig, { partes }) {
    fig.innerHTML = "";
    legenda(fig, partes.map((p) => ({ name: p.nome, color: p.color })));
    const W = Math.max(fig.clientWidth - 32, 300);
    const H = 28;
    const total = partes.reduce((s, p) => s + p.valor, 0);
    const gap = 2;
    const usable = W - gap * (partes.length - 1);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": partes.map((p) => `${p.nome} ${pct((100 * p.valor) / total)}`).join(", ") }, fig);
    let x0 = 0;
    partes.forEach((p) => {
      const w = (p.valor / total) * usable;
      el("rect", { x: x0, y: 0, width: w, height: H, rx: 4, fill: p.color }, svg);
      const share = `${nf0.format((100 * p.valor) / total)}%`;
      if (w > 44) txt(svg, x0 + 8, 18, share, "val", "start", { fill: p.ink || "#ffffff" });
      const hit = el("rect", { x: x0, y: 0, width: w, height: H, class: "hit" }, svg);
      bindTip(hit, `<strong>${p.nome}</strong>${mi(p.valor)} · ${pct((100 * p.valor) / total)}${p.det ? `<br><span class="muted">${p.det}</span>` : ""}`);
      x0 += w + gap;
    });
  }

  // ---------- ranking (barras horizontais com sinal, um município em destaque) ----------
  function ranking(fig, { itens, fmt, refs = [] }) {
    fig.innerHTML = "";
    const W = Math.max(fig.clientWidth - 32, 300);
    const rowH = 28;
    const labelW = Math.min(190, W * 0.34);
    const valW = 76;
    const top = 22; // espaço para os rótulos das linhas de referência
    const com = itens.filter((i) => i.valor != null);
    const sem = itens.filter((i) => i.valor == null);
    const H = top + itens.length * rowH + 4;
    const vals = [...com.map((i) => i.valor), ...refs.map((r) => r.v)];
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const negW = lo < 0 ? valW : 0; // espaço para o rótulo à esquerda das barras negativas
    const x = (v) => labelW + negW + ((v - lo) / (hi - lo || 1)) * (W - labelW - negW - valW);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, fig);
    const destaque = cssVar("--series-1");
    const outros = cssVar("--neutral");

    refs.forEach((r, k) => {
      el("line", { x1: x(r.v), x2: x(r.v), y1: top - 4, y2: H, class: "limit" }, svg);
      txt(svg, x(r.v), 10 + (k % 2) * 0, r.label, "lbl", k === 0 && refs.length > 1 && Math.abs(x(r.v) - x(refs[1].v)) < 120 ? "end" : "middle");
    });
    el("line", { x1: x(0), x2: x(0), y1: top - 4, y2: H, class: "base" }, svg);

    [...com, ...sem].forEach((it, k) => {
      const y0 = top + k * rowH;
      txt(svg, labelW - 8, y0 + 16, it.nome, it.alvo ? "val" : "lbl", "end");
      if (it.valor == null) {
        txt(svg, x(0) + 6, y0 + 16, "sem dado", "tick", "start");
      } else {
        const v = it.valor;
        const fill = it.alvo ? destaque : outros;
        if (v >= 0) el("path", { d: hbarPath(x(0), y0 + 4, x(v), 18), fill }, svg);
        else el("path", { d: hbarPath(x(0), y0 + 4, x(0) + (x(0) - x(v)), 18), fill, transform: `translate(${2 * x(0)},0) scale(-1,1)` }, svg);
        txt(svg, v >= 0 ? x(v) + 6 : x(v) - 6, y0 + 16, fmt(v), it.alvo ? "val" : "tick", v >= 0 ? "start" : "end");
      }
      const hit = el("rect", { x: 0, y: y0, width: W, height: rowH, class: "hit" }, svg);
      bindTip(hit, `<strong>${it.nome}</strong>${it.valor == null ? "sem dado" : fmt(it.valor)}${it.extra ? `<br><span class="muted">${it.extra}</span>` : ""}`);
    });
  }

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
  let grupo = "regiao";
  let metrica = METRICAS[0].k;
  const mediana = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const n = s.length;
    return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
  };

  function renderComparacao() {
    const C = D.comparacao;
    if (!C) { document.getElementById("sec-comparacao").hidden = true; return; }
    const m = METRICAS.find((x) => x.k === metrica);
    const lista = C.municipios.filter((x) => x.alvo || x.grupos.includes(grupo));
    const itens = lista.map((x) => ({
      nome: x.nome, alvo: x.alvo, valor: x[m.k],
      extra: [x.populacao ? `${nf0.format(x.populacao)} habitantes` : "",
        m.k === "saude_pct" && x.saude_pct_siops != null ? `SIOPS: ${pct(x.saude_pct_siops)}` : ""].filter(Boolean).join(" · "),
    }));
    // ordena do "melhor" para o "pior"; sem direção definida, do maior para o menor
    itens.sort((a, b) => (a.valor == null) - (b.valor == null) || (m.melhor === "menor" ? a.valor - b.valor : b.valor - a.valor));
    const vals = itens.filter((i) => i.valor != null && !i.alvo).map((i) => i.valor);
    const med = mediana(vals);
    const refs = [];
    if (med != null) refs.push({ v: med, label: `Mediana ${m.fmt(med)}` });
    if (m.limite) refs.push(m.limite);

    const fig = document.getElementById("c-comparacao");
    ranking(fig, { itens, fmt: m.fmt, refs });
    tabela(fig, ["Município", m.nome], itens.map((i) => [i.nome, i.valor == null ? "sem dado" : m.fmt(i.valor)]));

    const alvo = itens.find((i) => i.alvo);
    const comDado = itens.filter((i) => i.valor != null);
    const pos = comDado.indexOf(alvo) + 1;
    const nomeGrupo = grupo === "regiao" ? "cidades da região" : "cidades do mesmo porte";
    const el2 = document.getElementById("leitura-comparacao");
    if (!alvo || alvo.valor == null) { el2.textContent = ""; return; }
    const rel = med == null ? "" : alvo.valor > med ? "acima" : alvo.valor < med ? "abaixo" : "igual";
    el2.innerHTML = `<strong>${m.nome}</strong> (${m.desc}): Mogi Guaçu tem <strong>${m.fmt(alvo.valor)}</strong>, ` +
      `${rel === "igual" ? "igual à" : `${rel} da`} mediana das ${nomeGrupo} (${m.fmt(med)})` +
      (m.melhor ? `, ${pos}º lugar entre ${comDado.length}, do ${m.melhor === "menor" ? "menor para o maior" : "maior para o menor"}.` : ".");
  }

  function controlesComparacao() {
    const box = document.getElementById("ctl-metrica");
    box.innerHTML = `<span>Indicador:</span>${METRICAS.map((m) => `<button type="button" data-metrica="${m.k}" aria-pressed="${m.k === metrica}">${m.nome}</button>`).join("")}`;
    box.querySelectorAll("[data-metrica]").forEach((b) => b.addEventListener("click", () => {
      metrica = b.dataset.metrica;
      box.querySelectorAll("[data-metrica]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      renderComparacao();
    }));
    document.querySelectorAll("[data-grupo]").forEach((b) => b.addEventListener("click", () => {
      grupo = b.dataset.grupo;
      document.querySelectorAll("[data-grupo]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      renderComparacao();
    }));
    const C = D.comparacao;
    if (C) {
      document.getElementById("nota-comparacao").textContent =
        `Região: ${C.municipios.filter((x) => x.grupos.includes("regiao")).map((x) => x.nome).join(", ")}. ` +
        `Mesmo porte: ${C.criterios.porte[0].toLowerCase()}${C.criterios.porte.slice(1)}. A linha vertical marca a mediana do grupo (sem contar Mogi Guaçu) e, quando existe, o limite legal.`;
    }
  }

  function renderPareceres() {
    const P = D.pareceres || [];
    const box = document.getElementById("pareceres");
    box.innerHTML = [...P].reverse().map((p) => {
      const ok = p.parecer.toLowerCase().startsWith("favor");
      return `<li><span class="ano">${p.ano}</span>${status(ok ? "good" : "critical", p.parecer)}
        ${p.voto ? `<a href="${p.voto}" rel="noopener">Voto (PDF)</a>` : ""}</li>`;
    }).join("");
    document.querySelectorAll("[data-parecer-ultimo]").forEach((n) => { n.textContent = P.length ? P[P.length - 1].ano : "—"; });
  }

  // ---------- status ----------
  const ICON = {
    good: '<path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    warning: '<path d="M8 4v5M8 12h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    serious: '<path d="M8 4v5M8 12h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    critical: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  };
  const status = (nivel, texto) => {
    const fill = cssVar(`--${nivel}`);
    const ink = nivel === "warning" ? "#0b0b0b" : "#ffffff";
    return `<span class="status"><svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="${fill}"/><g style="color:${ink}">${ICON[nivel]}</g></svg>${texto}</span>`;
  };
  const meter = (v, max, marcas, nivel) => {
    const w = Math.min(100, (100 * v) / max);
    return `<div class="meter" aria-hidden="true"><span style="width:${w}%;background:${cssVar(`--${nivel}`)}"></span>${marcas.map((mk) => `<i style="left:${(100 * mk) / max}%"></i>`).join("")}</div>`;
  };

  function tiles() {
    const a = ult;
    const box = document.getElementById("tiles");
    const res = a.resultado_orcamentario;
    const resPct = (100 * res) / a.receita_realizada;
    const pNivel = a.pessoal_pct_rcl >= 54 ? "critical" : a.pessoal_pct_rcl >= 51.3 ? "serious" : a.pessoal_pct_rcl >= 48.6 ? "warning" : "good";
    const pTxt = { good: "Abaixo do alerta", warning: "Limite de alerta", serious: "Limite prudencial", critical: "Acima do teto" }[pNivel];
    const dNivel = a.dcl_pct_rcl >= 120 ? "critical" : a.dcl_pct_rcl >= 108 ? "warning" : "good";
    const rNivel = res >= 0 ? "good" : resPct > -3 ? "warning" : "serious";
    const cx = a.caixa_liquida_apos_rp;
    const cNivel = cx == null ? null : cx >= 0 ? "good" : "serious";
    const pessoalVar = fechados.find((x) => x.ano === a.ano - 5);
    box.innerHTML = `
      <article class="tile">${status(rNivel, res >= 0 ? "Superávit" : "Déficit")}
        <p class="label">Resultado do orçamento</p>
        <p class="value">${mi(money(a, res))}</p>
        <p class="ctx">${pct(Math.abs(resPct))} da receita. Arrecadou ${mi(money(a, a.receita_realizada))} e empenhou ${mi(money(a, a.despesa_empenhada))}.</p>
      </article>
      ${cNivel ? `<article class="tile">${status(cNivel, cx >= 0 ? "Caixa cobre as contas" : "Caixa não cobre as contas")}
        <p class="label">Caixa após restos a pagar</p>
        <p class="value">${mi(money(a, cx))}</p>
        <p class="ctx">Saldo no fim do ano depois de reservar o que ficou para pagar no ano seguinte.</p>
      </article>` : ""}
      <article class="tile">${status(pNivel, pTxt)}
        <p class="label">Gasto com pessoal</p>
        <p class="value">${pct(a.pessoal_pct_rcl)} <span style="font-size:16px;font-weight:400;color:var(--text-secondary)">da receita</span></p>
        ${meter(a.pessoal_pct_rcl, 60, [48.6, 51.3, 54], pNivel)}
        <p class="ctx">Teto da LRF: 54%.${pessoalVar ? ` Em ${pessoalVar.ano} era ${pct(pessoalVar.pessoal_pct_rcl)}.` : ""}</p>
      </article>
      <article class="tile">${status(dNivel, dNivel === "good" ? "Bem abaixo do limite" : dNivel === "warning" ? "Perto do limite" : "Acima do limite")}
        <p class="label">Dívida consolidada líquida</p>
        <p class="value">${pct(a.dcl_pct_rcl)} <span style="font-size:16px;font-weight:400;color:var(--text-secondary)">da receita</span></p>
        ${meter(a.dcl_pct_rcl, 130, [120], dNivel)}
        <p class="ctx">${mi(money(a, a.dcl))}. Limite do Senado: 120%.</p>
      </article>`;
  }

  // ---------- montagem ----------
  function render() {
    tiles();

    const fRes = document.getElementById("c-resultado");
    colunasSinal(fRes, {
      anos: fechados,
      valor: (a) => money(a, a.resultado_orcamentario),
      tipExtra: (a) => `Receita ${mi(money(a, a.receita_realizada))} · despesa ${mi(money(a, a.despesa_empenhada))}`,
      nota: `Resultado orçamentário${sufixoModo()}`,
    });
    tabela(fRes, ["Ano", "Receita", "Despesa empenhada", "Resultado"],
      fechados.map((a) => [a.ano, mi(money(a, a.receita_realizada)), mi(money(a, a.despesa_empenhada)), mi(money(a, a.resultado_orcamentario))]));

    const fCx = document.getElementById("c-caixa");
    colunasSinal(fCx, {
      anos: fechados,
      valor: (a) => money(a, a.caixa_liquida_apos_rp),
      tipExtra: (a) => (a.calculados.includes("caixa_liquida_apos_rp") ? "Calculado: o relatório traz o saldo antes dos restos a pagar" : (a.caixa_liquida_apos_rp == null ? "O relatório deste ano não traz o saldo" : "")),
      nota: `Caixa líquida após restos a pagar${sufixoModo()}`,
    });
    tabela(fCx, ["Ano", "Caixa após restos a pagar"], fechados.map((a) => [a.ano, mi(money(a, a.caixa_liquida_apos_rp))]));

    const fP = document.getElementById("c-pessoal");
    linhas(fP, {
      anos: D.anos,
      series: [{ name: "Pessoal", valor: (a) => a.pessoal_pct_rcl, color: cssVar("--series-1"), calc: "pessoal_pct_rcl" }],
      limites: [{ y: 54, label: "Teto 54%" }, { y: 51.3, label: "Prudencial" }, { y: 48.6, label: "Alerta" }],
      yMax: 60,
    });
    tabela(fP, ["Ano", "Pessoal (% RCL)", "Valor"], D.anos.map((a) => [a.ano, pct(a.pessoal_pct_rcl), mi(money(a, a.pessoal))]));

    const fD = document.getElementById("c-divida");
    linhas(fD, {
      anos: D.anos,
      series: [{ name: "Dívida", valor: (a) => a.dcl_pct_rcl, color: cssVar("--series-1"), calc: "dcl_pct_rcl" }],
      limites: [{ y: 120, label: "Limite 120%" }],
      yMax: 130,
    });
    tabela(fD, ["Ano", "Dívida (% RCL)", "Valor"], D.anos.map((a) => [a.ano, pct(a.dcl_pct_rcl), mi(money(a, a.dcl))]));

    const fM = document.getElementById("c-minimos");
    linhas(fM, {
      anos: fechados,
      series: [
        { name: "Educação, TCE-SP (mínimo 25%)", valor: (a) => a.educacao_pct, color: cssVar("--series-1"), fonte: "educacao_pct" },
        { name: "Saúde, TCE-SP (mínimo 15%)", valor: (a) => a.saude_pct, color: cssVar("--series-2"), fonte: "saude_pct" },
        { name: "Saúde, SIOPS", valor: (a) => a.saude_pct_siops, color: cssVar("--series-3") },
      ],
      limites: [{ y: 25, label: "Mín. educação" }, { y: 15, label: "Mín. saúde" }],
      limitesAbaixo: true,
      yMax: 40,
    });
    tabela(fM, ["Ano", "Educação (TCE-SP)", "Saúde (TCE-SP)", "Saúde (SIOPS)", "Fonte em 2015"],
      fechados.map((a) => [a.ano, pct(a.educacao_pct), pct(a.saude_pct), pct(a.saude_pct_siops),
        Object.values(a.fonte_minimos || {}).includes("RREO") ? "RREO (Siconfi)" : "—"]));

    const fR = document.getElementById("c-rcl");
    const percap = (a) => (a.rcl && a.populacao ? money(a, a.rcl) / a.populacao : null);
    linhas(fR, {
      anos: D.anos,
      series: [{ name: "RCL por habitante", valor: percap, color: cssVar("--series-1") }],
      fmt: reais,
      yFmtTick: (t) => nf0.format(t),
    });
    tabela(fR, ["Ano", "RCL por habitante", "RCL", "População"],
      D.anos.map((a) => [a.ano, reais(percap(a)), mi(money(a, a.rcl)), nf0.format(a.populacao || 0)]));

    const c = ult.receita_composicao;
    const propria = ["impostos_taxas", "contribuicoes", "servicos", "patrimonial", "outras_correntes"].reduce((s, k) => s + (c[k] || 0), 0);
    const fO = document.getElementById("c-origem");
    const partes = [
      { nome: "Arrecadação própria", valor: propria, color: cssVar("--series-1"), det: `Impostos e taxas ${mi(c.impostos_taxas)}, serviços ${mi(c.servicos)}, outras ${mi(propria - c.impostos_taxas - c.servicos)}` },
      { nome: "Transferências do Estado", valor: c.transf_estado, color: cssVar("--series-2"), det: "Principalmente cota-parte do ICMS e do IPVA" },
      { nome: "Transferências da União", valor: c.transf_uniao, color: cssVar("--series-3"), det: "FPM, SUS e programas federais" },
      { nome: "Outras transferências", valor: c.transf_outras, color: cssVar("--series-4"), ink: "#0b0b0b", det: "Sobretudo o retorno do FUNDEB" },
      { nome: "Receitas de capital", valor: c.capital, color: cssVar("--series-5"), det: "Convênios para obras, venda de bens e empréstimos" },
    ].filter((p) => p.valor > 0);
    segmentada(fO, { partes });
    tabela(fO, ["Origem", "Valor (da época)", "Participação"],
      partes.map((p) => [p.nome, mi(p.valor), pct((100 * p.valor) / partes.reduce((s, q) => s + q.valor, 0))]));

    const fF = document.getElementById("c-funcao");
    const fun = Object.entries(ult.despesa_funcao);
    const top = fun.slice(0, 8).map(([nome, valor]) => ({ nome, valor }));
    const resto = fun.slice(8).reduce((s, [, v]) => s + v, 0);
    if (resto > 0) top.push({ nome: "Demais áreas", valor: resto, extra: fun.slice(8).map(([n]) => n).join(", ") });
    barrasH(fF, { itens: top, color: cssVar("--series-1") });
    tabela(fF, ["Área", "Despesa liquidada (da época)"], fun.map(([n, v]) => [n, mi(v)]));

    if (D.fornecedores) {
      const fo = D.fornecedores;
      document.getElementById("nota-fornecedores").textContent =
        `Em ${fo.ano} a Prefeitura pagou ${mi(fo.total_pago)} a ${nf0.format(fo.n_favorecidos)} favorecidos, sem contar a folha. ` +
        `${mi(fo.total_terceiros)} foram para empresas, entidades e prestadores. Estes são os 15 que mais receberam (valores da época).`;
      const fFo = document.getElementById("c-fornecedores");
      barrasH(fFo, { itens: fo.top_terceiros.map((t) => ({ nome: t.nome, valor: t.pago, extra: t.doc ? `CNPJ ${t.doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}` : "" })), color: cssVar("--series-1") });
      tabela(fFo, ["Favorecido", "CNPJ", "Pago"], fo.top_terceiros.map((t) => [t.nome, t.doc || "—", mi(t.pago)]));
      const fPu = document.getElementById("c-publicos");
      barrasH(fPu, { itens: fo.top_publicos.map((t) => ({ nome: t.nome, valor: t.pago })), color: cssVar("--text-muted") });
    }
    renderComparacao();
    renderPareceres();
  }

  function textos() {
    document.querySelectorAll("[data-ano-fechado]").forEach((n) => { n.textContent = ult.ano; });
    document.querySelectorAll("[data-ano-parcial]").forEach((n) => { n.textContent = parcial ? parcial.ano : "—"; });
    document.querySelectorAll("[data-ano-comparacao]").forEach((n) => { n.textContent = D.comparacao?.ano ?? ""; });
    document.querySelectorAll("[data-ano-fornecedores]").forEach((n) => { n.textContent = D.fornecedores?.ano ?? ""; });
    document.querySelectorAll("[data-gerado]").forEach((n) => { n.textContent = new Date(`${D.gerado_em}T12:00`).toLocaleDateString("pt-BR"); });
    document.getElementById("fontes").innerHTML = D.fontes.map((f) => `<li><a href="${f.url}" rel="noopener">${f.nome}</a></li>`).join("");
  }

  document.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => {
    modo = b.dataset.modo;
    document.querySelectorAll("[data-modo]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    render();
  }));
  let t;
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(render, 150); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);

  textos();
  controlesComparacao();
  render();
  // Link direto para uma seção (#h-comparacao): rola só depois que os gráficos têm altura.
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
})();
