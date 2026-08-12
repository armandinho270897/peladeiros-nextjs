'use client';

// App Router remonta este arquivo a cada navegação — usamos isso pra um
// fade-in simples entre telas (lista -> detalhe -> perfil), sem lib nova.
export default function Template({ children }) {
  return <div className="pl-page-fade">{children}</div>;
}
