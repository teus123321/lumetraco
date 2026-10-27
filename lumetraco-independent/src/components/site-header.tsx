"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { href: "/", label: "Início" },
  { href: "/guia", label: "Como funciona" },
  { href: "/about", label: "Sobre o projeto" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="site-header__inner">
    <Link href="/" className="brand" aria-label="LumeTraço, página inicial" onClick={() => setOpen(false)}>
      <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 44 44" width="42" height="42" fill="none"><path d="M9 28C12 13 24 10 35 13C23 15 22 30 10 33" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/><circle cx="34" cy="12" r="4" fill="currentColor"/><circle cx="10" cy="33" r="3" fill="currentColor"/></svg></span>
      <span>Lume<span className="brand-accent">Traço</span></span>
    </Link>
    <nav className="site-nav" aria-label="Navegação principal">{links.map(link => <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>{link.label}</Link>)}</nav>
    <div className="site-header__actions"><span className="free-pill">SEM CADASTRO</span><Link href="/#converter" className="header-cta">Criar vetor <ArrowUpRight size={16}/></Link></div>
    <button className="menu-trigger" type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? <X size={23}/> : <Menu size={23}/>}</button>
  </div>{open && <nav className="mobile-nav" aria-label="Navegação móvel">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}<Link href="/#converter" onClick={() => setOpen(false)} className="mobile-cta">Começar agora <ArrowUpRight size={15}/></Link></nav>}</header>;
}
