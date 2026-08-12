import EmptyFieldIcon from './EmptyFieldIcon';

// Marca d'água bem fraca das linhas de campo a giz (mesma arte usada nos
// estados vazios) no topo da Home, só pra dar profundidade ao cabeçalho.
export default function HeaderWatermark() {
  return (
    <div className="pl-header-watermark" aria-hidden="true">
      <EmptyFieldIcon width={260} />
    </div>
  );
}
