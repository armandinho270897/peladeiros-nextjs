// Selo de ícone de categoria das notificações — corte único diagonal no
// canto superior-direito (mesma técnica do "P" da logo), recolorido via
// currentColor pela cor semântica do tipo. Usado tanto em NotificationCard
// (34px) quanto no feed resumido da Home (38px), num componente só pra não
// duplicar a moldura em dois lugares.
export default function NotifIconBadge({ icone: Icone, cor = 'concrete', indicador: Indicador, indicadorCor, size = 34 }) {
  return (
    <span
      className="pl-notif-badge"
      aria-hidden="true"
      style={{ width: size, height: size, color: `var(--${cor})` }}
    >
      <Icone size={Math.round(size * 0.56)} />
      {Indicador && (
        <span className="pl-notif-badge-indicator" style={{ background: `var(--${indicadorCor})` }}>
          <Indicador size={8} />
        </span>
      )}
    </span>
  );
}
