import RaioIcon from './icons/RaioIcon';

// Botão de entrada do "Desafiado" — usa var(--neon) como toda ação
// primária do app (ver o comentário de sistema de cores em
// app/styles/base.css), a borda em degradê é o que diferencia visualmente
// sem quebrar a regra de cor.
export default function DesafiadoCta({ onClick }) {
  return (
    <button type="button" className="pl-desafiado-cta" onClick={onClick}>
      <span className="pl-desafiado-cta-icon"><RaioIcon size={24} /></span>
      <span className="pl-desafiado-cta-text">
        <strong>Desafiado</strong>
        <span>Sorteia os times de quem já tá na quadra e joga agora — com fila e cronômetro.</span>
      </span>
    </button>
  );
}
