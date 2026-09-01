'use client';
import { useEffect, useState } from 'react';

// Cache em nível de módulo — GameArtBanner é renderizado uma vez por
// pelada numa lista (podem ser dezenas ao mesmo tempo); sem isso, cada
// card dispararia sua própria requisição pra /api/imagens-telainicial.
// A promise é compartilhada entre todos os componentes que chamam o hook
// na mesma sessão de página, então só o primeiro efetivamente busca.
let cachePromise = null;

function buscar() {
  if (!cachePromise) {
    cachePromise = fetch('/api/imagens-telainicial')
      .then((res) => {
        if (!res.ok) throw new Error(`resposta ${res.status}`);
        return res.json();
      })
      .catch(() => {
        // Não deixa uma falha (rede instável, etc.) travar a lista vazia
        // pro resto da sessão inteira — zera o cache pra próxima chamada
        // (próximo GameArtBanner montado, por exemplo) tentar de novo.
        cachePromise = null;
        return [];
      });
  }
  return cachePromise;
}

// Lista de imagens artísticas (public/imagens_telainicial/) — usada pelo
// fundo rotativo da Home (HomeHero) e pelo fallback de pelada sem
// modalidade (GameArtBanner). Array vazio até a busca resolver.
export function useImagensTelainicial() {
  const [imagens, setImagens] = useState([]);

  useEffect(() => {
    let ativo = true;
    buscar().then((lista) => { if (ativo) setImagens(lista); });
    return () => { ativo = false; };
  }, []);

  return imagens;
}
