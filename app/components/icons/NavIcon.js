import HomeIcon from './HomeIcon';
import TacticalPitchIcon from './TacticalPitchIcon';
import CornerFlagIcon from './CornerFlagIcon';
import JerseyIcon from './JerseyIcon';
import GameCardIcon from './GameCardIcon';

// Mapa puro id -> ícone, nenhuma lógica de rota aqui — quem decide qual id
// passar e se a aba está ativa é sempre BottomNav.js (usePathname), como já
// era antes. Chaves batem com ORDEM_NAV (lib/bottomNavWheel.js); 'criar'
// incluso pra o botão central (CriarButton.js) poder usar o mesmo mapa.
const ICONS = {
  inicio: HomeIcon,
  peladas: TacticalPitchIcon,
  avisos: CornerFlagIcon,
  perfil: JerseyIcon,
  criar: GameCardIcon,
};

export default function NavIcon({ id, active, className, size }) {
  const Icon = ICONS[id];
  if (!Icon) return null;
  return <Icon active={active} className={className} size={size} />;
}
