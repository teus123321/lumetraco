import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function SiteFooter() {
  return <footer className="site-footer"><div className="container footer-inner">
    <div><Link href="/" className="footer-brand">Lume<span>Traço</span></Link><p>Uma ferramenta independente para transformar imagens em caminhos vetoriais.</p></div>
    <nav aria-label="Rodapé"><Link href="/">Início</Link><Link href="/guia">Como funciona</Link><Link href="/about">Privacidade e limites</Link><Link href="/#converter">Criar vetor <ArrowUpRight size={14}/></Link></nav>
  </div><div className="footer-bottom container">Feito para experimentação e uso pessoal. Sem associação com serviços comerciais de vetorização.</div></footer>;
}
