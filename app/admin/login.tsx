'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './login.module.css';

export default function Login() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fields.get('username'), password: fields.get('password') }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error);
      window.location.replace('/admin');
    } catch (e) { setError((e as Error).message || 'Não foi possível entrar.'); setBusy(false); }
  }
  return <main className={styles.page}>
    <div className={styles.layout}>
      <Link href="/" className={styles.brand} aria-label="Studio 601 — voltar ao site">
        <span className={styles.logo}>
          {/* Keep the original transparent logo and its public-site crop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/studio.png" alt="Studio 601" width={1254} height={1254}/>
        </span>
      </Link>
      <section className={styles.content} aria-labelledby="login-title">
        <h1 id="login-title">Administração.</h1>
        <form onSubmit={submit} className={styles.form} aria-busy={busy}>
          <div className={styles.field}><label htmlFor="username">Utilizador</label><input id="username" name="username" autoComplete="username" required maxLength={100} autoCapitalize="none" spellCheck={false}/></div>
          <div className={styles.field}><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024}/></div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit} disabled={busy}>
            <span>{busy ? 'A entrar…' : 'Entrar'}</span>
            <span className={styles.arrow} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
          </button>
        </form>
        <Link className={styles.back} href="/">Voltar ao site</Link>
      </section>
    </div>
    <footer className={styles.footer}>© {new Date().getFullYear()} Studio 601</footer>
  </main>;
}
