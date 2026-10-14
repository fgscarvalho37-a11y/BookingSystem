'use client';
import { useState,useEffect,useRef } from 'react';
import { ArrowUpRight,ArrowRight,ArrowLeft,CalendarDays,Clock,Check,MapPin,ShieldCheck,Sparkles,Instagram } from 'lucide-react';
import type { PublicTenant, Service, Slot } from '@/lib/types';
const fmt=(price:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(price/100);
const dateInZone=(zone:string)=>{
 const pieces=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=(key:string)=>pieces.find(p=>p.type===key)?.value||'';
 return `${get('year')}-${get('month')}-${get('day')}`;
};
export default function BookingPage({business,services,demo=false}:{business:PublicTenant;services:Service[];demo?:boolean}){
 const [open,setOpen]=useState(false),[step,setStep]=useState(1),[serviceId,setServiceId]=useState(''),[date,setDate]=useState(''),[slots,setSlots]=useState<Slot[]>([]),[time,setTime]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState('');
 const iframe=useRef<HTMLIFrameElement>(null);
 const [customer,setCustomer]=useState({name:'',email:'',phone:''});
 const selected=services.find(s=>s.id===serviceId);
 useEffect(()=>{setDate(dateInZone(business.timezone));},[business.timezone]);
 useEffect(()=>{
  const handler=(e:MessageEvent)=>{if(e.source===iframe.current?.contentWindow && e.data?.type==='ORBITTA_BOOK_NOW')setOpen(true);};
  window.addEventListener('message',handler);return()=>window.removeEventListener('message',handler);
 },[]);
 useEffect(()=>{
  if(!serviceId||!date){setSlots([]);return;}
  if(demo){setSlots(['10:00 AM','11:00 AM','1:30 PM','2:30 PM','4:00 PM'].map((label,i)=>({label,start:`demo-${i}`})));return;}
  const controller=new AbortController();setBusy(true);setError('');setTime('');
  fetch(`/api/public/${business.slug}/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}`,{signal:controller.signal,cache:'no-store'})
    .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to load times.');return d;})
    .then(setSlots).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>setBusy(false));
  return()=>controller.abort();
 },[business.slug,date,serviceId,demo]);
 async function submit(e:React.FormEvent){e.preventDefault();setError('');
  if(demo){setReceipt('DEMO ONLY — no appointment was saved');return;}
  setBusy(true);try{
   const response=await fetch(`/api/public/${business.slug}/reserve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...customer,serviceId,start:time,website:''})});
   const body=await response.json();if(!response.ok)throw Error(body.message||'Unable to book.');
   setReceipt(`Confirmed · ${body.when} · Ref ${String(body.reference).slice(0,8).toUpperCase()}`);
  }catch(e){setError(e instanceof Error?e.message:'Unable to reserve.');}finally{setBusy(false);}
 }
 const activate=()=>{setOpen(true);setError('');setReceipt('');};
 return <main className={`public preset-${business.theme_preset||'classic'}`} style={{'--accent':business.accent} as React.CSSProperties}>
  <div className="public-top"><span><span className="live-dot"/> ONLINE BOOKING</span><span>Thoughtful experiences, just a click away.</span></div>
  {business.customTheme? <div className="custom-theme"><iframe ref={iframe} title={`${business.name} custom website`} sandbox="allow-scripts" src={demo?`/api/admin/tenants/${business.slug}/theme/preview`:`/api/public/${business.slug}/theme`}/><button className="floating-book" onClick={activate}>Book an appointment <ArrowUpRight size={17}/></button></div>:
  <>
  <header className="site-nav"><a href="#top" className="brand"><span className="brand-mark"><Sparkles size={19}/></span><span>{business.name}<small>STUDIO & APPOINTMENTS</small></span></a><nav><a href="#about">About</a><a href="#services">Services</a><a href="#booking">Book now</a></nav><button onClick={activate} className="nav-book">Book now <ArrowUpRight size={17}/></button></header>
  <section className="hero" id="top"><div className="hero-body"><div className="eyebrow"><span className="line"/> AN EXPERIENCE MADE FOR YOU</div><h1>{business.tagline.split(' ').length>12 ? 'Your next great experience starts here.' : business.tagline}</h1><p>{business.description}</p><div className="hero-actions"><button className="button-primary" onClick={activate}>Book your time <ArrowUpRight size={19}/></button><a href="#services" className="button-ghost">Explore our services <ArrowRight size={17}/></a></div><div className="hero-fine"><span>✦ Easy online scheduling</span><span>✦ No phone calls needed</span></div></div><div className="hero-visual">{business.hero_image?<div className="hero-photo" style={{backgroundImage:`url("${business.hero_image.replace(/"/g,'')}")`}}/>:<div className="hero-abstract"><div className="circle circle-one"/><div className="circle circle-two"/><span className="hero-monogram">{business.name.charAt(0)}</span></div>}<div className="hero-stamp">YOUR TIME.<br/>YOUR MOMENT.<span>✳</span></div></div></section>
  <section id="about" className="value-row"><div><span className="tiny-label">01 / EASY TO BOOK</span><strong>Just a few clicks.</strong><p>Find your favorite service and the perfect time.</p></div><div><span className="tiny-label">02 / MADE FOR YOU</span><strong>Care in every detail.</strong><p>Thoughtful experiences, personally tailored.</p></div><div><span className="tiny-label">03 / YOUR SCHEDULE</span><strong>On your own time.</strong><p>Real-time openings. Clear, instant confirmation.</p></div></section>
  <section className="services-section" id="services"><div className="section-title"><div><span className="eyebrow">EXPLORE WHAT WE DO</span><h2>Our services<span className="serif-dot">.</span></h2></div><p>Find the right experience for you.<br/>Beautifully simple from start to finish.</p></div><div className="service-grid">{services.map((service,i)=><button className="service-card" key={service.id} onClick={()=>{setServiceId(service.id);activate();setStep(2)}}><span className="service-number">0{i+1}</span><span><strong>{service.name}</strong><small>{service.description||'Expert care designed around you.'}</small></span><span className="service-bottom"><span>{service.duration_min} MIN · {fmt(service.price_cents)}</span><ArrowUpRight size={20}/></span></button>)}</div></section>
  <section className="cta-section" id="booking"><div className="eyebrow">YOUR NEXT MOMENT IS WAITING</div><h2>Ready when<br/><em>you are.</em></h2><button className="button-primary" onClick={activate}>Make an appointment <ArrowUpRight size={20}/></button><span className="cta-orbit">✳</span></section>
  <footer className="public-footer"><span className="brand">✳ {business.name}</span><span>BOOKINGS MADE BEAUTIFUL</span><span>Powered by <a href="https://orbitta.space" target="_blank" rel="noreferrer">Orbitta</a></span></footer>
  </>}
  {demo&&<span className="demo-pill">LIVE UI DEMO · BOOKINGS NOT SAVED</span>}
  {open&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className="booking-dialog" role="dialog" aria-modal="true" aria-label="Book an appointment"><div className="dialog-header"><div><small>BOOK WITH {business.name.toUpperCase()}</small><h2>{receipt?'All set!':step===1?'Choose your service':step===2?'Pick a date & time':'Your details'}</h2></div><button className="close-dialog" aria-label="Close booking" onClick={()=>{setOpen(false);setStep(1);setReceipt('')}}>×</button></div>
  {receipt?<div className="book-success"><div className="success-icon"><Check size={26}/></div><h3>You're booked!</h3><p>{receipt}</p><button className="button-primary" onClick={()=>{setOpen(false);setStep(1);setReceipt('')}}>Done <Check size={16}/></button></div>:
  <><div className="steps"><span className={step===1?'active':''}>01 SERVICE</span><span className={step===2?'active':''}>02 TIME</span><span className={step===3?'active':''}>03 DETAILS</span></div>{error&&<div className="inline-error">{error}</div>}
  {step===1&&<div className="dialog-services">{services.map(s=><button key={s.id} onClick={()=>{setServiceId(s.id);setStep(2);setError('')}}><span><strong>{s.name}</strong><small>{s.duration_min} minutes</small></span><span>{fmt(s.price_cents)} <ArrowRight size={16}/></span></button>)}</div>}
  {step===2&&<div className="dialog-dates"><button className="back-step" onClick={()=>setStep(1)}><ArrowLeft size={15}/> Change service</button><p className="book-selected">{selected?.name} · {selected&&fmt(selected.price_cents)}</p><label>Select a date<input type="date" value={date} min={dateInZone(business.timezone)} onChange={e=>{setDate(e.target.value);setTime('')}}/></label><label>Available appointments</label><div className="time-grid">{slots.map(slot=><button key={slot.start} className={time===slot.start?'selected':''} onClick={()=>setTime(slot.start)}>{slot.label}</button>)}</div>{busy&&<p>Checking availability...</p>}{!busy&&slots.length===0&&<p className="none-found">No openings on this date. Try another.</p>}<button className="button-primary dialog-next" disabled={!time} onClick={()=>setStep(3)}>Continue <ArrowRight size={18}/></button></div>}
  {step===3&&<form className="dialog-form" onSubmit={submit}><button className="back-step" type="button" onClick={()=>setStep(2)}><ArrowLeft size={15}/> Change time</button><p className="book-selected">{selected?.name} · {slots.find(s=>s.start===time)?.label}</p><label>Your full name<input required maxLength={90} autoComplete="name" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="Alex Morgan"/></label><label>Email address<input type="email" required maxLength={200} autoComplete="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})} placeholder="alex@example.com"/></label><label>Phone number<input type="tel" required maxLength={30} autoComplete="tel" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} placeholder="(212) 555-0100"/></label><p className="privacy"><ShieldCheck size={15}/> We share these details only with the business to manage your appointment.</p><button disabled={busy} className="button-primary">{busy?'Saving...':'Confirm appointment'} <ArrowRight size={18}/></button><p className="no-payment">Payment is made at the business.</p></form>}
  </>}
  </section></div>}
 </main>;
}
