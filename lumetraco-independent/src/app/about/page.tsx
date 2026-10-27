import Link from "next/link";
import { ArrowUpRight, Code2, Eye, FileDown, LockKeyhole, Palette, ScanLine, ShieldCheck } from "lucide-react";
export default function AboutPage() {
  return <main className="about-page container">
    <div className="about-heading"><span className="section-index">/ SOBRE O LUMETRAÇO</span><h1>Uma ferramenta pequena.<br/><em>Ideias sem fronteiras.</em></h1><p>Um projeto independente de vetorização de imagens para uso pessoal, com um motor de processamento executado no navegador.</p><Link href="/#converter" className="btn btn-primary">Experimentar o estúdio <ArrowUpRight size={17}/></Link></div>
    <section className="about-statement"><span>O QUE ACONTECE POR TRÁS DA TELA</span><div><h2>Não é uma IA secreta. É geometria construída a partir da imagem.</h2><p>O algoritmo seleciona uma paleta reduzida de cores, segmenta regiões e converte seus limites em caminhos SVG. O resultado pode variar conforme a complexidade da imagem e as configurações escolhidas.</p></div></section>
    <div className="about-feature-grid">
      <article><Palette/><h3>Paleta reduzida</h3><p>O agrupamento de cores organiza tons semelhantes para simplificar a ilustração.</p></article>
      <article><ScanLine/><h3>Contornos reais</h3><p>As bordas das regiões são convertidas em polígonos e caminhos vetoriais.</p></article>
      <article><Eye/><h3>Comparação interativa</h3><p>Inspecione original e resultado com zoom e divisor ajustável.</p></article>
      <article><FileDown/><h3>Exportações</h3><p>SVG, PNG, PDF, EPS e DXF, respeitando as características de cada formato.</p></article>
      <article><LockKeyhole/><h3>Privacidade local</h3><p>As imagens são processadas em um Web Worker, sem envio para o servidor.</p></article>
      <article><Code2/><h3>Implementação própria</h3><p>Sem uso de APIs protegidas, pesos de IA proprietários ou infraestrutura privada.</p></article>
    </div>
    <section className="about-limits"><ShieldCheck size={27}/><div><h2>O que você precisa saber</h2><p>Esta versão é uma ferramenta independente, não uma implementação dos modelos de IA de outros serviços. Fotografias, textos, gradientes, áreas semitransparentes e desenhos complexos podem perder detalhes. Nenhuma equivalência de qualidade com motores comerciais é prometida. O uso do nome e da marca deve ser validado antes da publicação definitiva.</p></div></section>
  </main>;
}
