"use client";
// Seu recibo: divide o imposto que o morador informa na mesma proporção dos gastos do último ano.
import { useEffect, useMemo, useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { useVisto } from "@/components/ui/base";
import { brl, nf0 } from "@/lib/formato";
import { CURTO_AREA, DESC_AREA } from "@/components/Fluxo";

const ler = (s) => {
  const v = parseFloat(String(s).replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export default function Recibo({ ult }) {
  const [texto, setTexto] = useState("1.200");
  const [fala, setFala] = useState("");
  const [ref, visto] = useVisto();
  const linhas = useMemo(() => {
    const fun = Object.entries(ult.despesa_funcao).sort((p, q) => q[1] - p[1]);
    const tot = fun.reduce((s, [, v]) => s + v, 0);
    const ls = fun.slice(0, 8).map(([n, v]) => ({ n: CURTO_AREA[n] || n, s: v / tot, det: DESC_AREA[n] || "" }));
    const resto = fun.slice(8).reduce((s, [, v]) => s + v, 0) / tot;
    if (resto > 0) ls.push({ n: "Demais áreas", s: resto, det: `${fun.slice(8, 12).map(([n]) => n).join(", ")} e outras` });
    return ls;
  }, [ult]);
  const max = Math.max(...linhas.map((l) => l.s));
  const v = ler(texto);

  useEffect(() => {
    const t = setTimeout(() => {
      setFala(v ? `Dos seus ${brl.format(v)}, ${brl.format(v * linhas[0].s)} vão para ${linhas[0].n.toLowerCase()} e ${brl.format(v * linhas[1].s)} para ${linhas[1].n.toLowerCase()}.` : "");
    }, 500);
    return () => clearTimeout(t);
  }, [v, linhas]);

  return (
    <div className="row g-4 align-items-start">
      <div className="col-lg-5">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Form.Label htmlFor="valor-imposto" className="fw-bold text-dark">Quanto você paga por ano</Form.Label>
          <InputGroup size="lg" className="campo-imposto">
            <InputGroup.Text aria-hidden="true">R$</InputGroup.Text>
            <Form.Control id="valor-imposto" inputMode="decimal" autoComplete="off" value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onBlur={() => { if (v) setTexto(new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v)); }} />
          </InputGroup>
          <div className="d-flex flex-wrap gap-2 mt-3" role="group" aria-label="Valores de exemplo">
            {[500, 1200, 3000].map((x) => (
              <Button key={x} variant="outline-secondary" className="rounded-pill" onClick={() => setTexto(nf0.format(x))}>R$ {nf0.format(x)}</Button>
            ))}
          </div>
          <p className="visually-hidden" aria-live="polite">{fala}</p>
          <p className="nota-recibo">O imposto não tem destino carimbado: ele entra no caixa geral junto com os repasses. Por isso o recibo é uma divisão proporcional, não o caminho exato de cada real.</p>
        </Form>
      </div>
      <div className="col-lg-7">
        <div ref={ref} className={`recibo ${visto ? "visto" : ""}`}>
          <p className="recibo-topo"><span>Recibo do contribuinte</span><span>Mogi Guaçu · {ult.ano}</span></p>
          <ul>
            {linhas.map((l, i) => (
              <li key={l.n}>
                <span className="r-nome">{l.n}{l.det && <small>{l.det}</small>}</span>
                <span className="r-barra" aria-hidden="true"><i style={{ width: `${((100 * l.s) / max).toFixed(1)}%`, transitionDelay: `${i * 60}ms` }} /></span>
                <span className="r-valor">{brl.format(v * l.s)}</span>
              </li>
            ))}
          </ul>
          <p className="recibo-total"><span>Total</span><span>{brl.format(v)}</span></p>
        </div>
      </div>
    </div>
  );
}
