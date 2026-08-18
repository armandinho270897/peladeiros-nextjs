import FutebolCampoIcon from './FutebolCampoIcon';
import SocietyIcon from './SocietyIcon';
import FutsalIcon from './FutsalIcon';
import PraiaIcon from './PraiaIcon';
import CampoIcon from './CampoIcon';

export const TIPOS_JOGO = ['Futebol de campo', 'Society', 'Futsal', 'Futebol de areia', 'Outro'];

const ICONS = {
  'Futebol de campo': FutebolCampoIcon,
  Society: SocietyIcon,
  Futsal: FutsalIcon,
  'Futebol de areia': PraiaIcon,
  Outro: CampoIcon,
};

// Fonte única do ícone por tipo de jogo — usado no wizard de criar pelada,
// no card e nos chips de filtro. Tipo desconhecido/vazio cai no ícone
// genérico (CampoIcon) em vez de não mostrar nada.
export default function TipoJogoIcon({ tipo, size = 14 }) {
  const Icon = ICONS[tipo] || CampoIcon;
  return <Icon size={size} />;
}
