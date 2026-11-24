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

  // Ano no eixo: em telas estreitas vira '15, '16… para não encavalar.
  const rotuloAno = (a, largura) => `${largura < 40 ? `’${String(a.ano).slice(2)}` : a.ano}${a.parcial ? "*" : ""}`;

  // ---------- movimento ----------
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)");
  // Gráficos começam "recolhidos" e se desenham quando entram na tela (uma vez só).
  function animarAoVer() {
    if (semMovimento.matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -10% 0px" });
    document.querySelectorAll(".chart, .recibo").forEach((f) => { f.classList.add("anima"); io.observe(f); });
  }
  // Números dos cartões contam do zero até o valor na primeira exibição.
  let contou = false;
  function contar(box) {
    if (contou || semMovimento.matches) return;
    contou = true;
    const nums = [...box.querySelectorAll("[data-n]")];
    const t0 = performance.now();
    const passo = (t) => {
      const p = Math.min(1, (t - t0) / 1000);
      const e = 1 - (1 - p) ** 3;
      nums.forEach((n) => { const v = +n.dataset.n * e; n.textContent = n.dataset.f === "pct" ? pct(v) : mi(v); });
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // ---------- tooltip ----------
  const tip = document.getElementById("tooltip");
  const showTipAt = (cx, cy, html) => {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = cx + 14;
    let y = cy + 14;
    if (x + r.width > innerWidth - 8) x = Math.max(8, cx - r.width - 14);
    if (y + r.height > innerHeight - 8) y = cy - r.height - 14;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };
  const showTip = (ev, html) => showTipAt(ev.clientX, ev.clientY, html);
  const hideTip = () => { tip.hidden = true; };
  // Cada alvo serve ao mouse, ao toque (pointerdown) e ao teclado (ver navegavel()).
  const bindTip = (node, html, onEnter, onLeave) => {
    const h = typeof html === "function" ? html : () => html;
    const on = (e) => { showTip(e, h()); onEnter?.(); };
    node.addEventListener("pointermove", on);
    node.addEventListener("pointerdown", on);
    node.addEventListener("pointerleave", () => { hideTip(); onLeave?.(); });
    return { hit: node, html: h, enter: onEnter, leave: onLeave };
  };
  addEventListener("scroll", hideTip, { passive: true });

  // Teclado: o gráfico recebe foco; setas percorrem os anos/itens; o valor é anunciado ao leitor de tela.
  const anuncio = document.getElementById("anuncio");
  const semTags = (h) => h.replace(/<br>|<\/strong>/g, ". ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  function navegavel(fig, svg, alvos) {
    if (!alvos.length) return;
    const titulo = fig.closest("section")?.querySelector("h2")?.textContent.trim() || "Gráfico";
    svg.setAttribute("tabindex", "0");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${titulo}. Gráfico com ${alvos.length} itens: use as setas para ouvir cada valor, ou abra a tabela abaixo.`);
    let i = -1;
    const ir = (k) => {
      if (i >= 0) { alvos[i].leave?.(); alvos[i].hit.classList.remove("foco"); }
      i = Math.max(0, Math.min(alvos.length - 1, k));
      const a = alvos[i];
      a.enter?.();
      a.hit.classList.add("foco");
      const r = a.hit.getBoundingClientRect();
      showTipAt(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40), a.html());
      anuncio.textContent = semTags(a.html());
    };
    svg.addEventListener("keydown", (e) => {
      const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (passo) ir(i < 0 ? (passo > 0 ? 0 : alvos.length - 1) : i + passo);
      else if (e.key === "Home") ir(0);
      else if (e.key === "End") ir(alvos.length - 1);
      else if (e.key === "Escape") hideTip();
      else return;
      e.preventDefault();
    });
    svg.addEventListener("blur", () => {
      hideTip();
      if (i >= 0) { alvos[i].leave?.(); alvos[i].hit.classList.remove("foco"); }
      i = -1;
    });
  }

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
  function colunasSinal(fig, { anos, valor, nota, tipExtra, sinalPos = "sobra", sinalNeg = "falta" }) {
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
    const alvos = [];
    anos.forEach((a, i) => {
      const cx = m.l + band * i + band / 2;
      txt(svg, cx, H - 8, rotuloAno(a, band), "tick");
      const v = vals[i];
      const hit = el("rect", { x: m.l + band * i, y: m.t, width: band, height: H - m.t - m.b, class: "hit" }, svg);
      if (v == null) {
        txt(svg, cx, y(0) - 6, "s/ dado", "tick");
        alvos.push(bindTip(hit, () => `<strong>${a.ano}</strong>sem dado${tipExtra ? `<br><span class="muted">${tipExtra(a)}</span>` : ""}`));
        return;
      }
      el("path", { d: barPath(cx - bw / 2, y(0), y(v), bw), fill: v >= 0 ? pos : neg, class: `bar ${v >= 0 ? "pos" : "neg"}`, style: `transition-delay:${i * 45}ms` }, svg);
      if (i === iMin || i === iMax || i === anos.length - 1) {
        txt(svg, cx, v >= 0 ? y(v) - 6 : y(v) + 14, mi(v).replace("R$ ", ""), "val");
      }
      const leg = v >= 0 ? sinalPos : sinalNeg;
      alvos.push(bindTip(hit, () => `<strong>${a.ano}: ${leg} de ${mi(Math.abs(v))}</strong>${tipExtra ? `<span class="muted">${tipExtra(a)}</span>` : ""}`));
    });
    if (nota) txt(svg, m.l, 12, nota, "lbl", "start");
    navegavel(fig, svg, alvos);
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
    anos.forEach((a, i) => txt(svg, x(i), H - 8, rotuloAno(a, step), "tick"));

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
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: "traco" }, svg);
      anos.forEach((a, i) => {
        const v = s.valor(a);
        if (v == null) return;
        const c = el("circle", { cx: x(i), cy: y(v), r: 4, fill: a.parcial ? surface : s.color, stroke: a.parcial ? s.color : surface, "stroke-width": 2, class: "ponto" }, svg);
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
    const alvos = [];
    anos.forEach((a, i) => {
      const hit = el("rect", { x: x(i) - step / 2, y: m.t, width: step, height: H - m.t - m.b, class: "hit" }, svg);
      alvos.push(bindTip(hit, () => {
        const linhasTip = series.map((s) => {
          const v = s.valor(a);
          const calc = (s.calc && a.calculados?.includes(s.calc) ? ' <span class="muted">(calculado)</span>' : "")
            + (s.fonte && a.fonte_minimos?.[s.fonte] === "RREO" ? ' <span class="muted">(RREO)</span>' : "");
          return `${series.length > 1 ? `${s.name}: ` : ""}${v == null ? "sem dado" : fmt(v)}${calc}`;
        }).join("<br>");
        const p = a.parcial ? `<br><span class="muted">Ano em curso: 12 meses até o ${a.periodo_rgf}</span>` : "";
        return `<strong>${a.ano}</strong>${linhasTip}${p}`;
      }, () => { cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", 1); },
      () => cross.setAttribute("opacity", 0)));
    });
    navegavel(fig, svg, alvos);
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
    const alvos = [];
    itens.forEach((it, k) => {
      const y0 = k * rowH + 3;
      const nome = it.nome.length > maxChars ? `${it.nome.slice(0, maxChars - 1).trim()}…` : it.nome;
      txt(svg, labelW - 8, y0 + 16, nome, "lbl", "end");
      el("path", { d: hbarPath(labelW, y0 + 2, x(it.valor), 20), fill: color, class: "hbar", style: `transition-delay:${k * 40}ms` }, svg);
      txt(svg, x(it.valor) + 6, y0 + 16, fmt(it.valor), "val", "start");
      const hit = el("rect", { x: 0, y: y0 - 3, width: W, height: rowH, class: "hit" }, svg);
      alvos.push(bindTip(hit, `<strong>${it.nome}</strong>${fmt(it.valor)}${it.extra ? `<br><span class="muted">${it.extra}</span>` : ""}`));
    });
    navegavel(fig, svg, alvos);
  }

  // ---------- enxame (comparação): cada cidade é uma bolinha numa régua ----------
  // As bolinhas lembram a posição anterior e deslizam até a nova quando o indicador muda.
  function enxame(fig, { itens, fmt, refs = [] }) {
    const antes = fig._pos || new Map();
    fig.innerHTML = "";
    const destaque = cssVar("--series-1");
    const outros = cssVar("--neutral");
    const surface = cssVar("--surface-1");
    legenda(fig, [{ name: "Mogi Guaçu", color: destaque }, { name: "Outras cidades", color: outros }]);
    const W = Math.max(fig.clientWidth - 32, 300);
    const estreito = W < 500;
    const com = itens.filter((i) => i.valor != null);
    const sem = itens.filter((i) => i.valor == null);
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
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}` }, fig);
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
      el("circle", { r: p.r, fill: p.it.alvo ? destaque : outros, stroke: surface, "stroke-width": 2 }, g);
      const hit = el("circle", { r: p.r + 5, class: "hit" }, g);
      porNome.set(p.it.nome, bindTip(hit, `<strong>${p.it.nome}</strong>${fmt(p.it.valor)}${p.it.extra ? `<br><span class="muted">${p.it.extra}</span>` : ""}`));
      novo.set(p.it.nome, para);
      mover.push(() => { g.style.transform = `translate(${para[0]}px, ${para[1]}px)`; g.style.opacity = "1"; });
      if (p.it.alvo) {
        // rótulo de Mogi Guaçu numa faixa própria, com fio até a bolinha
        const anchor = p.x < 90 ? "start" : p.x > W - 90 ? "end" : "middle";
        const gl = el("g", { class: "dot" }, svg);
        gl.style.transform = `translate(${de ? de[0] : p.x}px, 0px)`;
        el("line", { x1: 0, x2: 0, y1: 36, y2: cy + p.dy - p.r - 2, stroke: destaque, "stroke-width": 1.5 }, gl);
        txt(gl, 0, 32, `Mogi Guaçu ${fmt(p.it.valor)}`, "val", anchor);
        mover.push(() => { gl.style.transform = `translate(${p.x}px, 0px)`; });
      }
    });
    requestAnimationFrame(() => requestAnimationFrame(() => mover.forEach((f) => f())));
    fig._pos = novo;
    if (sem.length) {
      const p = document.createElement("p");
      p.className = "dica-grafico";
      p.textContent = `Sem dado: ${sem.map((i) => i.nome).join(", ")}.`;
      fig.appendChild(p);
    }
    navegavel(fig, svg, com.map((i) => porNome.get(i.nome)).filter(Boolean));
  }

  // ---------- o caminho do dinheiro (fluxo de Sankey, animado por ano) ----------
  const ORIGENS = [
    { k: "propria", nome: "Arrecadação própria", curto: "Própria", soma: ["impostos_taxas", "contribuicoes", "servicos", "patrimonial", "outras_correntes"], cor: "--series-1", det: "IPTU, ISS, ITBI, taxas e tarifas de serviços" },
    { k: "estado", nome: "Repasses do Estado", curto: "Estado", soma: ["transf_estado"], cor: "--series-2", det: "Principalmente a parte da cidade no ICMS e no IPVA" },
    { k: "uniao", nome: "Repasses da União", curto: "União", soma: ["transf_uniao"], cor: "--series-3", det: "Fundo de Participação dos Municípios, SUS e programas federais" },
    { k: "outras", nome: "Fundeb e outros repasses", curto: "Fundeb e outros", soma: ["transf_outras"], cor: "--series-4", det: "Sobretudo o retorno do Fundeb, o fundo da educação básica" },
    { k: "capital", nome: "Receitas de capital", curto: "Capital", soma: ["capital"], cor: "--series-5", det: "Convênios para obras, venda de bens e empréstimos" },
  ];
  const CURTO_AREA = {
    "Encargos Especiais": "Encargos e dívida", "Assistência Social": "Assistência social", "Segurança Pública": "Segurança",
    "Gestão Ambiental": "Meio ambiente", "Desporto e Lazer": "Esporte e lazer", "Ciência e Tecnologia": "Ciência e tecnologia",
    "Previdência Social": "Previdência", "Legislativa": "Câmara Municipal",
  };
  const DESC_AREA = {
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
  const anosFluxo = fechados.filter((a) => a.receita_composicao && a.despesa_funcao);
  const DESTINOS = (() => {
    const tot = {};
    anosFluxo.forEach((a) => Object.entries(a.despesa_funcao).forEach(([n, v]) => { tot[n] = (tot[n] || 0) + v * a.ipca_fator; }));
    return Object.entries(tot).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([n]) => n);
  })();
  const fluxo = { ano: anosFluxo.length ? anosFluxo[anosFluxo.length - 1].ano : null, geo: null, dados: null, els: null, raf: 0, timer: null };
  const soma = (xs) => xs.reduce((s, n) => s + n.v, 0);

  function dadosFluxo(a) {
    const c = a.receita_composicao;
    const f = a.despesa_funcao;
    const ent = ORIGENS.map((o) => ({ ...o, lado: "ent", cor: cssVar(o.cor), v: money(a, o.soma.reduce((s, k) => s + (c[k] || 0), 0)) }));
    const sai = DESTINOS.map((n) => ({ k: `d:${n}`, lado: "sai", nome: n, curto: CURTO_AREA[n] || n, det: DESC_AREA[n] || "", v: money(a, f[n] || 0) }));
    const resto = Object.entries(f).filter(([n]) => !DESTINOS.includes(n)).sort((p, q) => q[1] - p[1]);
    sai.push({ k: "d:demais", lado: "sai", nome: "Demais áreas", curto: "Demais áreas", det: resto.slice(0, 6).map(([n]) => n).join(", ") + (resto.length > 6 ? " e outras" : ""), v: money(a, resto.reduce((s, [, v]) => s + v, 0)) });
    const E = soma(ent);
    const S = soma(sai);
    ent.push({ k: "reservas", lado: "ent", nome: "Saldo de anos anteriores", curto: "Saldo anterior", cor: cssVar("--neutral"), v: Math.max(0, S - E),
      det: "Neste ano se gastou mais do que entrou. A diferença saiu de dinheiro guardado ou virou conta para depois." });
    sai.push({ k: "naogasto", lado: "sai", nome: "Não gasto no ano", curto: "Não gasto", v: Math.max(0, E - S),
      det: "Parte do que entrou não virou despesa no ano: ficou em caixa ou paga contas já assumidas." });
    return { a, ent, sai, E, S, T: Math.max(E, S) };
  }

  // Posições de tudo (nós, faixas, rótulos) como números, para poder interpolar entre dois anos.
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

  function aplicarFluxo(g) {
    const e = fluxo.els;
    const d = fluxo.dados;
    d.ent.forEach((n, i) => {
      const [a0, a1, b0, b1] = g.links[`${n.k}>m`];
      e.links[`${n.k}>m`].setAttribute("d", fita(g.xL + g.nw, a0, a1, g.xM, b0, b1));
      e.nos[n.k].setAttribute("y", g.L[i].y);
      e.nos[n.k].setAttribute("height", Math.max(0, g.L[i].h));
      e.txt[n.k].setAttribute("transform", `translate(${g.xL - 8},${g.labL[i]})`);
      e.hits[n.k].setAttribute("y", Math.min(g.L[i].y, g.labL[i] - 15));
      e.hits[n.k].setAttribute("height", Math.max(g.L[i].h, 30));
    });
    d.sai.forEach((n, i) => {
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
  }

  // Textos que mudam com o ano: rótulos, resposta, tabela.
  function textosFluxo() {
    const d = fluxo.dados;
    const e = fluxo.els;
    [...d.ent, ...d.sai].forEach((n) => {
      const t = e.txt[n.k];
      const base = n.lado === "ent" ? d.E : d.S;
      t.querySelector(".n").textContent = e.estreito ? n.curto : n.nome;
      const parte = `${nf0.format((100 * n.v) / base)}%`;
      const extra = n.k === "reservas" || n.k === "naogasto";
      t.querySelector(".v").textContent = e.estreito ? (extra ? mi(n.v).replace("R$ ", "") : parte) : extra ? mi(n.v) : `${mi(n.v)} · ${parte}`;
      t.style.opacity = n.v > 0 ? 1 : 0;
      e.nos[n.k].style.opacity = n.v > 0 ? 1 : 0;
    });
    e.midTxt.textContent = e.estreito ? `Prefeitura · ${mi(d.E)}` : `Prefeitura · ${mi(d.E)} entraram`;
    const ano = d.a.ano;
    const prop = d.ent.find((n) => n.k === "propria").v;
    const areas = d.sai.filter((n) => n.k.startsWith("d:") && n.k !== "d:demais").sort((p, q) => q.v - p.v);
    const [a1, a2] = areas;
    document.getElementById("r-fluxo").innerHTML =
      `Em ${ano} entraram <strong>${mi(d.E)}</strong>. De cada R$ 100, <strong>R$ ${nf0.format((100 * prop) / d.E)} foram arrecadados pela própria cidade</strong>, ` +
      `e o resto veio de repasses. Na saída, <strong>${a1.nome} e ${a2.nome.toLowerCase()} levaram R$ ${nf0.format((100 * (a1.v + a2.v)) / d.S)} de cada R$ 100</strong> gastos.`;
    document.getElementById("ano-fluxo-out").textContent = ano;
    const lin = (lista, base) => lista.filter((n) => n.v > 0).map((n) => `<tr><th scope="row">${n.nome}</th><td>${mi(n.v)}</td><td>${pct((100 * n.v) / base)}</td></tr>`).join("");
    document.getElementById("tabela-fluxo").innerHTML = `<summary>Ver os números de ${ano} em tabela</summary>
      <table><caption class="sr-only">De onde veio o dinheiro em ${ano}</caption><thead><tr><th scope="col">De onde veio</th><th scope="col">Valor</th><th scope="col">Parte</th></tr></thead><tbody>${lin(d.ent.filter((n) => n.k !== "reservas"), d.E)}</tbody></table>
      <table><caption class="sr-only">Para onde foi o dinheiro em ${ano}</caption><thead><tr><th scope="col">Para onde foi</th><th scope="col">Valor</th><th scope="col">Parte</th></tr></thead><tbody>${lin(d.sai.filter((n) => n.k !== "naogasto"), d.S)}</tbody></table>`;
  }

  function tipNo(k) {
    const d = fluxo.dados;
    const ano = d.a.ano;
    if (k === "mid") return `<strong>Prefeitura em ${ano}</strong>Entraram ${mi(d.E)}<br>Gastos (despesa liquidada): ${mi(d.S)}`;
    const n = [...d.ent, ...d.sai].find((x) => x.k === k);
    if (!n.v) return `<strong>${n.nome}</strong>Não houve em ${ano}`;
    const base = n.lado === "ent" ? d.E : d.S;
    const parte = n.k === "reservas" || n.k === "naogasto" ? "" : ` · ${pct((100 * n.v) / base)} ${n.lado === "ent" ? "do que entrou" : "do gasto"}`;
    return `<strong>${n.nome}</strong>${mi(n.v)}${parte}${n.det ? `<br><span class="muted">${n.det}</span>` : ""}`;
  }

  function construirFluxo() {
    const fig = document.getElementById("c-fluxo");
    if (!fig || !anosFluxo.length) return;
    cancelAnimationFrame(fluxo.raf);
    fig.innerHTML = "";
    const W = Math.max(fig.clientWidth - 32, 300);
    const estreito = W < 600;
    const H = estreito ? 460 : 430;
    fluxo.dados = dadosFluxo(anosFluxo.find((x) => x.ano === fluxo.ano));
    const d = fluxo.dados;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "sankey" }, fig);
    const gL = el("g", {}, svg);
    const gN = el("g", {}, svg);
    const gT = el("g", {}, svg);
    const gH = el("g", {}, svg);
    const e = { links: {}, nos: {}, txt: {}, hits: {}, estreito };
    const geo0 = geoFluxo(d, W, H, estreito);
    const realce = (ks) => { svg.classList.add("foco"); ks.forEach((k) => e.links[k]?.classList.add("on")); };
    const apaga = () => { svg.classList.remove("foco"); Object.values(e.links).forEach((p) => p.classList.remove("on")); };
    d.ent.forEach((n) => {
      const p = el("path", { class: "link", fill: n.cor }, gL);
      e.links[`${n.k}>m`] = p;
      bindTip(p, () => tipNo(n.k), () => realce([`${n.k}>m`]), apaga);
    });
    d.sai.forEach((n) => {
      const p = el("path", { class: "link sai" }, gL);
      e.links[`m>${n.k}`] = p;
      bindTip(p, () => tipNo(n.k), () => realce([`m>${n.k}`]), apaga);
    });
    const alvos = [];
    const no = (n, x, cor) => {
      e.nos[n.k] = el("rect", { x, width: geo0.nw, rx: 2, fill: cor, class: "no" }, gN);
      const t = el("g", { class: "rot" }, gT);
      const anchor = n.lado === "ent" ? "end" : "start";
      el("text", { class: "lbl n", "text-anchor": anchor, y: -3 }, t);
      el("text", { class: "tick v", "text-anchor": anchor, y: 12 }, t);
      e.txt[n.k] = t;
      const hx = n.lado === "ent" ? 0 : geo0.xR - 4;
      const hw = n.lado === "ent" ? geo0.xL + geo0.nw + 4 : W - geo0.xR + 4;
      e.hits[n.k] = el("rect", { x: hx, width: hw, class: "hit" }, gH);
      const lk = n.lado === "ent" ? `${n.k}>m` : `m>${n.k}`;
      alvos.push(bindTip(e.hits[n.k], () => tipNo(n.k), () => realce([lk]), apaga));
    };
    d.ent.forEach((n) => no(n, geo0.xL, n.cor));
    e.mid = el("rect", { x: geo0.xM, width: geo0.nw, rx: 2, fill: cssVar("--text-primary"), class: "no" }, gN);
    e.midTxt = txt(gT, geo0.xM + geo0.nw / 2, 18, "", "lbl n");
    e.hits.mid = el("rect", { x: geo0.xM - 14, width: geo0.nw + 28, class: "hit" }, gH);
    alvos.push(bindTip(e.hits.mid, () => tipNo("mid")));
    d.sai.forEach((n) => no(n, geo0.xR, cssVar("--text-secondary")));
    fluxo.els = e;
    fluxo.geo = geo0;
    fluxo.W = W;
    fluxo.H = H;
    textosFluxo();
    aplicarFluxo(geo0);
    navegavel(fig, svg, alvos);
  }

  function irAnoFluxo(ano) {
    if (!fluxo.els || ano === fluxo.ano) return;
    fluxo.ano = ano;
    fluxo.dados = dadosFluxo(anosFluxo.find((x) => x.ano === ano));
    const de = fluxo.geo;
    const para = geoFluxo(fluxo.dados, fluxo.W, fluxo.H, fluxo.els.estreito);
    fluxo.geo = para;
    textosFluxo();
    cancelAnimationFrame(fluxo.raf);
    if (semMovimento.matches) { aplicarFluxo(para); return; }
    const t0 = performance.now();
    const passo = (t) => {
      const p = Math.min(1, (t - t0) / 650);
      const ease = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
      aplicarFluxo(lerpGeo(de, para, ease));
      if (p < 1) fluxo.raf = requestAnimationFrame(passo);
    };
    fluxo.raf = requestAnimationFrame(passo);
  }

  function controlesFluxo() {
    if (!anosFluxo.length) { document.getElementById("cap-caminho").hidden = true; return; }
    const rng = document.getElementById("ano-fluxo");
    const btn = document.getElementById("tocar-fluxo");
    const resp = document.getElementById("r-fluxo");
    rng.min = anosFluxo[0].ano;
    rng.max = anosFluxo[anosFluxo.length - 1].ano;
    rng.value = fluxo.ano;
    document.getElementById("ano-fluxo-min").textContent = rng.min;
    document.getElementById("ano-fluxo-max").textContent = rng.max;
    const parar = () => {
      clearInterval(fluxo.timer);
      fluxo.timer = null;
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Reproduzir a evolução ano a ano");
      btn.querySelector("span").textContent = "▶";
      resp.setAttribute("aria-live", "polite");
    };
    rng.addEventListener("input", () => { parar(); irAnoFluxo(+rng.value); });
    btn.addEventListener("click", () => {
      if (fluxo.timer) { parar(); return; }
      resp.setAttribute("aria-live", "off");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-label", "Pausar");
      btn.querySelector("span").textContent = "❚❚";
      let i = anosFluxo.findIndex((x) => x.ano === fluxo.ano);
      if (i >= anosFluxo.length - 1) i = -1;
      const passo = () => {
        i += 1;
        rng.value = anosFluxo[i].ano;
        irAnoFluxo(anosFluxo[i].ano);
        if (i >= anosFluxo.length - 1) parar();
      };
      passo();
      fluxo.timer = setInterval(passo, 1400);
    });
  }

  // ---------- seu recibo ----------
  function recibo() {
    const inp = document.getElementById("valor-imposto");
    const out = document.getElementById("recibo");
    const fala = document.getElementById("recibo-resumo");
    if (!inp || !ult.despesa_funcao) return;
    const fun = Object.entries(ult.despesa_funcao).sort((p, q) => q[1] - p[1]);
    const tot = fun.reduce((s, [, v]) => s + v, 0);
    const linhasR = fun.slice(0, 8).map(([n, v]) => ({ n: CURTO_AREA[n] || n, s: v / tot, det: DESC_AREA[n] || "" }));
    const resto = fun.slice(8).reduce((s, [, v]) => s + v, 0) / tot;
    if (resto > 0) linhasR.push({ n: "Demais áreas", s: resto, det: `${fun.slice(8, 12).map(([n]) => n).join(", ")} e outras` });
    const maxS = Math.max(...linhasR.map((l) => l.s));
    const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const ler = () => {
      const v = parseFloat(inp.value.replace(/[^\d,]/g, "").replace(",", "."));
      return Number.isFinite(v) && v > 0 ? v : 0;
    };
    out.innerHTML = `<p class="recibo-topo"><span>Recibo do contribuinte</span><span>Mogi Guaçu · ${ult.ano}</span></p>
      <ul>${linhasR.map((l, i) => `<li><span class="r-nome">${l.n}${l.det ? `<small>${l.det}</small>` : ""}</span><span class="r-barra" aria-hidden="true"><i style="width:${((100 * l.s) / maxS).toFixed(1)}%;transition-delay:${i * 60}ms"></i></span><span class="r-valor" data-s="${l.s}"></span></li>`).join("")}</ul>
      <p class="recibo-total"><span>Total</span><span id="recibo-total"></span></p>`;
    let t;
    const atualizar = () => {
      const v = ler();
      out.querySelectorAll(".r-valor").forEach((n) => { n.textContent = brl.format(v * +n.dataset.s); });
      document.getElementById("recibo-total").textContent = brl.format(v);
      clearTimeout(t);
      t = setTimeout(() => {
        fala.textContent = v ? `Dos seus ${brl.format(v)}, ${brl.format(v * linhasR[0].s)} vão para ${linhasR[0].n.toLowerCase()} e ${brl.format(v * linhasR[1].s)} para ${linhasR[1].n.toLowerCase()}.` : "";
      }, 500);
    };
    inp.addEventListener("input", atualizar);
    inp.addEventListener("blur", () => { const v = ler(); if (v) inp.value = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v); });
    document.querySelectorAll("[data-imposto]").forEach((b) => b.addEventListener("click", () => {
      inp.value = new Intl.NumberFormat("pt-BR").format(+b.dataset.imposto);
      atualizar();
    }));
    atualizar();
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
    enxame(fig, { itens, fmt: m.fmt, refs });
    tabela(fig, ["Município", m.nome], itens.map((i) => [i.nome, i.valor == null ? "sem dado" : m.fmt(i.valor)]));

    const alvo = itens.find((i) => i.alvo);
    const comDado = itens.filter((i) => i.valor != null);
    const pos = comDado.indexOf(alvo) + 1;
    const nomeGrupo = grupo === "regiao" ? "cidades da região" : "cidades do mesmo porte";
    const el2 = document.getElementById("leitura-comparacao");
    if (!alvo || alvo.valor == null) { el2.textContent = ""; return; }
    const rel = med == null ? "" : alvo.valor > med ? "acima" : alvo.valor < med ? "abaixo" : "igual";
    const juizo = !m.melhor || rel === "igual" ? "" : (rel === "acima") === (m.melhor === "maior") ? " Neste indicador, isso é bom." : " Neste indicador, isso é ruim.";
    el2.innerHTML = `<strong>${m.nome}:</strong> Mogi Guaçu tem <strong>${m.fmt(alvo.valor)}</strong>, ` +
      `${rel === "igual" ? "igual ao" : `${rel} do`} valor típico das ${nomeGrupo} (${m.fmt(med)}).` +
      (m.melhor ? ` Fica em <strong>${pos}º lugar entre ${comDado.length}</strong>.${juizo}` : "") +
      `<br><span class="como-ler">${m.desc[0].toUpperCase()}${m.desc.slice(1)}.</span>`;
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
    const fav = P.filter((p) => p.parecer.toLowerCase().startsWith("favor"));
    const desf = P.filter((p) => !p.parecer.toLowerCase().startsWith("favor"));
    if (P.length) {
      document.getElementById("r-pareceres").innerHTML =
        `Das <strong>${P.length} contas anuais</strong> analisadas entre ${P[0].ano} e ${P[P.length - 1].ano}, ` +
        `<strong>${fav.length} receberam parecer favorável</strong> e ${desf.length} desfavorável` +
        (desf.length ? ` (${desf.map((p) => p.ano).join(", ")}).` : ".");
    }
  }

  // ---------- respostas curtas: a frase que o cidadão leva para casa ----------
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const setR = (id, html) => { const n = document.getElementById(id); if (n) n.innerHTML = html; };
  function respostas() {
    const a = ult;
    const ano = a.ano;
    const ultimos5 = fechados.slice(-5);

    const res = a.resultado_orcamentario;
    const nDef = ultimos5.filter((x) => x.resultado_orcamentario < 0).length;
    setR("r-resultado", (res >= 0
      ? `<strong>Sim.</strong> Em ${ano} a Prefeitura arrecadou <strong>${mi(money(a, res))} a mais</strong> do que se comprometeu a gastar.`
      : `<strong>Não.</strong> Em ${ano} a Prefeitura se comprometeu a gastar <strong>${mi(money(a, -res))} a mais</strong> do que arrecadou.`) +
      ` Nos últimos 5 anos, ${nDef ? `foram <strong>${plural(nDef, "ano", "anos")} de déficit</strong>` : "não houve déficit"}.`);

    const cx = a.caixa_liquida_apos_rp;
    if (cx != null) {
      const ultPos = [...fechados].reverse().find((x) => x.caixa_liquida_apos_rp > 0);
      setR("r-caixa", cx >= 0
        ? `<strong>Sim.</strong> No fim de ${ano}, depois de reservar as contas pendentes, sobraram <strong>${mi(money(a, cx))}</strong>.`
        : `<strong>Não.</strong> No fim de ${ano}, as contas deixadas para o ano seguinte eram <strong>${mi(money(a, -cx))} maiores</strong> que o dinheiro em caixa.` +
          (ultPos ? ` A última vez que sobrou dinheiro foi em ${ultPos.ano}.` : ""));
    }

    const p = a.pessoal_pct_rcl;
    const p0 = fechados[0];
    const pTxt = p >= 54 ? "<strong>acima do teto</strong> de 54% da lei" : p >= 51.3 ? "acima do limite prudencial (51,3%)" : p >= 48.6 ? "acima do alerta da lei (48,6%)" : "<strong>abaixo do alerta</strong> da lei (48,6%)";
    setR("r-pessoal", `De cada R$ 100 da receita, <strong>R$ ${nf0.format(p)} vão para salários e encargos</strong> dos servidores, ${pTxt}. Em ${p0.ano} eram R$ ${nf0.format(p0.pessoal_pct_rcl)}.`);

    const dcl = a.dcl_pct_rcl;
    setR("r-divida", `A dívida equivale a <strong>${pct(dcl)} da receita de um ano</strong>. ${dcl < 108 ? "O limite é 120%, então há <strong>folga grande</strong>." : dcl < 120 ? "O limite é 120%: está <strong>perto do limite</strong>." : "Passou do limite de 120%."}` +
      (fechados.length > 3 ? ` Em ${fechados[fechados.length - 4].ano} era ${pct(fechados[fechados.length - 4].dcl_pct_rcl)}.` : ""));

    const comMin = fechados.filter((x) => x.educacao_pct != null && x.saude_pct != null);
    const falhas = comMin.filter((x) => x.educacao_pct < 25 || x.saude_pct < 15);
    setR("r-minimos", `<strong>${falhas.length ? "Nem sempre." : "Sim."}</strong> Em ${ano}: <strong>${pct(a.educacao_pct)} em educação</strong> (mínimo 25%) e <strong>${pct(a.saude_pct)} em saúde</strong> (mínimo 15%). ` +
      (falhas.length ? `Ficou abaixo do mínimo em ${falhas.map((x) => x.ano).join(", ")}.` : `Os dois mínimos foram cumpridos em todos os anos desde ${comMin[0]?.ano}.`));

    const pc = (x) => (x.rcl && x.populacao ? (x.rcl * x.ipca_fator) / x.populacao : null);
    const v0 = pc(p0);
    const v1 = pc(a);
    if (v0 && v1) {
      const d = (100 * (v1 - v0)) / v0;
      setR("r-rcl", `Em ${ano}, a receita foi de <strong>${reais(money(a, a.rcl / a.populacao))} por morador</strong>. ` +
        `Descontada a inflação, são <strong>${pct(Math.abs(d))} ${d >= 0 ? "a mais" : "a menos"}</strong> que em ${p0.ano}.`);
    }
  }

  // ---------- glossário ----------
  const GLOSSARIO = {
    rcl: ["Receita Corrente Líquida (RCL)", "O dinheiro que a Prefeitura recebe no ano para o dia a dia (impostos, repasses, taxas), tirando o que é só de passagem. É a régua que a lei usa para medir gasto com pessoal e dívida."],
    empenho: ["Empenho (despesa empenhada)", "O primeiro passo de um gasto: a Prefeitura reserva o dinheiro e assume o compromisso de pagar. Ainda não pagou."],
    liquidado: ["Despesa liquidada", "O segundo passo: o serviço foi prestado ou o bem foi entregue, e a Prefeitura conferiu. Falta só pagar."],
    rp: ["Restos a pagar", "Contas assumidas num ano que só vão ser pagas no ano seguinte. Funcionam como uma fatura que vira o mês."],
    superavit: ["Superávit", "Quando entra mais dinheiro do que a Prefeitura se compromete a gastar no ano. Sobra."],
    deficit: ["Déficit", "Quando a Prefeitura se compromete a gastar mais do que arrecada no ano. Falta, e a diferença sai de reservas ou vira conta para depois."],
    dcl: ["Dívida consolidada líquida", "Tudo o que a cidade deve a prazo (empréstimos, parcelamentos, precatórios), menos o dinheiro que ela já tem guardado para pagar."],
    lrf: ["Lei de Responsabilidade Fiscal (LRF)", "Lei federal de 2000 que fixa limites para gasto com pessoal e dívida e obriga prefeituras a publicar relatórios das contas."],
    tce: ["TCE-SP", "Tribunal de Contas do Estado de São Paulo. Fiscaliza as contas das prefeituras paulistas e dá um parecer todo ano."],
    parecer: ["Parecer prévio", "A opinião técnica do Tribunal de Contas sobre as contas do ano: favorável ou desfavorável. A decisão final é dos vereadores, na Câmara."],
    siops: ["SIOPS", "Sistema do Ministério da Saúde onde os municípios declaram quanto aplicaram em saúde."],
    ipca: ["IPCA", "O índice oficial de inflação do Brasil, medido pelo IBGE. Usamos para corrigir valores antigos para o dinheiro de hoje."],
  };
  function glossario() {
    document.getElementById("lista-glossario").innerHTML = Object.entries(GLOSSARIO)
      .map(([k, [t, d]]) => `<div id="g-${k}"><dt>${t}</dt><dd>${d}</dd></div>`).join("");
    const pop = document.getElementById("definicao");
    const temPopover = typeof pop.showPopover === "function";
    let aberto = null;
    document.querySelectorAll(".termo").forEach((b) => {
      b.setAttribute("aria-haspopup", "dialog");
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", () => {
        const k = b.dataset.termo;
        if (!temPopover) { location.hash = `g-${k}`; return; }
        if (aberto === b) { pop.hidePopover(); return; }
        const [t, d] = GLOSSARIO[k];
        pop.innerHTML = `<h3 id="def-titulo">${t}</h3><p>${d}</p><a href="#g-${k}">Ver no glossário</a>`;
        pop.showPopover();
        const r = b.getBoundingClientRect();
        const pr = pop.getBoundingClientRect();
        const x = Math.max(12, Math.min(r.left, innerWidth - pr.width - 12));
        const y = r.bottom + 8 + pr.height > innerHeight ? r.top - pr.height - 8 : r.bottom + 8;
        pop.style.left = `${x}px`;
        pop.style.top = `${y}px`;
        b.setAttribute("aria-expanded", "true");
        aberto = b;
      });
    });
    if (temPopover) {
      pop.addEventListener("toggle", (e) => {
        if (e.newState === "closed" && aberto) { aberto.setAttribute("aria-expanded", "false"); aberto = null; }
      });
      pop.addEventListener("click", (e) => { if (e.target.tagName === "A") pop.hidePopover(); });
      addEventListener("scroll", () => { if (aberto) pop.hidePopover(); }, { passive: true });
    }
  }

  // ---------- índice: marca a seção em leitura ----------
  function indice() {
    const links = [...document.querySelectorAll(".indice a")];
    const alvos = links.map((l) => document.querySelector(l.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;
    const visiveis = new Set();
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)));
      const atual = alvos.filter((t) => visiveis.has(t)).pop();
      links.forEach((l) => {
        const on = atual && l.getAttribute("href") === `#${atual.id}`;
        if (on) {
          l.setAttribute("aria-current", "true");
          const ul = l.closest("ul");
          const left = l.offsetLeft - ul.offsetLeft;
          if (left < ul.scrollLeft || left + l.offsetWidth > ul.scrollLeft + ul.clientWidth) ul.scrollLeft = left - 12;
        }
        else l.removeAttribute("aria-current");
      });
    }, { rootMargin: "-80px 0px -55% 0px" });
    alvos.forEach((t) => io.observe(t));
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

  // Minigráfico de tendência dentro do cartão (decorativo: o texto e o gráfico completo carregam o dado).
  const spark = (serie, { sinal = false } = {}) => {
    const W = 240, H = 46, p = 4;
    const pts = serie.filter((s) => s.v != null);
    if (pts.length < 2) return "";
    const vs = pts.map((s) => s.v);
    // Escala a partir do zero: sem isso, uma variação pequena parece um tombo.
    const lo = Math.min(0, ...vs);
    const hi = Math.max(0, ...vs);
    const pad = sinal ? 0 : hi * 0.08;
    const y = (v) => p + ((hi + pad - v) / (hi - lo + 2 * pad || 1)) * (H - 2 * p);
    const n = serie.length;
    const x = (i) => p + (i * (W - 2 * p)) / (n - 1);
    let g = "";
    if (sinal) {
      const bw = ((W - 2 * p) / n) * 0.62;
      const pos = cssVar("--series-1"), neg = cssVar("--neg");
      g += `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="${cssVar("--axis")}" stroke-width="1"/>`;
      serie.forEach((s, i) => {
        if (s.v == null) return;
        const cx = p + ((i + 0.5) * (W - 2 * p)) / n;
        const y0 = y(0), y1 = y(s.v);
        g += `<rect x="${cx - bw / 2}" y="${Math.min(y0, y1)}" width="${bw}" height="${Math.max(1, Math.abs(y1 - y0))}" rx="1.5" fill="${s.v >= 0 ? pos : neg}" opacity="${i === n - 1 ? 1 : 0.55}"/>`;
      });
    } else {
      const c = cssVar("--series-1");
      const idx = serie.map((s, i) => (s.v == null ? null : i)).filter((i) => i != null);
      const d = idx.map((i, k) => `${k ? "L" : "M"}${x(i)},${y(serie[i].v)}`).join("");
      g += `<path d="${d}L${x(idx[idx.length - 1])},${H}L${x(idx[0])},${H}Z" fill="${c}" opacity=".12"/>`;
      g += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const l = idx[idx.length - 1];
      g += `<circle cx="${x(l)}" cy="${y(serie[l].v)}" r="4" fill="${c}" stroke="${cssVar("--surface-1")}" stroke-width="2"/>`;
    }
    return `<div class="spark"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${g}</svg>
      <div class="spark-anos" aria-hidden="true"><span>${serie[0].ano}</span><span>${serie[n - 1].ano}</span></div></div>`;
  };
  // Badge de variação contra o ano anterior. Verde/vermelho só reforça: a seta e o texto dizem a direção.
  const variacao = (atual, anterior, anoAnt, fmtDiff, melhor) => {
    if (atual == null || anterior == null) return "";
    const d = atual - anterior;
    const bom = melhor === "maior" ? d > 0 : d < 0;
    return `<span class="var ${bom ? "bom" : "ruim"}"><span aria-hidden="true">${d > 0 ? "↑" : "↓"}</span> ${fmtDiff(Math.abs(d))}<span class="sr-only"> ${d > 0 ? "a mais" : "a menos"}</span> vs ${anoAnt}</span>`;
  };
  const pontos = (v) => `${nf1.format(v)} ${v === 1 ? "ponto" : "pontos"}`;

  function tiles() {
    const a = ult;
    const ant = fechados[fechados.length - 2];
    const box = document.getElementById("tiles");
    const res = a.resultado_orcamentario;
    const resPct = (100 * res) / a.receita_realizada;
    const pNivel = a.pessoal_pct_rcl >= 54 ? "critical" : a.pessoal_pct_rcl >= 51.3 ? "serious" : a.pessoal_pct_rcl >= 48.6 ? "warning" : "good";
    const pTxt = { good: "Abaixo do alerta", warning: "Limite de alerta", serious: "Limite prudencial", critical: "Acima do teto" }[pNivel];
    const dNivel = a.dcl_pct_rcl >= 120 ? "critical" : a.dcl_pct_rcl >= 108 ? "warning" : "good";
    const rNivel = res >= 0 ? "good" : resPct > -3 ? "warning" : "serious";
    const cx = a.caixa_liquida_apos_rp;
    const cNivel = cx == null ? null : cx >= 0 ? "good" : "serious";
    const serie = (f) => fechados.map((x) => ({ ano: x.ano, v: f(x) }));
    const topo = (nivel, txt, varHtml) => `<div class="tile-topo">${status(nivel, txt)}${varHtml}</div>`;
    box.innerHTML = `
      <article class="tile">${topo(rNivel, res >= 0 ? "Superávit" : "Déficit",
        variacao(money(a, res), money(ant, ant.resultado_orcamentario), ant.ano, mi, "maior"))}
        <h3 class="label">Receita menos despesa</h3>
        <p class="value"><span data-n="${money(a, res)}" data-f="mi">${mi(money(a, res))}</span></p>
        ${spark(serie((x) => money(x, x.resultado_orcamentario)), { sinal: true })}
        <p class="ctx">${res >= 0 ? "Sobrou" : "Faltou"} o equivalente a ${pct(Math.abs(resPct))} da receita do ano.</p>
        <a class="mais" href="#h-resultado">Ver a evolução <span aria-hidden="true">→</span></a>
      </article>
      ${cNivel ? `<article class="tile">${topo(cNivel, cx >= 0 ? "Caixa cobre as contas" : "Caixa no vermelho",
        variacao(money(a, cx), money(ant, ant.caixa_liquida_apos_rp), ant.ano, mi, "maior"))}
        <h3 class="label">Dinheiro em caixa</h3>
        <p class="value"><span data-n="${money(a, cx)}" data-f="mi">${mi(money(a, cx))}</span></p>
        ${spark(serie((x) => money(x, x.caixa_liquida_apos_rp)), { sinal: true })}
        <p class="ctx">${cx >= 0 ? "Sobra" : "Falta"} depois de reservar as contas que ficaram para o ano seguinte.</p>
        <a class="mais" href="#h-caixa">Ver a evolução <span aria-hidden="true">→</span></a>
      </article>` : ""}
      <article class="tile">${topo(pNivel, pTxt, variacao(a.pessoal_pct_rcl, ant.pessoal_pct_rcl, ant.ano, pontos, "menor"))}
        <h3 class="label">Salários e encargos</h3>
        <p class="value"><span data-n="${a.pessoal_pct_rcl}" data-f="pct">${pct(a.pessoal_pct_rcl)}</span> <small>da receita</small></p>
        ${spark(serie((x) => x.pessoal_pct_rcl))}
        ${meter(a.pessoal_pct_rcl, 60, [48.6, 51.3, 54], pNivel)}
        <p class="ctx">A barra mostra a distância até o teto da lei, de 54%.</p>
        <a class="mais" href="#h-pessoal">Ver a evolução <span aria-hidden="true">→</span></a>
      </article>
      <article class="tile">${topo(dNivel, dNivel === "good" ? "Bem abaixo do limite" : dNivel === "warning" ? "Perto do limite" : "Acima do limite",
        variacao(a.dcl_pct_rcl, ant.dcl_pct_rcl, ant.ano, pontos, "menor"))}
        <h3 class="label">Dívida</h3>
        <p class="value"><span data-n="${a.dcl_pct_rcl}" data-f="pct">${pct(a.dcl_pct_rcl)}</span> <small>da receita</small></p>
        ${spark(serie((x) => x.dcl_pct_rcl))}
        ${meter(a.dcl_pct_rcl, 130, [120], dNivel)}
        <p class="ctx">${mi(money(a, a.dcl))}. A barra mostra a distância até o limite de 120%.</p>
        <a class="mais" href="#h-divida">Ver a evolução <span aria-hidden="true">→</span></a>
      </article>`;
    contar(box);
  }

  // ---------- montagem ----------
  function render() {
    tiles();

    const fRes = document.getElementById("c-resultado");
    colunasSinal(fRes, {
      anos: fechados,
      valor: (a) => money(a, a.resultado_orcamentario),
      tipExtra: (a) => `Receita ${mi(money(a, a.receita_realizada))} · despesa ${mi(money(a, a.despesa_empenhada))}`,
      nota: `Receita menos despesa${sufixoModo()}`,
      sinalPos: "superávit", sinalNeg: "déficit",
    });
    tabela(fRes, ["Ano", "Receita", "Despesa empenhada", "Resultado"],
      fechados.map((a) => [a.ano, mi(money(a, a.receita_realizada)), mi(money(a, a.despesa_empenhada)), mi(money(a, a.resultado_orcamentario))]));

    const fCx = document.getElementById("c-caixa");
    colunasSinal(fCx, {
      anos: fechados,
      valor: (a) => money(a, a.caixa_liquida_apos_rp),
      tipExtra: (a) => (a.calculados.includes("caixa_liquida_apos_rp") ? "Calculado: o relatório traz o saldo antes dos restos a pagar" : (a.caixa_liquida_apos_rp == null ? "O relatório deste ano não traz o saldo" : "")),
      nota: `Caixa após as contas pendentes${sufixoModo()}`,
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

    construirFluxo();

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
    respostas();
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
  // No celular a barra de endereço muda a altura ao rolar: só redesenha se a largura mudou.
  let t;
  let largura = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === largura) return;
    largura = innerWidth;
    clearTimeout(t);
    t = setTimeout(render, 150);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);

  textos();
  glossario();
  indice();
  animarAoVer();
  controlesComparacao();
  controlesFluxo();
  render();
  recibo();
  // Link direto para uma seção (#h-comparacao): rola só depois que os gráficos têm altura.
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
})();
