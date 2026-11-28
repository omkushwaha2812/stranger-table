import './globals.css';
import {currentUser} from '@/lib/auth';
import {MobileConnectionAlert} from '@/components/mobile-connection-alert';
import type { Metadata } from 'next';
import {Inter,Playfair_Display} from 'next/font/google';
const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});
const playfair=Playfair_Display({subsets:['latin'],variable:'--font-playfair',display:'swap'});
export const metadata: Metadata = {title:'Stranger Table',description:'Strangers today. Stories tomorrow.'};
export default async function Layout({children}:{children:React.ReactNode}) {const user=await currentUser();return <html lang="en" className={`${inter.variable} ${playfair.variable}`}><body>{children}{user && <MobileConnectionAlert key={user.id} user={user.id}/>}</body></html>}
