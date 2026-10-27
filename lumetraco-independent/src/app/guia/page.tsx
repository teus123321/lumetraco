import Link from "next/link";
import { ArrowUpRight, ChevronRight, FileImage, Layers, LockKeyhole, SlidersHorizontal, WandSparkles } from "lucide-react";
const steps = [
  { icon: FileImage, number: "01", title: "Escolha sua imagem", text: "Arraste um PNG, JPG, GIF, BMP ou WebP. Você também pode colar uma imagem usando Ctrl+V." },
  { icon: WandSparkles, number: "02", title: "Gere os caminhos", text: "Um algoritmo local agrupa cores e encontra os contornos. O resultado é SVG com caminhos vetoriais, não uma foto ampliada." },
  { icon: SlidersHorizontal, number: "03", title: "Encontre o equilíbrio", text: "Ajuste quantidade de cores, nível de detalhe e redução de ruído. Observe a prévia antes de exportar." },
  { icon: Layers, number: "04", title: "Exporte sem pagar", text: "Salve SVG, PDF, EPS, DXF ou PNG. O DXF contém apenas contornos; PNG é um arquivo rasterizado." },
];
export default function GuidePage() {
  return <main className="guide-page container">
    <div className="guide-head"><div><span className="section-index">/ GUIA RÁPIDO</span><h1>Quatro etapas.<br/><em>Infinitas ideias.</em></h1></div><p>O LumeTraço foi pensado para projetos pessoais e para quem quer experimentar imagens vetoriais sem depender de plataformas pagas.</p></div>
    <div className="guide-timeline">{steps.map(s => <article className="guide-step" key={s.number}><div className="guide-count">{s.number}</div><div className="guide-icon"><s.icon size={30} strokeWidth={1.5}/></div><div><h2>{s.title}</h2><p>{s.text}</p></div><ChevronRight className="guide-arrow" size={23}/></article>)}</div>
    <div className="guide-notice"><LockKeyhole size={26}/><div><h2>Privacidade por padrão.</h2><p>O arquivo é processado pelo navegador, em memória de sessão. Não há login, pagamentos ou upload para nossos servidores.</p></div></div>
    <div className="guide-action"><h2>Agora é com você.</h2><Link href="/#converter" className="btn btn-primary">Abrir mesa de criação <ArrowUpRight size={18}/></Link></div>
  </main>;
}
