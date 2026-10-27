import Link from "next/link";
import { ArrowDownRight, ArrowRight, Check, Dot, MoveUpRight, Layers, LockKeyhole, Paintbrush, PencilRuler, Sparkles, WandSparkles } from "lucide-react";
import { UploadZone } from "@/components/upload-zone";

export default function HomePage() {
  return <main>
    <section className="studio-hero" id="converter">
      <div className="container studio-grid">
        <div className="studio-intro"><div className="studio-kicker"><span className="spark-mark">✳</span> UM ESTÚDIO DE VETORES NO SEU NAVEGADOR</div>
          <h1>De pixels a <em>possibilidades.</em></h1>
          <p>Suas imagens viram caminhos vetoriais que você pode ampliar, ajustar e usar em novos projetos. Tudo sem instalar programas ou enviar arquivos para um servidor.</p>
          <div className="hero-tags"><span><Check size={15}/> Grátis</span><span><Check size={15}/> Sem cadastro</span><span><Check size={15}/> Processamento local</span></div>
          <a href="#mesa" className="hero-explore">CONHEÇA SUA MESA DE CRIAÇÃO <ArrowDownRight size={17}/></a>
        </div>
        <div className="studio-workspace" id="mesa">
          <div className="workspace-topline"><span className="workspace-chip"><span/> MESA DE CRIAÇÃO</span><span>01 / EXPERIMENTAR</span></div>
          <div className="art-board" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><svg viewBox="0 0 480 320" className="art-sculpture"><defs><linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9ff7b"/><stop offset="1" stopColor="#8fce8c"/></linearGradient></defs><path d="M113 264C92 195 102 115 156 76S284 63 332 117C397 190 326 276 239 263C207 259 180 245 150 266Z" fill="url(#leaf)"/><path d="M160 258Q178 190 230 142Q274 102 337 114" fill="none" stroke="#18372e" strokeWidth="11" strokeLinecap="round"/><path d="M189 209C135 170 138 119 169 94C203 70 233 110 234 146" fill="#fda78a" stroke="#18372e" strokeWidth="5" strokeLinejoin="round"/><circle cx="341" cy="118" r="17" fill="#ffe9b0" stroke="#18372e" strokeWidth="5"/><circle cx="157" cy="258" r="12" fill="#18372e"/><path d="m323 213 38 7-22 31-16-38Z" fill="#fda78a" stroke="#18372e" strokeWidth="4"/></svg><div className="art-label art-label-a">NÓ / 024</div><div className="art-label art-label-b">CURVA / 018</div></div>
          <div className="workstation-note"><span className="note-dot"/> Seu processo criativo começa aqui <span className="mini-shortcut">SVG • PNG • PDF</span></div>
          <UploadZone />
        </div>
      </div>
      <div className="container hero-bottom"><span>CRIE. AJUSTE. EXPORTE.</span><span>SEM COBRANÇA POR IMAGEM <ArrowRight size={16}/></span></div>
    </section>
    <section className="intro-band container"><span className="section-index">/ 02 — O QUE VOCÊ FAZ</span><div><h2>Uma imagem comum.<br/><em>Um novo jeito de criar.</em></h2><p>De um ícone simples a uma ilustração: use as ferramentas essenciais para preparar arquivos vetoriais sem assinatura.</p></div></section>
    <section className="feature-mosaic container">
      <article className="mosaic-card mosaic-dark"><div className="mosaic-number">01 /</div><div className="mosaic-big-icon"><Paintbrush size={51} strokeWidth={1.3}/></div><h3>Transforme com liberdade.</h3><p>Reduza cores, suavize detalhes e gere contornos SVG reais a partir dos pixels.</p></article>
      <article className="mosaic-card mosaic-lime"><div className="mosaic-number">02 /</div><div className="mosaic-big-icon"><PencilRuler size={51} strokeWidth={1.3}/></div><h3>Enxergue cada diferença.</h3><p>Compare original e vetor em tempo real, ajuste o zoom e experimente novas opções.</p></article>
      <article className="mosaic-card mosaic-peach"><div className="mosaic-number">03 /</div><div className="mosaic-big-icon"><Layers size={51} strokeWidth={1.3}/></div><h3>Leve para outro lugar.</h3><p>Exporte em SVG, PDF, EPS, DXF ou PNG para continuar trabalhando nos seus programas.</p></article>
    </section>
    <section className="privacy-strip"><div className="container privacy-strip-inner"><LockKeyhole size={28}/><div><h2>Seu arquivo é seu.</h2><p>O processamento acontece no próprio navegador. Não enviamos imagens para a nuvem.</p></div><Link href="/about" className="privacy-link">Entenda a tecnologia <MoveUpRight size={17}/></Link></div></section>
    <section className="last-cta container"><div className="last-cta-symbol"><Sparkles size={31}/></div><div><span className="section-index">/ PRONTO PARA CRIAR?</span><h2>Solte uma imagem.<br/><em>Deixe a ideia ganhar forma.</em></h2></div><Link href="/#converter" className="btn btn-primary">Voltar ao estúdio <WandSparkles size={18}/></Link></section>
  </main>;
}
