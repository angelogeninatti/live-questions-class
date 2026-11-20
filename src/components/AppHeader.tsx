import type { ReactNode } from 'react';
import './AppHeader.css';

interface AppHeaderProps {
  title: string;
  /** Contenuto a destra del titolo: menu, nickname, pulsanti. */
  children?: ReactNode;
}

/** Barra in cima alla pagina, comune alle viste di studenti e docente. */
export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header className="app-header">
      <span className="app-header-title">{title}</span>
      {children}
    </header>
  );
}
