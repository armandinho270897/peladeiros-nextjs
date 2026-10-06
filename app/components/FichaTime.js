'use client';
import Avatar from './Avatar';
import CaptainIcon from './icons/CaptainIcon';
import UniformPreview from './UniformPreview';
import { MODALIDADE_LABEL } from '@/lib/gameUtils';
import { NIVEL_COMPETITIVO_LABEL } from '@/lib/timeConstants';

const RECRUTAMENTO_INFO = {
  procurando_jogadores: { label: 'Recrutando', className: 'aberto' },
  procurando_goleiro: { label: 'Precisa de goleiro', className: 'goleiro' },
};

// Cor do uniforme vira o brilho/borda do cartão só se o capitão ligou a
// opção (times.ficha_cor_do_time). Valida o formato antes de usar (o campo
// é texto livre no banco) e clareia cores muito escuras — um preto ou azul
// marinho puro deixaria o brilho invisível e o cartão sem contorno.
function rgbDoBrilho(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminosidade = r * 0.299 + g * 0.587 + b * 0.114;
  if (luminosidade < 70) {
    const mistura = 0.45;
    [r, g, b] = [r, g, b].map((c) => Math.round(c + (255 - c) * mistura));
  }
  return `${r},${g},${b}`;
}

// Ficha do Time — o topo da página de time (escudo, nome, sigla, selos e
// números) virando um cartão só, mesma família da Ficha de Jogador
// (FichaJogador.js). Só apresentação: os botões de ação (editar, desafiar,
// pedir pra entrar...) continuam no cabeçalho da página.
export default function FichaTime({ time, capitao, totalMembros, stats }) {
  const recrutamento = RECRUTAMENTO_INFO[time.recrutamento];
  const brilho = time.ficha_cor_do_time ? rgbDoBrilho(time.cor_primaria) : null;
  const temUniforme = !!(time.cor_primaria || time.cor_secundaria);

  const subtitulo = [
    time.bairro || 'Bairro não informado',
    time.modalidade && (MODALIDADE_LABEL[time.modalidade] || time.modalidade),
    time.nivel_competitivo && (NIVEL_COMPETITIVO_LABEL[time.nivel_competitivo] || time.nivel_competitivo),
    time.ano_fundacao && `Desde ${time.ano_fundacao}`,
  ].filter(Boolean).join(' · ');

  const placar = [{ chave: 'elenco', num: String(totalMembros), label: 'Elenco' }];
  if (stats?.confrontosDisputados > 0) placar.push({ chave: 'confrontos', num: String(stats.confrontosDisputados), label: 'Confrontos' });
  if (stats?.notaMediaElenco != null) placar.push({ chave: 'nota', num: stats.notaMediaElenco.toFixed(1), unidade: '★', label: 'Nota do elenco' });

  return (
    <div className="pl-ficha pl-reveal pl-reveal-3" style={brilho ? { '--ficha-rgb': brilho } : undefined}>
      {time.sigla && <span className="pl-ficha-tag">{time.sigla}</span>}

      <div className="pl-ficha-avatar-wrap">
        <Avatar nome={time.nome} size={104} ring fotoUrl={time.escudo_url} />
      </div>

      <h2 className="pl-ficha-nome">{time.nome}</h2>
      <p className="pl-ficha-sub">{subtitulo}</p>
      {capitao && <p className="pl-ficha-capitao-line"><CaptainIcon /> Capitão: <b>{capitao.nome}</b></p>}

      <span className="pl-ficha-underline" aria-hidden="true" />

      <div className="pl-ficha-stats">
        {placar.map((s) => (
          <div key={s.chave} className="pl-ficha-stat">
            <div className="num">{s.num}{s.unidade && <span className="unidade">{s.unidade}</span>}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      {(recrutamento || time.aceita_desafios || temUniforme) && (
        <div className="pl-ficha-chips">
          {temUniforme && <UniformPreview corPrimaria={time.cor_primaria} corSecundaria={time.cor_secundaria} size={30} />}
          {recrutamento && <span className={`pl-time-card-recrutamento ${recrutamento.className}`}>{recrutamento.label}</span>}
          {time.aceita_desafios && <span className="pl-time-card-recrutamento aberto">Aceita desafios</span>}
        </div>
      )}
    </div>
  );
}
