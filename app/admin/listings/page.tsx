import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/security';
import {getListingSettings} from '@/lib/listing-settings';
import {AdminNav} from '@/components/AdminNav';
import {Editor} from './Editor';
export default async function Listings(){
 if(!await getAdmin())redirect('/admin/login');
 const state=await getListingSettings();
 return <div className="admin-shell"><AdminNav/><main className="admin-main"><div className="admin-title"><h1>Featured listings</h1><a href="/" target="_blank" rel="noreferrer">View homepage ↗</a></div><Editor {...state}/></main></div>
}
