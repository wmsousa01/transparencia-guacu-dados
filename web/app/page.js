// Os dados entram no build: a página sai pronta em HTML, com os números já escritos.
import D from "@/data/indicadores.json";
import Painel from "@/components/Painel";

export default function Page() {
  return <Painel D={D} />;
}
