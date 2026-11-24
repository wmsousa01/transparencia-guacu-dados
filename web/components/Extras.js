"use client";
// Seções de referência: linha do tempo dos pareceres, glossário e fontes.
import { Badge } from "react-bootstrap";
import { CheckCircle, XCircle, ExternalLink } from "react-feather";
import { GLOSSARIO } from "@/lib/glossario";

export function Pareceres({ P }) {
  return (
    <ol className="linha-tempo" aria-label="Pareceres do Tribunal de Contas por ano">
      {[...P].reverse().map((p) => {
        const ok = p.parecer.toLowerCase().startsWith("favor");
        return (
          <li key={p.ano} className={ok ? "ok" : "nao"}>
            <span className="marco" aria-hidden="true">{ok ? <CheckCircle size={18} /> : <XCircle size={18} />}</span>
            <span className="ano">{p.ano}</span>
            <Badge pill bg={ok ? "light-success" : "light-danger"} text={ok ? "dark-success" : "dark-danger"}>{p.parecer}</Badge>
            {p.voto && <a href={p.voto} rel="noopener" className="voto">Voto (PDF)<span className="visually-hidden"> de {p.ano}</span></a>}
          </li>
        );
      })}
    </ol>
  );
}

export function Glossario() {
  return (
    <dl className="glossario-grade">
      {Object.entries(GLOSSARIO).map(([k, [t, d]]) => (
        <div key={k} id={`g-${k}`} className="glossario-item">
          <dt className="text-dark">{t}</dt>
          <dd className="mb-0">{d}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Fontes({ D, ultAno, parcialAno }) {
  return (
    <>
      <ul className="list-unstyled fontes">
        {D.fontes.map((f) => (
          <li key={f.url}><a href={f.url} rel="noopener"><ExternalLink size={14} aria-hidden="true" /> {f.nome}</a></li>
        ))}
      </ul>
      <details className="entenda">
        <summary>Ressalvas e decisões de método</summary>
        <ul className="entenda-corpo ressalvas">
          <li><strong>Correção pela inflação:</strong> valores trazidos a preços médios de {ultAno} pelo IPCA.</li>
          <li><strong>Ano corrente:</strong> {parcialAno ?? "—"} aparece só onde o indicador já é anual (pessoal e dívida usam os últimos 12 meses), marcado com * e ponto vazado. Receita e despesa de um ano incompleto não são comparáveis.</li>
          <li><strong>Valores calculados por nós:</strong> em alguns anos o relatório traz o valor mas não o percentual, ou traz o caixa antes de descontar os restos a pagar. Nesses casos calculamos com os números do próprio relatório, e o ponto aparece marcado como &quot;calculado&quot;.</li>
          <li><strong>Saúde e educação:</strong> de 2016 em diante, o percentual é o calculado pelo TCE-SP. Em 2015, que o Tribunal não publica, usamos o RREO do Siconfi. O SIOPE (educação, do FNDE) está com a API fora do ar e a consulta pública exige captcha, por isso não foi usado.</li>
          <li><strong>Comparação:</strong> todos os municípios no último ano fechado, em valores da época. Pessoal, dívida, caixa e receita vêm do Siconfi; resultado, ensino e saúde, do TCE-SP. Município que não entregou o relatório aparece como &quot;sem dado&quot;.</li>
          <li><strong>Fornecedores:</strong> soma dos pagamentos registrados no AUDESP, sem a própria Prefeitura (folha e transferências internas). A separação entre &quot;terceiros&quot; e &quot;órgãos públicos&quot; é feita pelo nome do favorecido e pode errar.</li>
          <li><strong>Caminho do dinheiro:</strong> compara a receita arrecadada com a despesa liquidada por área; o resultado do ano (capítulo 2) usa a despesa empenhada, por isso os números diferem.</li>
        </ul>
      </details>
    </>
  );
}
