import { isAdmin } from '@/lib/server';
import Admin from './panel';
import Login from './login';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function Page(){if(!await isAdmin())return <Login/>;return <Admin/>;}
