import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Orbitta Booking | Appointments made beautiful',description:'A beautiful online booking experience, powered by Orbitta.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
