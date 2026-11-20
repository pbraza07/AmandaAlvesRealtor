import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/security';
import {AdminNav} from '@/components/AdminNav';
import {MeetingStudio} from '@/components/MeetingStudio';
export default async function Meetings(){if(!await getAdmin())redirect('/admin/login');return <div className="admin-shell"><AdminNav/><main className="admin-main"><div className="admin-title"><div><span className="eyebrow">Owner workspace</span><h1>Meeting Studio</h1><p>Turn a conversation into clear next steps.</p></div></div><MeetingStudio/></main></div>}
