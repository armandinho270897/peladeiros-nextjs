'use client';
import Avatar from './Avatar';
import TrophyIcon from './icons/TrophyIcon';
import { usePatenteSubiu } from '@/lib/usePatenteSubiu';
import { MODALIDADE_LABEL, POSICAO_LABEL } from '@/lib/gameUtils';

// Prioridade de reputação, não de volume — nota/moral/presença/pontualidade/
// fair play, nunca contagem bruta (peladasConfirmadas, peladasComoCapitao:
// essas continuam só no histórico e na barra de progresso da patente, que já
// conta peladas jogadas). No máximo 4 colunas: é um cartão, não a grade
// antiga — quem tem menos histórico (ex: sem nota ainda) só vê menos
// colunas, nunca uma vazia.
function statsDaFicha(stats) {
  const lista = [];
  if (stats.notaMedia != null) lista.push({ chave: 'nota', num: stats.notaMedia.toFixed(1), unidade: '★', label: 'Nota' });
  lista.push({ chave: 'moral', num: String(Math.round(stats.moral)), label: 'Moral' });
  if (stats.totalPeladasPassadas > 0) lista.push({ chave: 'presenca', num: String(stats.percentualPresenca), unidade: '%', label: 'Presença' });
  if (stats.percentualPontualidade != null) lista.push({ chave: 'pontualidade', num: String(stats.percentualPontualidade), unidade: '%', label: 'Pontual' });
  if (stats.percentualFairPlay != null) lista.push({ chave: 'fairplay', num: String(stats.percentualFairPlay), unidade: '%', label: 'Fair play' });
  return lista.slice(0, 4);
}

// Ficha de Jogador — substitui o trio solto (cabeçalho + patente + grade de
// stats) que existia em app/perfil/page.js e no perfil público por um cartão
// só. Usado nos dois lugares (`celebrar=false` no perfil de outra pessoa,
// mesma razão de PatenteCard.js: a chave de "última patente vista" é global
// no localStorage, não por-pessoa-visitada).
export default function FichaJogador({ profile, stats, patente, celebrar = true }) {
  const subiu = usePatenteSubiu(patente?.nome, celebrar);
  const statsEscolhidos = statsDaFicha(stats);

  const posicoes = profile.modalidade_principal
    ? `${MODALIDADE_LABEL[profile.modalidade_principal]}${profile.posicoes?.length > 0 ? ` · ${profile.posicoes.map((s) => POSICAO_LABEL[s] || s).join(' / ')}` : ''}`
    : null;
  const subtitulo = [profile.bairro, posicoes].filter(Boolean).join(' · ');

  return (
    <>
      {subiu && (
        <div className="pl-glass-card pl-glass-unlocked pl-patente-celebrate pl-reveal pl-reveal-3" style={{ maxWidth: 400, margin: '0 auto 10px' }}>
          <span className="pl-glass-icon"><TrophyIcon size={20} /></span>
          <div className="pl-glass-body">
            <p className="pl-glass-msg">Você virou <b>{patente.nome}</b>.</p>
          </div>
        </div>
      )}

      <div className="pl-ficha pl-reveal pl-reveal-3">
        {patente && (
          <span className="pl-ficha-patente-tag">
            {patente.nome}
            {patente.capitao && <span className="pl-ficha-patente-capitao">· Capitão</span>}
          </span>
        )}

        <div className="pl-ficha-avatar-wrap">
          <Avatar nome={profile.nome} size={104} ring fotoUrl={profile.foto_url} />
        </div>

        <h2 className="pl-ficha-nome">{profile.nome}</h2>
        {subtitulo && <p className="pl-ficha-sub">{subtitulo}</p>}

        <span className="pl-ficha-underline" aria-hidden="true" />

        {statsEscolhidos.length > 0 && (
          <div className="pl-ficha-stats">
            {statsEscolhidos.map((s) => (
              <div key={s.chave} className="pl-ficha-stat">
                <div className="num">{s.num}{s.unidade && <span className="unidade">{s.unidade}</span>}</div>
                <div className="label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {patente?.proximaPatente ? (
          <div className="pl-ficha-progress-wrap">
            <div className="pl-progress-track">
              <div
                className="pl-progress-fill"
                style={{ width: `${Math.min(100, Math.round((patente.proximaPatente.atual / patente.proximaPatente.meta) * 100))}%` }}
              />
            </div>
            <p className="pl-ficha-progress-note">Faltam {patente.proximaPatente.meta - patente.proximaPatente.atual} peladas pra virar {patente.proximaPatente.nome}</p>
          </div>
        ) : patente ? (
          <p className="pl-ficha-maxed">★ patente máxima ★</p>
        ) : null}
      </div>
    </>
  );
}
