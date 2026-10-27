import { redirect } from "next/navigation";
// Rota antiga: a nova versão é gratuita e não simula tabela de preços de terceiros.
export default function LegacyPricingRedirect() { redirect("/guia"); }
