"use client";
// Gráficos em ApexCharts, com a paleta validada do projeto. Cada um vem com tabela equivalente
// (TabelaDados) na seção que o usa; o rótulo descreve o gráfico para leitores de tela.
import dynamic from "next/dynamic";
import { Grafico } from "@/components/ui/base";
import { COR, mi, pct } from "@/lib/formato";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const base = {
  grid: { borderColor: COR.grade, strokeDashArray: 0, padding: { left: 8, right: 16 } },
  legend: { show: false },
  states: { hover: { filter: { type: "darken", value: 0.88 } }, active: { filter: { type: "none" } } },
};
const eixoAnos = (anos) => ({
  categories: anos.map((a) => (a.parcial ? `${a.ano}*` : String(a.ano))),
  axisBorder: { show: false },
  axisTicks: { show: false },
  labels: { style: { colors: COR.mudo, fontSize: "12px" }, hideOverlappingLabels: true, rotate: 0 },
  tooltip: { enabled: false },
});
const tipCaixa = (titulo, linhas) =>
  `<div class="tip"><strong>${titulo}</strong>${linhas.filter(Boolean).map((l) => `<div>${l}</div>`).join("")}</div>`;

// Barras para cima (azul) e para baixo (vermelho), com rótulo só no maior, no menor e no último.
export function ColunasSinal({ anos, valores, rotulo, nomePos = "sobra", nomeNeg = "falta", extra }) {
  const nums = valores.filter((v) => v != null);
  const iMin = valores.indexOf(Math.min(...nums));
  const iMax = valores.indexOf(Math.max(...nums));
  const ultimo = valores.length - 1;
  const options = {
    ...base,
    plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "52%", colors: { ranges: [{ from: -1e15, to: -0.000001, color: COR.neg }] } } },
    colors: [COR.s1],
    dataLabels: { enabled: false },
    // Rótulos só no maior, no menor e no último ano: acima da barra se positiva, abaixo se negativa.
    annotations: {
      points: [...new Set([iMin, iMax, ultimo])].filter((i) => valores[i] != null).map((i) => ({
        x: anos[i].parcial ? `${anos[i].ano}*` : String(anos[i].ano),
        y: valores[i],
        marker: { size: 0 },
        label: {
          text: mi(valores[i]).replace("R$ ", ""),
          borderWidth: 0,
          offsetY: valores[i] >= 0 ? 0 : 26,
          style: { background: "transparent", color: COR.texto, fontSize: "12px", fontWeight: 600 },
        },
      })),
    },
    xaxis: eixoAnos(anos),
    yaxis: { labels: { formatter: (v) => mi(v).replace("R$ ", ""), style: { colors: COR.mudo } } },
    tooltip: {
      custom: ({ dataPointIndex: i }) => {
        const v = valores[i];
        if (v == null) return tipCaixa(anos[i].ano, ["sem dado", extra?.(anos[i])]);
        return tipCaixa(`${anos[i].ano}: ${v >= 0 ? nomePos : nomeNeg} de ${mi(Math.abs(v))}`, [extra?.(anos[i])]);
      },
    },
  };
  return <Grafico type="bar" height={300} rotulo={rotulo} series={[{ name: rotulo, data: valores }]} options={options} />;
}

// Linhas de percentual com linhas de referência da lei (tracejadas, com rótulo).
// O ano em curso (parcial) aparece com marcador vazado.
export function Linhas({ anos, series, limites = [], yMax, rotulo, fmt = pct, fmtEixo = (v) => `${Math.round(v)}%`, legenda = false }) {
  const iParcial = anos.findIndex((a) => a.parcial);
  const ultimoValido = (dados) => dados.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
  const options = {
    ...base,
    colors: series.map((s) => s.cor),
    stroke: { width: 3, curve: "straight" },
    markers: {
      size: 4.5,
      strokeWidth: 2,
      strokeColors: "#fff",
      hover: { sizeOffset: 2 },
      discrete: iParcial >= 0 ? series.map((s, k) => ({ seriesIndex: k, dataPointIndex: iParcial, fillColor: "#fff", strokeColor: s.cor, size: 5 })) : [],
    },
    legend: { show: legenda, position: "top", horizontalAlign: "left", fontSize: "13px", markers: { size: 6 }, labels: { colors: COR.texto2 } },
    dataLabels: {
      enabled: true,
      offsetX: 22,
      offsetY: 6,
      background: { enabled: false },
      style: { fontSize: "12px", fontWeight: 600, colors: [COR.texto] },
      formatter: (v, o) => (o.dataPointIndex === ultimoValido(series[o.seriesIndex].dados) && v != null ? fmt(v) : ""),
    },
    grid: { ...base.grid, padding: { left: 8, right: 64 } },
    annotations: {
      yaxis: limites.map((l) => ({
        y: l.y,
        borderColor: COR.limite,
        strokeDashArray: 5,
        label: {
          text: l.rotulo,
          position: l.pos || "right",
          textAnchor: l.pos === "left" ? "start" : l.pos === "center" ? "middle" : "end",
          offsetX: l.pos === "left" ? 6 : 0,
          borderWidth: 0,
          style: { background: "#fff", color: COR.texto2, fontSize: "12px", padding: { left: 3, right: 3, top: 1, bottom: 1 } },
        },
      })),
    },
    xaxis: eixoAnos(anos),
    yaxis: { min: 0, max: yMax, tickAmount: 5, labels: { formatter: fmtEixo, style: { colors: COR.mudo } } },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex: i }) => {
        const a = anos[i];
        const ls = series.map((s) => {
          const v = s.dados[i];
          const nota = s.nota?.(a) || "";
          return `${series.length > 1 ? `${s.nome}: ` : ""}${v == null ? "sem dado" : fmt(v)}${nota ? ` <span class="muted">${nota}</span>` : ""}`;
        });
        if (a.parcial) ls.push(`<span class="muted">Ano em curso: 12 meses até o ${a.periodo_rgf}</span>`);
        return tipCaixa(a.ano, ls);
      },
    },
  };
  return <Grafico type="line" height={320} rotulo={rotulo} series={series.map((s) => ({ name: s.nome, data: s.dados }))} options={options} />;
}

// Barras horizontais com nome à esquerda e valor na ponta.
export function BarrasH({ itens, cor = COR.s1, rotulo, fmt = mi }) {
  const options = {
    ...base,
    colors: [cor],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "68%", dataLabels: { position: "top" } } },
    dataLabels: { enabled: true, offsetX: 8, textAnchor: "start", style: { fontSize: "12px", fontWeight: 600, colors: [COR.texto] }, formatter: (v) => fmt(v) },
    grid: { ...base.grid, xaxis: { lines: { show: false } }, yaxis: { lines: { show: false } }, padding: { right: 70, left: 4 } },
    xaxis: { categories: itens.map((i) => i.nome), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { maxWidth: 260, style: { colors: COR.texto2, fontSize: "12.5px" } } },
    tooltip: { custom: ({ dataPointIndex: k }) => tipCaixa(itens[k].nome, [fmt(itens[k].valor), itens[k].extra && `<span class="muted">${itens[k].extra}</span>`]) },
  };
  return <Grafico type="bar" height={Math.max(220, itens.length * 34 + 30)} rotulo={rotulo} series={[{ name: rotulo, data: itens.map((i) => i.valor) }]} options={options} />;
}

// Minigráfico dos cartões do resumo (decorativo: o texto do cartão carrega o dado).
export function Sparkline({ dados, tipo = "area", sinal = false }) {
  const valores = dados.map((d) => d.v);
  const options = {
    chart: { sparkline: { enabled: true }, animations: { enabled: false } },
    colors: [COR.s1],
    stroke: { width: tipo === "area" ? 2 : 0, curve: "straight" },
    fill: tipo === "area" ? { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.02 } } : { opacity: 1 },
    plotOptions: { bar: { columnWidth: "62%", borderRadius: 1.5, colors: { ranges: [{ from: -1e15, to: -0.000001, color: COR.neg }] } } },
    yaxis: sinal ? {} : { min: 0 },
    tooltip: { enabled: false },
    states: { hover: { filter: { type: "none" } } },
  };
  return (
    <div className="spark" aria-hidden="true">
      <ApexChart type={tipo} height={52} width="100%" series={[{ name: "", data: valores }]} options={options} />
      <div className="spark-anos"><span>{dados[0].ano}</span><span>{dados[dados.length - 1].ano}</span></div>
    </div>
  );
}
