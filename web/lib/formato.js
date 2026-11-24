// Formatação em português do Brasil. Sinal de menos tipográfico (−) para valores negativos.
export const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const pct = (v) => (v == null ? "—" : `${v < 0 ? "−" : ""}${nf1.format(Math.abs(v))}%`);

export const mi = (v) => {
  if (v == null) return "—";
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (a >= 1e9) return `${s}R$ ${nf1.format(a / 1e9)} bi`;
  if (a >= 1e6) return `${s}R$ ${nf1.format(a / 1e6)} mi`;
  if (a >= 1e3) return `${s}R$ ${nf0.format(a / 1e3)} mil`;
  return `${s}R$ ${nf0.format(a)}`;
};

export const reais = (v) => (v == null ? "—" : `R$ ${nf0.format(v)}`);
export const pontos = (v) => `${nf1.format(v)} ${v === 1 ? "ponto" : "pontos"}`;
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export const cnpj = (d) => (d ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "");

// Paleta de dados (validada para daltonismo) e cores de estado. As mesmas do site anterior.
export const COR = {
  s1: "#2a78d6",
  s2: "#eb6834",
  s3: "#1baf7a",
  s4: "#eda100",
  s5: "#e87ba4",
  neg: "#e34948",
  neutro: "#c3c2b7",
  texto: "#161c24",
  texto2: "#454f5b",
  mudo: "#637381",
  grade: "#e4e3dc",
  limite: "#898781",
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};
