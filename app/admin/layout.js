import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import AdminTabs from './AdminTabs';

export const metadata = { title: 'Administração | Peladeiros' };

// Proteção de verdade: esconder o link no Perfil é só UX (app/perfil/page.js),
// quem trava de fato é este check no servidor, antes de qualquer dado da
// área de administração ser montado — igual toda rota /api/admin/** faz
// via lib/adminAuth.js (authorizeAdmin()).
export default async function AdminLayout({ children }) {
  const authClient = createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/perfil');

  return (
    <div className="pl-admin">
      <AdminTabs />
      <div className="pl-admin-content">{children}</div>
    </div>
  );
}
