import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import styles from './not-found.module.css';

export const metadata: Metadata = {
  title: 'Página não encontrada — Studio 601',
  robots: { index: false },
};

export default function NotFound() {
  return <div className={styles.page}>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap"/>
    <main className={styles.layout}>
      <a href="/" className={styles.brand} aria-label="Studio 601 — voltar ao início">
        <span className={styles.logo}><img src="/logos/studio.png" alt="Studio 601" width={1254} height={1254}/></span>
      </a>
      <div className={styles.content}>
        <h1><span className={styles.code}>404</span>PÁGINA NÃO<br/>ENCONTRADA.</h1>
        <p>Esta página não existe ou já não está disponível.</p>
        <a href="/" className={styles.back}><span>Voltar ao início</span><span className={styles.arrow}><ArrowUpRight aria-hidden="true"/></span></a>
      </div>
    </main>
    <footer className={styles.footer}>© {new Date().getFullYear()} Studio 601</footer>
  </div>;
}
