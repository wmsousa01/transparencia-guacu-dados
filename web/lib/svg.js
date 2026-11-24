// Utilitários dos gráficos desenhados à mão (fluxo do dinheiro e enxame da comparação).
// Tooltip único da página (#tooltip) e anúncio para leitor de tela (#anuncio), renderizados em Painel.
const NS = "http://www.w3.org/2000/svg";

export const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

export const txt = (parent, x, y, s, cls, anchor = "middle") => {
  const t = el("text", { x, y, class: cls, "text-anchor": anchor }, parent);
  t.textContent = s;
  return t;
};

export const niceTicks = (min, max, n = 5) => {
  const span = max - min || 1;
  const mag = 10 ** Math.floor(Math.log10(span / n));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
};

export const semMovimento = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const tip = () => document.getElementById("tooltip");
export const showTipAt = (cx, cy, html) => {
  const t = tip();
  if (!t) return;
  t.innerHTML = html;
  t.hidden = false;
  const r = t.getBoundingClientRect();
  let x = cx + 14;
  let y = cy + 14;
  if (x + r.width > innerWidth - 8) x = Math.max(8, cx - r.width - 14);
  if (y + r.height > innerHeight - 8) y = cy - r.height - 14;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
};
export const hideTip = () => { const t = tip(); if (t) t.hidden = true; };

// Cada alvo serve ao mouse, ao toque e ao teclado (ver navegavel).
export const bindTip = (node, html, onEnter, onLeave) => {
  const h = typeof html === "function" ? html : () => html;
  const on = (e) => { showTipAt(e.clientX, e.clientY, h()); onEnter?.(); };
  node.addEventListener("pointermove", on);
  node.addEventListener("pointerdown", on);
  node.addEventListener("pointerleave", () => { hideTip(); onLeave?.(); });
  return { hit: node, html: h, enter: onEnter, leave: onLeave };
};

const semTags = (h) => h.replace(/<br>|<\/strong>/g, ". ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Teclado: o gráfico recebe foco; setas percorrem os itens; o valor é anunciado ao leitor de tela.
export function navegavel(svg, alvos, titulo) {
  if (!alvos.length) return;
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${titulo}. Gráfico com ${alvos.length} itens: use as setas para ouvir cada valor, ou abra a tabela abaixo.`);
  let i = -1;
  const solta = () => { if (i >= 0) { alvos[i].leave?.(); alvos[i].hit.classList.remove("foco"); } };
  const ir = (k) => {
    solta();
    i = Math.max(0, Math.min(alvos.length - 1, k));
    const a = alvos[i];
    a.enter?.();
    a.hit.classList.add("foco");
    const r = a.hit.getBoundingClientRect();
    showTipAt(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40), a.html());
    const an = document.getElementById("anuncio");
    if (an) an.textContent = semTags(a.html());
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
  svg.addEventListener("blur", () => { hideTip(); solta(); i = -1; });
}
