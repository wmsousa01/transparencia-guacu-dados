"use client";
// Página única no layout Dash UI: menu lateral com os capítulos, barra superior com o modo
// de valores, abertura com a manchete do ano e os capítulos em cartões.
import { useEffect, useState } from "react";
import { Button, ButtonGroup, Col, Row } from "react-bootstrap";
import {
  Activity, BookOpen, Briefcase, DollarSign, GitMerge, Heart, Home, Info, Menu, Shield, TrendingUp, Users, X,
} from "react-feather";
import Resumo from "@/components/Resumo";
import Fluxo from "@/components/Fluxo";
import Recibo from "@/components/Recibo";
import Comparacao from "@/components/Comparacao";
import { Fontes, Glossario, Pareceres } from "@/components/Extras";
import { BarrasH, ColunasSinal, Linhas } from "@/components/graficos";
import { Secao, TabelaDados, Termo } from "@/components/ui/base";
import { COR, cnpj, mi, nf0, pct, reais } from "@/lib/formato";
import { dinheiro, manchete, prepara, respostas } from "@/lib/dados";

const MENU = [
  { titulo: "Visão geral", itens: [{ id: "resumo", nome: "Resumo do ano", icone: Home }] },
  {
    titulo: "Capítulos",
    itens: [
      { id: "fluxo", nome: "Caminho do dinheiro", icone: GitMerge },
      { id: "resultado", nome: "Contas do ano", icone: DollarSign },
      { id: "pessoal", nome: "Folha e dívida", icone: Briefcase },
      { id: "minimos", nome: "Saúde e educação", icone: Heart },
      { id: "rcl", nome: "Arrecadação", icone: TrendingUp },
      { id: "comparacao", nome: "Comparação", icone: Users },
      { id: "pareceres", nome: "Fiscalização", icone: Shield },
    ],
  },
  { titulo: "Referência", itens: [{ id: "glossario", nome: "Glossário", icone: BookOpen }, { id: "fontes", nome: "Fontes e método", icone: Info }] },
];

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#ffffff" fillOpacity=".12" />
      <rect x="7" y="17" width="4" height="8" rx="1" fill="#fff" />
      <rect x="14" y="12" width="4" height="13" rx="1" fill="#fff" />
      <rect x="21" y="7" width="4" height="18" rx="1" fill="#7fd1ae" />
    </svg>
  );
}

// Marca no menu o capítulo em leitura.
function useAtual(ids) {
  const [atual, setAtual] = useState(ids[0]);
  useEffect(() => {
    const alvos = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const vis = new Set();
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => (e.isIntersecting ? vis.add(e.target.id) : vis.delete(e.target.id)));
      const primeiro = ids.find((id) => vis.has(id));
      if (primeiro) setAtual(primeiro);
    }, { rootMargin: "-90px 0px -55% 0px" });
    alvos.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return atual;
}

export default function Painel({ D }) {
  const [modo, setModo] = useState("real");
  const [menuAberto, setMenuAberto] = useState(false);
  const { fechados, ult, parcial } = prepara(D);
  const m = dinheiro(modo);
  const r = respostas(D, modo);
  const cab = manchete(D, modo);
  const atual = useAtual(MENU.flatMap((g) => g.itens.map((i) => i.id)));
  const atualizado = new Date(`${D.gerado_em}T12:00`).toLocaleDateString("pt-BR");
  const sufixo = modo === "real" ? ` (a preços de ${D.base_precos})` : " (valores da época)";
  const percap = (a) => (a.rcl && a.populacao ? m(a, a.rcl) / a.populacao : null);
  const fo = D.fornecedores;

  return (
    <div id="db-wrapper" className={menuAberto ? "menu-aberto" : ""}>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>

      <nav className="navbar-vertical navbar" aria-label="Capítulos">
        <div className="nav-scroller">
          <a href="#resumo" className="navbar-brand marca" onClick={() => setMenuAberto(false)}>
            <Logo /> <span>Transparência <b>Guaçu</b></span>
          </a>
          {MENU.map((g) => (
            <div key={g.titulo}>
              <div className="navbar-heading">{g.titulo}</div>
              <ul className="navbar-nav flex-column">
                {g.itens.map(({ id, nome, icone: Icone }) => (
                  <li className="nav-item" key={id}>
                    <a href={`#${id}`} className={`nav-link ${atual === id ? "active" : ""}`} aria-current={atual === id ? "true" : undefined}
                      onClick={() => setMenuAberto(false)}>
                      <Icone size={16} className="nav-icon me-2" aria-hidden="true" /> {nome}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="selo-independente">Projeto independente com dados oficiais e abertos. Não é um site da Prefeitura.</p>
        </div>
      </nav>
      {menuAberto && <button type="button" className="veu" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />}

      <div id="page-content">
        <header className="header">
          <div className="navbar navbar-classic navbar-expand-lg barra-topo">
            <div className="d-flex align-items-center gap-3">
              <button type="button" className="btn btn-icon btn-light d-md-none" aria-label={menuAberto ? "Fechar menu" : "Abrir menu"} aria-expanded={menuAberto}
                onClick={() => setMenuAberto(!menuAberto)}>
                {menuAberto ? <X size={20} /> : <Menu size={20} />}
              </button>
              <span className="fw-semi-bold text-dark d-none d-sm-inline">As contas de Mogi Guaçu</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
              <span className="text-muted small d-none d-md-inline" id="lbl-modo">Valores</span>
              <ButtonGroup size="sm" aria-labelledby="lbl-modo">
                <Button variant={modo === "real" ? "primary" : "outline-primary"} aria-pressed={modo === "real"} onClick={() => setModo("real")}>Corrigidos pela inflação</Button>
                <Button variant={modo === "nominal" ? "primary" : "outline-primary"} aria-pressed={modo === "nominal"} onClick={() => setModo("nominal")}>Da época</Button>
              </ButtonGroup>
            </div>
          </div>
        </header>

        <main id="conteudo" tabIndex={-1}>
          <div className="bg-primary abertura" id="resumo">
            <div className="container-fluid px-4 px-lg-6">
              <p className="chapeu"><span>Contas públicas · Mogi Guaçu (SP)</span><span className="atualizado">Atualizado em {atualizado}</span></p>
              <h1 className="manchete">{cab.titulo}</h1>
              <p className="linha-fina">{cab.linha}</p>
            </div>
          </div>

          <div className="container-fluid px-4 px-lg-6 sobe">
            <Resumo D={D} modo={modo} />
            <p className="dica-modo">
              {modo === "real"
                ? `Valores em reais corrigidos pela inflação, a preços de ${D.base_precos}: assim os anos ficam comparáveis.`
                : "Valores em reais da época, sem correção pela inflação."}
            </p>

            <Secao id="fluxo" icone={<GitMerge size={22} />} kicker="1 · O caminho do dinheiro" titulo="De onde vem e para onde vai cada real"
              entendaTitulo="Entenda este gráfico"
              entenda={<p>Do lado das entradas, a receita arrecadada no ano. Do lado das saídas, a despesa <Termo k="liquidado">liquidada</Termo> por área de governo.
                Quando a Prefeitura gastou mais do que arrecadou, a diferença aparece à esquerda como &quot;saldo de anos anteriores&quot;. Quando sobrou, aparece à direita como &quot;não gasto no ano&quot;.
                Os valores seguem o botão do topo: corrigidos pela inflação ou da época.</p>}>
              <Fluxo D={D} fechados={fechados} modo={modo} />
            </Secao>

            <Secao id="recibo" icone={<DollarSign size={22} />} kicker="1 · O caminho do dinheiro" titulo="Seu recibo: para onde vai o seu imposto"
              comoLer={<>digite quanto você paga por ano à Prefeitura (IPTU, ISS, taxas) e veja como esse valor se divide entre as áreas, na mesma proporção dos gastos de {ult.ano}.</>}>
              <Recibo ult={ult} />
            </Secao>

            <Row className="g-0 gx-xl-4">
              <Col xl={6}>
                <Secao id="resultado" icone={<DollarSign size={22} />} kicker="2 · As contas do ano" titulo="A conta do ano fecha?" resposta={r.resultado}
                  comoLer={<>cada barra é um ano. Azul para cima: sobrou dinheiro (<Termo k="superavit">superávit</Termo>). Vermelho para baixo: faltou (<Termo k="deficit">déficit</Termo>).</>}
                  entenda={<p>É a receita arrecadada menos a despesa <Termo k="empenho">empenhada</Termo>, ou seja, o que a Prefeitura se comprometeu a pagar. Quando falta, o município cobre a diferença com sobras de anos anteriores ou deixa contas para o ano seguinte.</p>}>
                  <ColunasSinal anos={fechados} valores={fechados.map((a) => m(a, a.resultado_orcamentario))} rotulo={`Receita menos despesa por ano${sufixo}`}
                    nomePos="superávit" nomeNeg="déficit" extra={(a) => `<span class="muted">Receita ${mi(m(a, a.receita_realizada))} · despesa ${mi(m(a, a.despesa_empenhada))}</span>`} />
                  <TabelaDados cabecalho={["Ano", "Receita", "Despesa empenhada", "Resultado"]}
                    linhas={fechados.map((a) => [a.ano, mi(m(a, a.receita_realizada)), mi(m(a, a.despesa_empenhada)), mi(m(a, a.resultado_orcamentario))])} />
                </Secao>
              </Col>
              <Col xl={6}>
                <Secao id="caixa" icone={<Activity size={22} />} kicker="2 · As contas do ano" titulo="Sobra dinheiro para pagar o que ficou para trás?" resposta={r.caixa}
                  comoLer="dinheiro em caixa no fim de cada ano, já descontadas as contas que passaram para o ano seguinte. Abaixo de zero, as contas pendentes eram maiores que o dinheiro guardado."
                  entenda={<p>As contas que ficam para o ano seguinte se chamam <Termo k="rp">restos a pagar</Termo>. O número soma todas as fontes de recurso: uma fonte com sobra pode esconder outra no vermelho.</p>}>
                  <ColunasSinal anos={fechados} valores={fechados.map((a) => m(a, a.caixa_liquida_apos_rp))} rotulo={`Caixa após as contas pendentes${sufixo}`}
                    extra={(a) => (a.calculados.includes("caixa_liquida_apos_rp") ? '<span class="muted">Calculado: o relatório traz o saldo antes dos restos a pagar</span>' : a.caixa_liquida_apos_rp == null ? '<span class="muted">O relatório deste ano não traz o saldo</span>' : "")} />
                  <TabelaDados cabecalho={["Ano", "Caixa após restos a pagar"]} linhas={fechados.map((a) => [a.ano, mi(m(a, a.caixa_liquida_apos_rp))])} />
                </Secao>
              </Col>
            </Row>

            <Row className="g-0 gx-xl-4">
              <Col xl={6}>
                <Secao id="pessoal" icone={<Briefcase size={22} />} kicker="3 · Folha e dívida" titulo="Quanto da receita vai para salários" resposta={r.pessoal}
                  comoLer={<>a linha azul é o gasto com pessoal como parte da <Termo k="rcl">receita corrente líquida</Termo>. As linhas tracejadas são os limites da <Termo k="lrf">Lei de Responsabilidade Fiscal</Termo>.</>}>
                  <Linhas anos={D.anos} yMax={60} rotulo="Gasto com pessoal, % da receita corrente líquida"
                    series={[{ nome: "Pessoal", dados: D.anos.map((a) => a.pessoal_pct_rcl), cor: COR.s1, nota: (a) => (a.calculados?.includes("pessoal_pct_rcl") ? "(calculado)" : "") }]}
                    limites={[{ y: 54, rotulo: "Teto 54%", pos: "right" }, { y: 51.3, rotulo: "Prudencial", pos: "center" }, { y: 48.6, rotulo: "Alerta", pos: "left" }]} />
                  <TabelaDados cabecalho={["Ano", "Pessoal (% RCL)", "Valor"]} linhas={D.anos.map((a) => [a.parcial ? `${a.ano}*` : a.ano, pct(a.pessoal_pct_rcl), mi(m(a, a.pessoal))])} />
                </Secao>
              </Col>
              <Col xl={6}>
                <Secao id="divida" icone={<Activity size={22} />} kicker="3 · Folha e dívida" titulo="Quanto a cidade deve" resposta={r.divida}
                  comoLer={<>a <Termo k="dcl">dívida consolidada líquida</Termo> comparada com a receita de um ano. O Senado limita municípios a 120%.</>}>
                  <Linhas anos={D.anos} yMax={130} rotulo="Dívida consolidada líquida, % da receita corrente líquida"
                    series={[{ nome: "Dívida", dados: D.anos.map((a) => a.dcl_pct_rcl), cor: COR.s1, nota: (a) => (a.calculados?.includes("dcl_pct_rcl") ? "(calculado)" : "") }]}
                    limites={[{ y: 120, rotulo: "Limite 120%", pos: "right" }]} />
                  <TabelaDados cabecalho={["Ano", "Dívida (% RCL)", "Valor"]} linhas={D.anos.map((a) => [a.parcial ? `${a.ano}*` : a.ano, pct(a.dcl_pct_rcl), mi(m(a, a.dcl))])} />
                </Secao>
              </Col>
            </Row>

            <Secao id="minimos" icone={<Heart size={22} />} kicker="4 · Saúde e educação" titulo="A cidade aplica o mínimo que a Constituição exige?" resposta={r.minimos}
              comoLer="o município deve aplicar ao menos 25% da receita de impostos em educação e 15% em saúde. Cada linha precisa ficar acima da sua linha de mínimo."
              entendaTitulo="Por que há duas linhas para a saúde?"
              entenda={<p>Usamos o cálculo do <Termo k="tce">Tribunal de Contas</Termo>, o mesmo que ele usa para julgar as contas. A linha verde é do <Termo k="siops">SIOPS</Termo>, o sistema do Ministério da Saúde. Os dois contam despesas de formas diferentes, e em alguns anos a distância é grande.</p>}>
              <Linhas anos={fechados} yMax={40} legenda rotulo="Aplicação em educação e saúde, % da receita de impostos"
                series={[
                  { nome: "Educação, TCE-SP (mínimo 25%)", dados: fechados.map((a) => a.educacao_pct), cor: COR.s1, nota: (a) => (a.fonte_minimos?.educacao_pct === "RREO" ? "(RREO)" : "") },
                  { nome: "Saúde, TCE-SP (mínimo 15%)", dados: fechados.map((a) => a.saude_pct), cor: COR.s2, nota: (a) => (a.fonte_minimos?.saude_pct === "RREO" ? "(RREO)" : "") },
                  { nome: "Saúde, SIOPS", dados: fechados.map((a) => a.saude_pct_siops), cor: COR.s3 },
                ]}
                limites={[{ y: 25, rotulo: "Mínimo educação 25%", pos: "left" }, { y: 15, rotulo: "Mínimo saúde 15%", pos: "left" }]} />
              <TabelaDados cabecalho={["Ano", "Educação (TCE-SP)", "Saúde (TCE-SP)", "Saúde (SIOPS)"]}
                linhas={fechados.map((a) => [a.ano, pct(a.educacao_pct), pct(a.saude_pct), pct(a.saude_pct_siops)])} />
            </Secao>

            <Secao id="rcl" icone={<TrendingUp size={22} />} kicker="5 · Arrecadação e fornecedores" titulo="Quanto a Prefeitura arrecada por morador" resposta={r.rcl}
              comoLer="a receita corrente líquida dividida pela população estimada de cada ano.">
              <Linhas anos={D.anos} rotulo={`Receita corrente líquida por habitante${sufixo}`} fmt={reais} fmtEixo={(v) => nf0.format(v)}
                series={[{ nome: "Receita por habitante", dados: D.anos.map(percap), cor: COR.s1 }]} />
              <TabelaDados cabecalho={["Ano", "RCL por habitante", "RCL", "População"]}
                linhas={D.anos.map((a) => [a.parcial ? `${a.ano}*` : a.ano, reais(percap(a)), mi(m(a, a.rcl)), nf0.format(a.populacao || 0)])} />
            </Secao>

            {fo && (
              <Secao id="fornecedores" icone={<Users size={22} />} kicker="5 · Arrecadação e fornecedores" titulo={`Quem mais recebeu da Prefeitura em ${fo.ano}`} resposta={r.fornecedores}>
                <BarrasH rotulo={`Os 15 favorecidos que mais receberam em ${fo.ano}`}
                  itens={fo.top_terceiros.map((t) => ({ nome: t.nome, valor: t.pago, extra: t.doc ? `CNPJ ${cnpj(t.doc)}` : "" }))} />
                <TabelaDados cabecalho={["Favorecido", "CNPJ", "Pago"]} linhas={fo.top_terceiros.map((t) => [t.nome, cnpj(t.doc) || "—", mi(t.pago)])} />
                <details className="entenda">
                  <summary>Pagamentos a órgãos públicos, encargos e dívida</summary>
                  <div className="entenda-corpo">
                    <p>INSS, Receita Federal, precatórios no Tribunal de Justiça, parcelas de dívida e repasses a autarquias. São obrigações, não compras.</p>
                    <BarrasH rotulo="Pagamentos a órgãos públicos" cor={COR.mudo} itens={fo.top_publicos.map((t) => ({ nome: t.nome, valor: t.pago }))} />
                  </div>
                </details>
              </Secao>
            )}

            {D.comparacao && (
              <Secao id="comparacao" icone={<Users size={22} />} kicker="6 · Comparação" titulo="Como Mogi Guaçu se sai perto de cidades parecidas">
                <Comparacao C={D.comparacao} />
              </Secao>
            )}

            <Secao id="pareceres" icone={<Shield size={22} />} kicker="7 · Fiscalização" titulo="O que o Tribunal de Contas decidiu" resposta={r.pareceres}
              comoLer={<>todo ano o <Termo k="tce">TCE-SP</Termo> dá um <Termo k="parecer">parecer prévio</Termo> sobre as contas. Quem julga em definitivo é a Câmara Municipal. O arquivo público do Tribunal só vai até {D.pareceres?.at(-1)?.ano}.</>}>
              <Pareceres P={D.pareceres || []} />
            </Secao>

            <Secao id="glossario" icone={<BookOpen size={22} />} kicker="Referência" titulo="Glossário"
              comoLer="os termos técnicos usados nesta página, em poucas palavras. Nos textos acima, toque numa palavra sublinhada para ver a definição.">
              <Glossario />
            </Secao>

            <Secao id="fontes" icone={<Info size={22} />} kicker="Referência" titulo="De onde saem esses números">
              <Fontes D={D} ultAno={ult.ano} parcialAno={parcial?.ano} />
            </Secao>
          </div>
        </main>

        <footer className="rodape">
          Dados atualizados em {atualizado}. Projeto independente, sem vínculo com a Prefeitura de Mogi Guaçu. Código e dados abertos.
          Layout baseado no Dash UI (licença MIT).
        </footer>
      </div>

      <div className="tooltip-graf" id="tooltip" hidden />
      <p className="visually-hidden" id="anuncio" aria-live="polite" />
    </div>
  );
}
