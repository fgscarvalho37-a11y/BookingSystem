'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {ArrowUpRight,Calendar,LogOut,Plus,UploadCloud,RefreshCw,ShieldCheck,Eye,Download,CheckCircle2,Trash2} from 'lucide-react';
import type {Tenant,Service,Appointment} from '@/lib/types';
async function call<T>(path:string,init:RequestInit={}):Promise<T>{
 const result=await fetch('/api/admin/'+path,{...init,cache:'no-store'});
 const body=await result.json();if(!result.ok)throw Error(body.message||'Server error');return body as T;
}
function post(body:unknown,method='POST'):RequestInit{return {method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};}
const zones=['America/New_York','America/Chicago','America/Denver','America/Phoenix','America/Los_Angeles','America/Anchorage','Pacific/Honolulu'];
const dayNames=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export default function AdminPanel({initiallySignedIn}:{initiallySignedIn:boolean}){
 const [signed,setSigned]=useState(initiallySignedIn),[password,setPassword]=useState(''),[tenants,setTenants]=useState<Tenant[]>([]),[slug,setSlug]=useState('');
 const [services,setServices]=useState<Service[]>([]),[appointments,setAppointments]=useState<Appointment[]>([]),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [creating,setCreating]=useState({name:'',slug:'',timezone:'America/New_York'});
 const [newService,setNewService]=useState({name:'',description:'',duration_min:30,price:'35'});
 const [editing,setEditing]=useState<Tenant|null>(null);
 const selected=tenants.find(t=>t.slug===slug)||null;
 const refresh=useCallback(async()=>{
  const ts=await call<Tenant[]>('tenants');setTenants(ts);setSlug(prev=>ts.find(x=>x.slug===prev)?.slug || ts[0]?.slug || '');
 },[]);
 const refreshDetails=useCallback(async(selectedSlug:string)=>{
  if(!selectedSlug)return;
  const [s,a]=await Promise.all([call<Service[]>(`tenants/${selectedSlug}/services`),call<Appointment[]>(`tenants/${selectedSlug}/appointments`)]);
  setServices(s);setAppointments(a);
 },[]);
 useEffect(()=>{if(signed)refresh().catch(e=>setError(e.message));},[signed,refresh]);
 useEffect(()=>{if(slug)refreshDetails(slug).catch(e=>setError(e.message));},[slug,refreshDetails]);
 useEffect(()=>{if(selected)setEditing({...selected});},[selected]);
 async function perform(fn:()=>Promise<void>,success='Saved successfully.'){setError('');setMessage('');setBusy(true);try{await fn();setMessage(success);}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false)}}
 async function login(e:FormEvent){e.preventDefault();await perform(async()=>{await call('login',post({password}));setSigned(true);setPassword('');});}
 async function createTenant(e:FormEvent){e.preventDefault();await perform(async()=>{const t=await call<Tenant>('tenants',post(creating));await refresh();setSlug(t.slug);setCreating({name:'',slug:'',timezone:'America/New_York'});});}
 async function saveTenant(e:FormEvent){e.preventDefault();if(!editing)return;await perform(async()=>{await call(`tenants/${slug}`,post(editing,'PATCH'));await refresh();});}
 async function addService(e:FormEvent){e.preventDefault();await perform(async()=>{await call(`tenants/${slug}/services`,post({...newService,price_cents:Math.round(Number(newService.price)*100)}));await refreshDetails(slug);setNewService({name:'',description:'',duration_min:30,price:'35'});});}
 async function uploadTheme(e:FormEvent<HTMLFormElement>){e.preventDefault();const input=e.currentTarget.elements.namedItem('zip') as HTMLInputElement;const file=input.files?.[0];if(!file)return;
  const target=slug;await perform(async()=>{const form=new FormData();form.set('file',file);await call(`tenants/${target}/theme`,{method:'POST',body:form});await refresh();input.value='';},'ZIP importado como rascunho. Confira a prévia e publique quando estiver pronto.');
 }
 async function publishTheme(){const target=slug;await perform(async()=>{await call(`tenants/${target}/theme`,{method:'PUT'});await refresh();},'ZIP publicado apenas para esta empresa.');}
 async function discardDraft(){const target=slug;await perform(async()=>{await call(`tenants/${target}/theme?draft=true`,{method:'DELETE'});await refresh();},'Rascunho descartado. O site publicado não foi alterado.');}
 async function removeTheme(){const target=slug;if(!window.confirm('Restaurar o layout padrão de '+(selected?.name||target)+'?'))return;
  await perform(async()=>{await call(`tenants/${target}/theme`,{method:'DELETE'});await refresh();},'O layout padrão voltou para esta empresa.');}
 async function status(id:string,next:string){await perform(async()=>{await call(`tenants/${slug}/appointments`,post({id,status:next},'PATCH'));await refreshDetails(slug);});}
 if(!signed)return <main className="admin"><header><span className="brand">✳ ORBITTA BOOKING</span><span className="admin-badge">SECURE CONTROL</span></header><div style={{maxWidth:440,margin:'10vh auto'}} className="admin-card"><ShieldCheck color="#cfae77"/><h1>Welcome back.</h1><p>Sign in to manage your booking websites, ZIP designs, and appointments.</p>{error&&<div className="error">{error}</div>}<form onSubmit={login}><label>Administrator password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy}>Sign in</button></form></div></main>;
 return <main className="admin"><header><span className="brand">✳ ORBITTA BOOKING <small>INDEPENDENT SAAS</small></span><div className="row"><span className="admin-badge">ADMIN CONSOLE</span><button className="subtle" onClick={()=>perform(async()=>{await refresh();if(slug)await refreshDetails(slug);})}><RefreshCw size={14}/> Refresh</button><button className="subtle" onClick={()=>perform(async()=>{await call('logout',{method:'POST'});setSigned(false);})}><LogOut size={14}/> Logout</button></div></header><h1>Business management<span style={{color:'#caa67a'}}>.</span></h1><p>Import a different customized ZIP for each client. Orbitta handles subscriptions only.</p>{error&&<div className="error">{error}</div>}{message&&<div className="ok">{message}</div>}
 <div className="admin-layout"><aside><section className="admin-card"><h2>Businesses</h2><div className="admin-list">{tenants.map(t=><button key={t.slug} className={slug===t.slug?'selected':''} onClick={()=>setSlug(t.slug)}>{t.name}<small>/{t.slug} · {t.published?'Published':'Draft'} {t.theme_html?'· ZIP':''}</small></button>)}{tenants.length===0&&<p className="muted">Create your first business to start.</p>}</div></section><section className="admin-card section"><h2><Plus size={15}/> Add a business</h2><form onSubmit={createTenant}><label>Business name<input required value={creating.name} onChange={e=>setCreating({...creating,name:e.target.value})} placeholder="North Studio"/></label><label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={creating.slug} onChange={e=>setCreating({...creating,slug:e.target.value.toLowerCase()})} placeholder="north-studio"/></label><label>US time zone<select value={creating.timezone} onChange={e=>setCreating({...creating,timezone:e.target.value})}>{zones.map(z=><option key={z}>{z}</option>)}</select></label><button disabled={busy}>Create business</button></form></section></aside>
 <div>{editing&&<>
 <section className="admin-card zip-manager">
  <div className="row" style={{justifyContent:'space-between'}}>
   <div><h2><UploadCloud size={19}/> Site personalizado por ZIP</h2>
    <p className="muted">Empresa selecionada: <strong>{editing.name}</strong> · /s/{slug}</p></div>
   <a href={`/admin/preview/${slug}`} target="_blank" rel="noreferrer"><Eye size={16}/> Ver prévia privada</a>
  </div>
  <p className="muted">Importe um ZIP feito exclusivamente para esta empresa. O código, as imagens e o layout são independentes dos ZIPs dos outros clientes. Agendamentos e serviços ficam preservados no sistema.</p>
  <div className="zip-status"><span><strong>Site publicado</strong><small>{editing.theme_zip_name||'Layout padrão (nenhum ZIP publicado)'}</small></span><span><strong>Rascunho</strong><small>{editing.theme_draft_zip_name||'Nenhum ZIP aguardando publicação'}</small></span></div>
  <form onSubmit={uploadTheme}>
    <label>Escolher ZIP de {editing.name} (até 4 MB)
      <input type="file" name="zip" accept=".zip,application/zip" required/>
    </label>
    <button disabled={busy} type="submit"><UploadCloud size={15}/> Importar ZIP para prévia</button>
  </form>
  {editing.theme_draft_html!=null&&<div className="row zip-actions">
    <a href={`/admin/preview/${slug}`} target="_blank" rel="noreferrer"><Eye size={14}/> Conferir rascunho</a>
    <button type="button" disabled={busy} onClick={publishTheme}><CheckCircle2 size={15}/> Publicar este ZIP</button>
    <button type="button" disabled={busy} className="subtle" onClick={discardDraft}><Trash2 size={14}/> Descartar rascunho</button>
  </div>}
  {editing.theme_html!=null&&<button type="button" className="subtle zip-reset" disabled={busy} onClick={removeTheme}>Voltar ao layout padrão para esta empresa</button>}
  <p className="muted">O ZIP deve conter <code>index.html</code>, arquivos CSS, JS e imagens locais (inclusive em pastas). Para abrir o agendamento real no seu design, use <code>window.OrbittaBooking.open()</code> no botão de reservas. Não publique segredos no ZIP.</p>
 </section>
 
 <section className="admin-card section"><div className="row" style={{justifyContent:'space-between'}}><h2>Horários, identidade e contrato</h2><div className="row"><a target="_blank" rel="noreferrer" href={`/admin/preview/${slug}`}><Eye size={15}/> Preview ZIP / Site</a><a target="_blank" rel="noreferrer" href={`/s/${slug}`}>Public website <ArrowUpRight size={15}/></a></div></div><form onSubmit={saveTenant}>
 <div className="admin-grid"><label>Display name<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label>Brand color<input type="color" value={editing.accent} onChange={e=>setEditing({...editing,accent:e.target.value})}/></label><label>Headline<input maxLength={220} value={editing.tagline} onChange={e=>setEditing({...editing,tagline:e.target.value})}/></label><label>Hero image HTTPS URL (optional)<input type="url" value={editing.hero_image} onChange={e=>setEditing({...editing,hero_image:e.target.value})}/></label><label>Opening time<input type="time" value={editing.opens_at.slice(0,5)} onChange={e=>setEditing({...editing,opens_at:e.target.value})}/></label><label>Closing time<input type="time" value={editing.closes_at.slice(0,5)} onChange={e=>setEditing({...editing,closes_at:e.target.value})}/></label><label>Time zone<select value={editing.timezone} onChange={e=>setEditing({...editing,timezone:e.target.value})}>{zones.map(z=><option key={z}>{z}</option>)}</select></label><label>Orbitta ClientProduct ID<input type="number" placeholder="Paid contract ID" value={editing.orbitta_product_id??''} onChange={e=>setEditing({...editing,orbitta_product_id:e.target.value?Number(e.target.value):null})}/></label></div><label>Business description<textarea rows={3} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><div className="section"><h3>Open days</h3><div className="row">{dayNames.map((name,i)=><label key={name}><input type="checkbox" checked={editing.weekdays.includes(i+1)} onChange={e=>setEditing({...editing,weekdays:e.target.checked?[...editing.weekdays,i+1]:editing.weekdays.filter(x=>x!==i+1)})}/>{name}</label>)}</div></div><div className="admin-grid"><label>Temporary preview access until (max 14 days, no Orbitta contract)<input type="datetime-local" value={editing.trial_until?new Date(editing.trial_until).toISOString().slice(0,16):''} onChange={e=>setEditing({...editing,trial_until:e.target.value?new Date(e.target.value).toISOString():null})}/></label><label><input type="checkbox" checked={editing.published} onChange={e=>setEditing({...editing,published:e.target.checked})}/>Publish website</label></div><p className="muted">Public access requires either a current test expiration date OR an active paid Orbitta contract. Manual suspension in Orbitta overrides paid access.</p><button disabled={busy}>Save website settings</button></form></section>

 <section className="admin-card section"><h2>Services</h2><div className="admin-list">{services.map(s=><div key={s.id} className="row" style={{justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #40504b'}}><span>{s.name} <small>· {s.duration_min} min</small></span><strong>${(s.price_cents/100).toFixed(2)}</strong></div>)}</div><form onSubmit={addService}><div className="admin-grid"><label>Service name<input required value={newService.name} onChange={e=>setNewService({...newService,name:e.target.value})} placeholder="Signature Cut"/></label><label>Price (USD)<input type="number" min="0" step="0.01" value={newService.price} onChange={e=>setNewService({...newService,price:e.target.value})}/></label><label>Duration (minutes)<input type="number" min="15" max="480" step="15" value={newService.duration_min} onChange={e=>setNewService({...newService,duration_min:Number(e.target.value)})}/></label><label>Description<input maxLength={300} value={newService.description} onChange={e=>setNewService({...newService,description:e.target.value})}/></label></div><button disabled={busy} style={{marginTop:10}}><Plus size={14}/> Add service</button></form></section>
 <section className="admin-card section"><div className="row" style={{justifyContent:'space-between'}}><h2><Calendar size={16}/> Recent appointments</h2><button className="subtle" onClick={()=>refreshDetails(slug)}>Refresh</button></div>{appointments.length===0?<p className="muted">No appointments yet.</p>:<div style={{overflowX:'auto'}}><table><thead><tr><th>When</th><th>Customer</th><th>Service</th><th>Status</th><th>Actions</th></tr></thead><tbody>{appointments.map(a=><tr key={a.id}><td>{new Date(a.start_at).toLocaleString('en-US',{timeZone:editing.timezone,dateStyle:'medium',timeStyle:'short'})}</td><td>{a.customer_name}<small style={{display:'block'}}>{a.customer_email}</small><small>{a.customer_phone}</small></td><td>{a.name}</td><td>{a.status}</td><td>{a.status==='CONFIRMED'&&<span className="row"><button onClick={()=>status(a.id,'COMPLETED')} disabled={busy}>Done</button><button className="danger" onClick={()=>status(a.id,'CANCELLED')} disabled={busy}>Cancel</button></span>}</td></tr>)}</tbody></table></div>}</section>
 </>}</div></div></main>;
}
