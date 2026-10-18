'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Clock3, Dumbbell, Heart, ImagePlus, Minus, Pause, Pencil, Play, Plus, Trash2, RotateCcw, Search, Share2, Settings2, ShieldCheck, Sparkles, TrendingUp, X } from 'lucide-react';
import Link from 'next/link';
import Brand, { BrandMark } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-provider';
import { useAuth } from '@/components/auth-provider';
import { useTrainingStore } from '@/lib/use-training-store';
import '@/components/auth.css';
import BodyMap from '@/components/body-map';
import BodyProgress, { type BodyView } from '@/components/body-progress';
import TrainingShare from '@/components/training-share';
import ProgressChart from '@/components/progress-chart';
import ProgressEquipmentPicker from '@/components/progress-equipment-picker';
import { allMuscles, exercises, totalSets, volume, type EquipmentType, type Exercise, type Muscle, type LoggedSet, type Session } from '@/lib/training';
import { categories, category, defaultPhoto, equipmentFor, formatDate, formatNumber, formatTime, getDraft, isRear, lastSet, muscleCount, type Category, type CustomMachine } from '@/lib/machine-training';
import { trainingSessions, recordTrainingSet, finishTrainingSession, resumeTrainingSession, updateTrainingSession, correctTrainingSet, deleteTrainingSession } from '@/lib/training-sessions';
import { loadPhotos, readPhoto, storePhoto } from '@/lib/photos';

type Tab = 'Train' | 'Body' | 'Progress' | 'History';
type Modal = 'settings' | 'machine' | 'add' | 'finish' | 'login' | 'share' | 'edit-set' | 'delete-set' | 'delete-session' | null;
const tabs = [{name:'Train' as Tab,icon:Dumbbell},{name:'Body' as Tab,icon:Activity},{name:'Progress' as Tab,icon:TrendingUp},{name:'History' as Tab,icon:Clock3}];
function countLabel(count:number,noun:string){return `${count} ${noun}${count===1?'':'s'}`;}


export default function Home() {
  const auth = useAuth();
  if(auth.loading) return <main className="store-loading" role="status">Opening your training space...</main>;
  return <TrainingApp key={auth.user?.id ?? 'guest'} userId={auth.user?.id ?? null}/>;
}

function TrainingApp({userId}:{userId:string|null}) {
  const {data,setData,loaded,canSave,pending:savePending,status:syncStatus,message:syncMessage,retrySync} = useTrainingStore(userId);
  const auth = useAuth();
  const [now,setNow] = useState(0);
  const [tab,updateTab] = useState<Tab>('Train');
  const [bodyView,updateBodyView] = useState<BodyView>('progress');
  // A remembered exercise is a resume option, not the app's opening screen.
  const [browsingMachines,setBrowsingMachines] = useState(true);
  const [navigationReady,setNavigationReady] = useState(false);
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get('tab');
      updateTab(tabs.find(t => t.name.toLowerCase() === requested)?.name ?? 'Train');
      updateBodyView(params.get('view') === 'condition' ? 'condition' : 'progress');
      const exercise = params.get('exercise');
      if(exercise) setChartId(exercise);
      if(!exercise) setChartId('');
      setNavigationReady(true);
    };
    restore();
    window.addEventListener('popstate',restore);
    return () => window.removeEventListener('popstate',restore);
  },[]);
  function setTab(next:Tab, exerciseId?:string) {
    updateTab(next);
    const url = new URL(window.location.href);
    if(next === 'Train') url.searchParams.delete('tab');
    else url.searchParams.set('tab',next.toLowerCase());
    if(next === 'Body' && bodyView === 'condition') url.searchParams.set('view','condition');
    else url.searchParams.delete('view');
    if(next === 'Progress') url.searchParams.set('exercise',exerciseId ?? chartMachine.id);
    else url.searchParams.delete('exercise');
    if(url.href !== window.location.href) window.history.pushState(null,'',url);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function changeBodyView(view:BodyView) {
    updateBodyView(view);
    const url = new URL(window.location.href);
    if(view === 'condition') url.searchParams.set('view','condition');
    else url.searchParams.delete('view');
    if(url.href !== window.location.href) window.history.pushState(null,'',url);
  }
  const [filter,setFilter] = useState<Category>('All machines');
  const [equipmentType,setEquipmentType] = useState<EquipmentType | 'All equipment'>('All equipment');
  const [favoritesOnly,setFavoritesOnly] = useState(false);
  const [search,setSearch] = useState('');
  const [photos,setPhotos] = useState<Record<string,string>>({});
  const [uploading,setUploading] = useState(false);
  const [logging,setLogging] = useState(false);
  const [finishing,setFinishing] = useState(false);
  const [toast,setToast] = useState('');
  const [modal,setModal] = useState<Modal>(null);
  const [back,setBack] = useState(false);
  const [muscle,setMuscle] = useState<Muscle>('Upper chest');
  const [chartId,setChartId] = useState('');
  const [days,setDays] = useState(30);
  const [setupDraft,setSetupDraft] = useState('');
  const [labelDraft,setLabelDraft] = useState('');
  const [restDraft,setRestDraft] = useState(120);
  const [primaryDraft,setPrimaryDraft] = useState<Muscle[]>([]);
  const [secondaryDraft,setSecondaryDraft] = useState<Muscle[]>([]);
  const [muscleError,setMuscleError] = useState('');
  const [customName,setCustomName] = useState('');
  const [customBase,setCustomBase] = useState('incline');
  const [customLabel,setCustomLabel] = useState('');
  const [formError,setFormError] = useState('');
  const [draftError,setDraftError] = useState('');
  const [lastUndone,setLastUndone] = useState<{sessionId:string;exerciseId:string;set:{weight:number;reps:number;done:boolean}}|null>(null);
  const [correction,setCorrection] = useState<{sessionId:string;exerciseId:string;index:number;original:LoggedSet[];weight:string;reps:string}|null>(null);
  const [deletingSession,setDeletingSession] = useState<Session|null>(null);
  const [correcting,setCorrecting] = useState(false);
  const [correctionError,setCorrectionError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveLock = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    loadPhotos(userId ?? '').then(setPhotos).catch(() => setToast('Photo storage is unavailable in this browser. Default photos are still available.'));
  },[userId]);
  useEffect(() => {
    if (!loaded) return;
    const chosen = equipmentFor(data).find(e => e.id === data.selectedId);
    if(chosen){setMuscle(chosen.muscles[0]);setBack(isRear(chosen.muscles[0]));}
  },[loaded,data.selectedId]);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const tick = setInterval(refresh,1000);
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('focus',refresh);
    return () => {clearInterval(tick);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};
  },[]);
  useEffect(() => { if(modal==='finish'&&!data.current&&syncStatus==='synced'){setModal(null);setTab('History');} },[modal,data.current,syncStatus]);
  useEffect(() => { if(toast){const timeout = setTimeout(() => setToast(''),5000);return () => clearTimeout(timeout);} },[toast]);
  useEffect(() => { if(modal) dialogRef.current?.showModal(); else dialogRef.current?.close(); },[modal]);
  useEffect(() => {
    if(data.rest && !data.rest.complete && data.rest.endAt !== null && now > 0 && now >= data.rest.endAt) {
      setData(s => ({...s,rest:s.rest ? {...s.rest,complete:true,endAt:null,paused:null} : null}));
      setToast('Rest complete. Your next set is ready.');
      if('vibrate' in navigator) navigator.vibrate([100,50,100]);
    }
  },[data.rest,now]);

  const equipment = equipmentFor(data);
  const lastMachine = equipment.find(e => e.id === data.selectedId) ?? equipment.find(e => e.id === data.rest?.exerciseId) ?? equipment.find(e => e.id === Object.keys(data.current?.sets ?? {}).at(-1));
  const selected = browsingMachines ? undefined : equipment.find(e => e.id === data.selectedId);
  const restMachine = equipment.find(e => e.id === data.rest?.exerciseId);
  const recentActivity = new Map<string, number>();
  for (const session of [...data.history, ...(data.current ? [data.current] : [])]) {
    for (const [id, sets] of Object.entries(session.sets)) {
      const completed = sets.filter(set => set.done);
      if (completed.length) recentActivity.set(id, Math.max(recentActivity.get(id) ?? 0, ...completed.map(set => set.loggedAt ?? session.started)));
    }
  }
  const recentEquipment = [...equipment].sort((a,b) => (recentActivity.get(b.id) ?? 0) - (recentActivity.get(a.id) ?? 0));
  const chartMachine = equipment.find(e => e.id === chartId) ?? recentEquipment[0];
  const historySessions = trainingSessions(data);
  const saveLabel = !savePending ? 'Saved to database' : syncStatus === 'syncing' ? 'Saving to database...' : 'Not saved yet';
  const sessionSets = data.current ? totalSets(data.current) : 0;
  const selectedSets = selected ? data.current?.sets[selected.id]?.filter(s => s.done) ?? [] : [];
  const resting = !!selected && !!data.rest && data.rest.exerciseId === selected.id && !data.rest.complete;
  const remaining = data.rest?.paused ?? (data.rest?.endAt ? Math.max(0,Math.ceil((data.rest.endAt-now)/1000)) : 0);
  const ready = !!selected && data.rest?.exerciseId === selected.id && data.rest.complete;
  const draft = selected ? getDraft(data,selected) : {weight:'',reps:'10'};
  const demo = data.history.some(s => s.demo);
  const weekMuscles = allMuscles.filter(m => muscleCount(data,m,now) > 0);
  const visible = equipment.filter(e => (filter === 'All machines' || category(e) === filter) && (equipmentType === 'All equipment' || (e.equipmentType ?? 'Machines') === equipmentType) && (!favoritesOnly || data.favorites.includes(e.id)) && `${e.name} ${data.labels[e.id] ?? ''} ${e.muscles.join(' ')}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => Number(data.favorites.includes(b.id)) - Number(data.favorites.includes(a.id)) || (recentActivity.get(b.id) ?? 0) - (recentActivity.get(a.id) ?? 0));
  const machineLabel = (e:Exercise) => data.labels[e.id] || `${e.equipmentType ?? 'Machines'} \u00b7 ${category(e)}`;
  const photo = (e:Exercise) => photos[e.id] || defaultPhoto(e);
  const showMachines = () => {setBrowsingMachines(true);setTab('Train');setDraftError('');setLastUndone(null);window.scrollTo({top:0,behavior:'smooth'});};

  function selectMachine(e:Exercise) {
    setBrowsingMachines(false);
    setData(s => ({...s,selectedId:e.id,drafts:{...s.drafts,[e.id]:getDraft(s,e)}}));
    setMuscle(e.muscles[0]); setBack(isRear(e.muscles[0])); setTab('Train');setDraftError('');setLastUndone(null);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function viewProgress(e:Exercise) {
    setChartId(e.id);setTab('Progress',e.id);window.scrollTo({top:0,behavior:'smooth'});
  }
  function selectProgressExercise(e:Exercise) {
    setChartId(e.id);
    const url = new URL(window.location.href);
    url.searchParams.set('exercise',e.id);
    if(url.href !== window.location.href) window.history.pushState(null,'',url);
  }
  function editDraft(field:'weight'|'reps',value:string) {
    if(!selected)return;
    setDraftError('');setData(s => ({...s,drafts:{...s.drafts,[selected.id]:{...getDraft(s,selected),[field]:value}}}));
  }
  function stepDraft(field:'weight'|'reps',delta:number) {
    const value = Number(draft[field]) || 0;
    editDraft(field,String(Math.min(field === 'weight' ? 1500 : 500,Math.max(field === 'weight' ? 0 : 1,value+delta))));
  }
  function requireAccount() {
    if(userId) return true;
    setModal('login');
    return false;
  }
  async function logSet(event:FormEvent) {
    event.preventDefault();
    if(!requireAccount() || !selected || resting || !canSave || saveLock.current)return;
    const weight = Number(draft.weight),reps = Number(draft.reps);
    if(draft.weight.trim()==='' || !Number.isFinite(weight) || weight<0 || weight>1500 || !Number.isInteger(reps) || reps<1 || reps>500) {setDraftError('Enter a weight from 0–1,500 kg and a whole rep count from 1–500.');return;}
    saveLock.current=true;setLogging(true);
    const timestamp=Date.now(),duration=data.restPreferences[selected.id] ?? selected.rest;
    const session:Session = data.current ?? {id:crypto.randomUUID(),routine:'Free training',started:timestamp,sets:{}};
    const loggedSet = {weight,reps,done:true,loggedAt:timestamp};
    const saved = await setData(s => recordTrainingSet(s,session,selected.id,loggedSet,{exerciseId:selected.id,endAt:timestamp+duration*1000,paused:null,duration,complete:false}));
    setNow(timestamp);setLastUndone(null);saveLock.current=false;setLogging(false);
    if(!saved)setToast('Set not saved to the database yet. Keep this page open and reconnect.');
  }

  function endRest(){setData(s => ({...s,rest:s.rest ? {...s.rest,endAt:null,paused:null,complete:true} : null}));}
  function adjustRest(delta:number){setData(s => {if(!s.rest || s.rest.complete)return s;return {...s,rest:s.rest.paused!==null ? {...s.rest,paused:Math.max(1,s.rest.paused+delta)} : {...s.rest,endAt:Math.max(Date.now()+1000,(s.rest.endAt??Date.now())+delta*1000)}};});}
  function pauseRest(){setData(s => {if(!s.rest)return s;return {...s,rest:s.rest.paused!==null ? {...s.rest,endAt:Date.now()+s.rest.paused*1000,paused:null} : {...s.rest,endAt:null,paused:remaining}};});}
  async function finishSession(){
    if(!data.current || !canSave || finishing || savePending)return;
    const id=data.current.id,finished=Date.now();
    setFinishing(true);
    const saved=await setData(s=>finishTrainingSession(s,id,finished));
    setFinishing(false);
    if(saved){setModal(null);setTab('History');setToast('Session finished. All sets are saved to your account.');}
    else setToast('Session could not be finished yet. Keep this page open and reconnect.');
  }
  async function resumeSession(session:Session){
    if(!canSave)return;
    const saved=await setData(s=>resumeTrainingSession(s,session.id));
    if(saved){const id=Object.keys(session.sets).at(-1);const exercise=equipment.find(e=>e.id===id);if(exercise)selectMachine(exercise);else showMachines();}
  }

  function undoSet(){
    if(!selected||!data.current||!selectedSets.length||!canSave||savePending)return;
    const previous=selectedSets.at(-1)!,sessionId=data.current.id,exerciseId=selected.id;
    setLastUndone({sessionId,exerciseId,set:previous});
    setData(s=>{
      const updated=updateTrainingSession(s,sessionId,session=>{
        const sets=[...(session.sets[exerciseId]??[])];
        const index=sets.findLastIndex(set=>set.done&&set.loggedAt===previous.loggedAt&&set.weight===previous.weight&&set.reps===previous.reps);
        if(index>=0)sets.splice(index,1);
        return {...session,sets:{...session.sets,[exerciseId]:sets}};
      });
      return {...updated,rest:s.current?.id===sessionId&&s.rest?.exerciseId===exerciseId?null:s.rest};
    });
    setToast('Last set removed. You can restore it below.');
  }
  function restoreSet(){
    if(!lastUndone||!canSave||savePending)return;
    const {sessionId,exerciseId,set}=lastUndone;
    setData(s=>updateTrainingSession(s,sessionId,session=>({...session,sets:{...session.sets,[exerciseId]:[...(session.sets[exerciseId]??[]),set]}})));
    setLastUndone(null);setToast('Set restored.');
  }

  function openSetEditor(session:Session,exerciseId:string,index:number) {
    const original=session.sets[exerciseId];
    setCorrection({sessionId:session.id,exerciseId,index,original,weight:String(original[index].weight),reps:String(original[index].reps)});
    setCorrectionError('');setModal('edit-set');
  }
  async function saveCorrection(remove=false) {
    if(!correction || !canSave || savePending || correcting)return;
    const weight=Number(correction.weight),reps=Number(correction.reps);
    if(!remove && (!correction.weight.trim() || !correction.reps.trim() || !Number.isFinite(weight) || weight<0 || weight>1500 || !Number.isInteger(reps) || reps<1 || reps>500)) {
      setCorrectionError('Enter a weight from 0 to 1,500 kg and a whole rep count from 1 to 500.');return;
    }
    setCorrecting(true);setCorrectionError('');
    let applied=false;
    const saved=await setData(s=>{
      const next=correctTrainingSet(s,correction.sessionId,correction.exerciseId,correction.index,correction.original,remove?null:{weight,reps});
      applied=next!==s;return next;
    });
    setCorrecting(false);setLastUndone(null);
    if(!saved){setModal(null);setToast('Correction not saved yet. Keep this page open and reconnect; saving will retry.');}
    else if(!applied)setCorrectionError('This exercise log changed on another device. Close this dialog and reopen the set to try again.');
    else {setModal(null);setToast(remove?'Set deleted.':'Set updated.');}
  }
  async function deleteSession() {
    if(!deletingSession || !canSave || savePending || correcting)return;
    setCorrecting(true);
    const saved=await setData(s=>deleteTrainingSession(s,deletingSession.id));
    setCorrecting(false);setLastUndone(null);setModal(null);
    setToast(saved?'Session deleted.':'Deletion not saved yet. Keep this page open and reconnect; saving will retry.');
  }
  function setEditButton(session:Session,exerciseId:string,index:number) {
    return <button className="quiet-button set-edit-button" disabled={!canSave || savePending} onClick={()=>openSetEditor(session,exerciseId,index)} aria-label={`Edit set ${index+1} for ${equipment.find(e=>e.id===exerciseId)?.name??exerciseId}`}><Pencil size={15}/>Edit</button>;
  }

  function exportData(){if(!requireAccount())return;const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='liftide-training.json';link.click();URL.revokeObjectURL(url);setToast('Training data exported. Photos stay on this device.');}
  function openMachineSettings(){if(!requireAccount()||!selected)return;setSetupDraft(data.setups[selected.id]??selected.setup);setLabelDraft(data.labels[selected.id]??'');setRestDraft(data.restPreferences[selected.id]??selected.rest);setPrimaryDraft([...selected.muscles]);setSecondaryDraft([...selected.secondary]);setMuscleError('');setModal('machine');}
  async function saveMachineSettings(event:FormEvent) {
    event.preventDefault();if(!requireAccount()||!selected||!canSave||savePending)return;
    if(!primaryDraft.length){setMuscleError('Choose at least one primary muscle.');return;}
    const saved=await setData(s=>({...s,setups:{...s.setups,[selected.id]:setupDraft.trim()||selected.setup},labels:{...s.labels,[selected.id]:labelDraft.trim()},restPreferences:{...s.restPreferences,[selected.id]:restDraft},muscleTargets:{...s.muscleTargets,[selected.id]:{muscles:primaryDraft,secondary:secondaryDraft.filter(m=>!primaryDraft.includes(m))}}}));
    if(!saved){setMuscleError('These changes are not saved yet. Reconnect and retry.');return;}
    setMuscle(primaryDraft[0]);setBack(isRear(primaryDraft[0]));setModal(null);setToast('Machine setup and muscle targets saved.');
  }
  function togglePrimary(m:Muscle){setPrimaryDraft(s=>s.includes(m)?s.filter(x=>x!==m):[...s,m]);setSecondaryDraft(s=>s.filter(x=>x!==m));setMuscleError('');}
  function toggleSecondary(m:Muscle){setSecondaryDraft(s=>s.includes(m)?s.filter(x=>x!==m):[...s,m]);}
  async function addMachine(event:FormEvent){event.preventDefault();if(!requireAccount()||!canSave||savePending)return;if(!customName.trim()){setFormError('Give your machine a name.');return;}const base=exercises.find(e=>e.id===customBase)!;const machine:CustomMachine={...base,id:`machine-${crypto.randomUUID()}`,name:customName.trim(),machine:customLabel.trim()||'Your machine',photoId:base.id};const saved=await setData(s=>({...s,customMachines:[...s.customMachines,machine],labels:{...s.labels,[machine.id]:customLabel.trim()},selectedId:machine.id,drafts:{...s.drafts,[machine.id]:{weight:String(base.weight),reps:String(base.reps)}}}));if(!saved){setFormError('This equipment is not saved yet. Reconnect and retry.');return;}setMuscle(base.muscles[0]);setBack(isRear(base.muscles[0]));setBrowsingMachines(false);setModal(null);setTab('Train');setCustomName('');setCustomLabel('');setFormError('');setToast('Machine added. You can replace its photo with your own.');}
  async function uploadPhoto(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(!requireAccount()||!file||!selected)return;const id=selected.id;setUploading(true);try{const image=await readPhoto(file);await storePhoto(id,image,userId ?? '');setPhotos(s=>({...s,[id]:image}));setToast('Your machine photo is saved.');}catch(error){setToast(error instanceof Error?error.message:'Could not save this photo.');}finally{setUploading(false);event.target.value='';}}
  async function resetPhoto(){if(!requireAccount()||!selected)return;try{await storePhoto(selected.id,null,userId ?? '');setPhotos(s=>{const next={...s};delete next[selected.id];return next;});setToast('Default photo restored.');}catch{setToast('Could not restore the default photo.');}}

  function miniBody(e:Exercise){return <section className="card machine-body"><div className="card-heading"><h3>What this trains</h3><button className="quiet-button" onClick={()=>setBack(!back)}><RotateCcw size={16}/>Rotate</button></div><div className="compact-body"><BodyMap back={back} active={[...e.muscles,...e.secondary]} worked={[]} selected={muscle} onSelect={setMuscle}/></div><strong className="body-selection">{muscle}</strong><div className="muscle-tags">{e.muscles.map(m=><span key={m}>{m}</span>)}</div><p className="secondary-muscles">{e.secondary.length?`Also works ${e.secondary.join(' and ').toLowerCase()}.`:'The highlighted area is the primary target.'}</p></section>;}

  if(!loaded || !navigationReady) return <main className="store-loading" role="status"><BrandMark/><span>Opening your saved training...</span></main>;

  return <div className="app-shell" data-update-blocked={!loaded || savePending || logging || finishing || uploading || !!selected || sessionSets > 0 || !!modal}><a className="skip-link" href="#training-content">Skip to training</a>
    <aside className="sidebar"><Brand className="brand"/><nav aria-label="Main navigation">{tabs.map(({name,icon:Icon})=><button key={name} data-nav={name} className={`nav-item ${tab===name?'active':''}`} onClick={()=>{if(name==='Progress'){setChartId('');}name==='Train'?showMachines():setTab(name,name==='Progress'?recentEquipment[0].id:undefined);}} aria-current={tab===name?'page':undefined}><Icon size={22}/><span>{name}</span>{tab===name&&<i/>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item" onClick={()=>setModal('settings')}><Settings2 size={21}/><span>Settings</span></button></div></aside>
    <main><header className="topbar"><Brand className="mobile-brand" compact/><div>{sessionSets>0&&<button className="session-status" onClick={()=>setModal('finish')}><i/>{data.current?.routine.trim()&&data.current.routine!=='Free training'?<><span className="session-name">{data.current.routine.trim()}</span><span>{sessionSets} {sessionSets===1?'set':'sets'}</span></>:<>{sessionSets} {sessionSets===1?'set':'sets'} · Finish</>}<ChevronRight size={16}/></button>}<Link className="account-link" href={userId?'/account':'/login'}>{userId?'Account':'Log in'}</Link><button className="header-settings" aria-label="Settings" onClick={()=>setModal('settings')}><Settings2 size={21}/></button></div></header>
      <div className="main-content" id="training-content" tabIndex={-1}>
        <div className={`training-save-status ${userId&&!canSave?'save-error':''}`} role="status"><ShieldCheck size={15}/><span>{!userId?'Preview mode - log in to save':syncStatus==='synced'?'Saved to your account':syncStatus==='syncing'?'Saving to database...':syncStatus==='loading'?'Loading your account...':savePending?'Not saved - connection required':'Connection unavailable'}</span>{userId?<button onClick={()=>setModal('settings')}>Details<ChevronRight size={14}/></button>:<Link href="/login">Log in<ChevronRight size={14}/></Link>}</div>
        {syncMessage&&<div className="sync-notice" role="alert"><div><strong>{savePending?'Changes are not saved yet':'Connection required'}</strong><p>{syncMessage}</p></div><button className="secondary-button" onClick={retrySync}>Retry connection</button></div>}
        {tab==='Train'&&!selected&&<>
          {lastMachine&&<section className="continue-machine" aria-labelledby="continue-machine-heading"><button onClick={()=>selectMachine(lastMachine)} aria-label={`Continue logging ${lastMachine.name}`}><img src={photo(lastMachine)} alt=""/><span className="continue-machine-copy"><span className="eyebrow" id="continue-machine-heading">CONTINUE TRAINING</span><strong>{lastMachine.name}</strong><span>{lastSet(data,lastMachine.id)?`Last set: ${formatNumber(lastSet(data,lastMachine.id)!.weight)} kg × ${lastSet(data,lastMachine.id)!.reps} reps`:'Your weight and reps are ready.'}</span><span className="continue-machine-action">Continue training<ArrowRight size={17}/></span></span><ChevronRight size={22}/></button></section>}
          {sessionSets>0&&<section className="active-session"><div><span className="eyebrow">YOUR SESSION</span><strong>{sessionSets} {sessionSets===1?'set':'sets'} {savePending?'awaiting database confirmation':'saved to account'}</strong></div><button className="secondary-button" onClick={()=>setModal('finish')}>Review & finish<Check size={17}/></button></section>}
          <div className="section-heading" id="equipment-library"><div><h1>Equipment</h1><p className="library-description">Favorites and recent exercises first.</p></div><button className="secondary-button" onClick={()=>{if(!requireAccount())return;setFormError('');setModal('add');}}><Plus size={18}/>Add machine</button></div>
          <div className="machine-toolbar"><label className="search-field"><Search size={21}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find equipment or a muscle…" aria-label="Search equipment"/>{search&&<button aria-label="Clear search" onClick={()=>setSearch('')}><X size={18}/></button>}</label><button className={`favorites-filter ${favoritesOnly?'selected':''}`} onClick={()=>setFavoritesOnly(!favoritesOnly)} aria-pressed={favoritesOnly}><Heart size={18} fill={favoritesOnly?'currentColor':'none'}/>Favorites</button></div>
          <div className="library-controls"><label className="equipment-type-label" htmlFor="equipment-type">Equipment type<select id="equipment-type" value={equipmentType} onChange={e=>setEquipmentType(e.target.value as EquipmentType | 'All equipment')}>{(['All equipment','Machines','Free weights','Bodyweight'] as const).map(t=><option key={t}>{t}</option>)}</select></label><span className="library-count" role="status">{visible.length} of {equipment.length} exercises</span></div><div className="category-filters" aria-label="Filter by muscle group">{categories.map(c=><button key={c} className={filter===c?'selected':''} onClick={()=>setFilter(c)} aria-pressed={filter===c}>{c==='All machines'?'All muscles':c}</button>)}</div>
          <div className="machine-grid">{visible.map(e=>{const previous=lastSet(data,e.id),count=data.current?.sets[e.id]?.filter(s=>s.done).length??0;return <article className="machine-card" key={e.id}><button className="machine-card-main" onClick={()=>selectMachine(e)} aria-label={`Use ${e.name}`}><div className="machine-photo"><img src={photo(e)} alt={`${e.name} equipment`} loading="lazy"/><span className="category-tag">{category(e)}</span>{count>0&&<span className="machine-set-badge"><Check size={13}/>{count} {count===1?'set':'sets'}</span>}</div><div className="machine-card-copy"><h3>{e.name}</h3><p>{e.muscles.join(' · ')}</p><div className="last-lift">{previous?<><span>Last set</span><strong>{previous.weight} kg <span>×</span> {previous.reps}</strong></>:<span>No sets yet</span>}</div><div className="machine-card-action">Log a set<span><ArrowRight size={20}/></span></div></div></button><button className="machine-progress" onClick={()=>viewProgress(e)} aria-label={`View progress for ${e.name}`}><TrendingUp size={18}/><span>View progress</span><ChevronRight size={16}/></button><button className={`favorite-button ${data.favorites.includes(e.id)?'selected':''}`} onClick={()=>{if(requireAccount())setData(s=>({...s,favorites:s.favorites.includes(e.id)?s.favorites.filter(id=>id!==e.id):[...s.favorites,e.id]}));}} aria-label={`${data.favorites.includes(e.id)?'Unfavorite':'Favorite'} ${e.name}`} aria-pressed={data.favorites.includes(e.id)}><Heart size={18} fill={data.favorites.includes(e.id)?'currentColor':'none'}/></button></article>;})}</div>
          {!visible.length&&<div className="empty-state"><Search size={32}/><h3>{favoritesOnly?'Your favorites will appear here.':'No equipment found.'}</h3><p>{favoritesOnly?'Tap the heart on a machine to keep it close.':'Try another name or muscle group.'}</p><button className="secondary-button" onClick={()=>{setSearch('');setFilter('All machines');setEquipmentType('All equipment');setFavoritesOnly(false);}}>Show all equipment</button></div>}
          {demo&&<div className="sample-note"><Sparkles size={18}/><p>Your earlier sample sessions are still in history.</p><button onClick={()=>setModal('settings')}>Manage samples<ChevronRight size={16}/></button></div>}
        </>}

        {tab==='Train'&&selected&&<>
          <div className="logger-navigation"><button className="back-button" onClick={showMachines}><ArrowLeft size={19}/>Machines</button><button className="quiet-button" onClick={()=>viewProgress(selected)} aria-label={`View progress for ${selected.name}`}><TrendingUp size={18}/>View progress</button></div>
          <div className="logger-grid"><div className="logger-main"><section className="card selected-machine"><div className="selected-photo"><img src={photo(selected)} alt={`${selected.name} equipment`}/><button className="photo-replace" onClick={()=>{if(requireAccount())fileRef.current?.click();}} disabled={uploading}><ImagePlus size={16}/>{uploading?'Saving…':'Your photo'}</button></div><div className="selected-machine-copy"><span className="eyebrow">{machineLabel(selected)}</span><h1>{selected.name}</h1><div className="muscle-tags">{selected.muscles.map(m=><span key={m}>{m}</span>)}</div><button className="quiet-button" onClick={openMachineSettings}><Settings2 size={16}/>Equipment setup</button></div></section>
            <section className={`card set-logger ${resting?'resting':''}`} >
              {resting?<><div className="set-saved"><span><Check size={18}/></span><div><strong>{!savePending?`Set ${selectedSets.length} saved`:syncStatus==='syncing'?'Saving set...':'Set not saved yet'}</strong><p>{selectedSets.at(-1)?.weight} kg × {selectedSets.at(-1)?.reps} reps</p></div><button className="quiet-button" onClick={undoSet}>Undo</button></div><div className="rest-heading"><h2>{data.rest?.paused!==null?'Rest paused.':'Time to rest.'}</h2></div><div className="rest-dial"><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="108" fill="none" stroke="#36312b" strokeWidth="5"/><circle cx="120" cy="120" r="108" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray="679" strokeDashoffset={679*(1-Math.min(1,remaining/(data.rest?.duration??120)))} transform="rotate(-90 120 120)"/></svg><div><strong>{formatTime(remaining)}</strong><span>{data.rest?.paused!==null?'Paused':'Rest remaining'}</span></div></div><div className="rest-controls"><button className="secondary-button" aria-label="Subtract 30 seconds rest" onClick={()=>adjustRest(-30)}><Minus size={17}/>30 sec</button><button className="pause-button" aria-label={data.rest?.paused!==null?'Resume rest':'Pause rest'} onClick={pauseRest}>{data.rest?.paused!==null?<Play size={21} fill="currentColor"/>:<Pause size={21}/>}</button><button className="secondary-button" aria-label="Add 30 seconds rest" onClick={()=>adjustRest(30)}><Plus size={17}/>30 sec</button></div><button className="primary-button end-rest" onClick={endRest}>I’m ready · end rest<ArrowRight size={19}/></button></>:<form onSubmit={logSet}><div className="set-heading"><div>{ready&&<span className="ready-pill"><Check size={15}/>Rest complete</span>}<h2>Log set {selectedSets.length+1}.</h2></div><span className="set-count">{selectedSets.length+1}</span></div><div className="set-fields"><div className="set-field"><label htmlFor="weight">Weight <span>kg</span></label><input id="weight" type="number" inputMode="decimal" step="any" min="0" max="1500" value={draft.weight} onChange={e=>editDraft('weight',e.target.value)} aria-describedby="draft-help"/><div className="number-steppers"><button type="button" aria-label="Decrease weight by 2.5 kg" onClick={()=>stepDraft('weight',-2.5)}><Minus size={19}/><span>2.5</span></button><button type="button" aria-label="Increase weight by 2.5 kg" onClick={()=>stepDraft('weight',2.5)}><Plus size={19}/><span>2.5</span></button></div></div><div className="set-field"><label htmlFor="reps">Repetitions <span>reps</span></label><input id="reps" type="number" inputMode="numeric" min="1" max="500" value={draft.reps} onChange={e=>editDraft('reps',e.target.value)} aria-describedby="draft-help"/><div className="number-steppers"><button type="button" aria-label="Decrease reps" onClick={()=>stepDraft('reps',-1)}><Minus size={19}/><span>1</span></button><button type="button" aria-label="Increase reps" onClick={()=>stepDraft('reps',1)}><Plus size={19}/><span>1</span></button></div></div></div>{selected.weightHint&&<p className="weight-guidance">{selected.weightHint}</p>}<p id="draft-help" className="draft-help">{lastSet(data,selected.id)?`Your last set: ${lastSet(data,selected.id)!.weight} kg × ${lastSet(data,selected.id)!.reps} reps. Change anything you need.`:'Choose a weight that suits your experience and equipment.'}</p>{draftError&&<p className="field-error" role="alert">{draftError}</p>}<div className="logging-action"><button className="primary-button save-set" type="submit" disabled={logging || !loaded || (!!userId && (!canSave || savePending))}>{logging?'Saving set...':userId?'Log set & start rest':'Log in to log this set'}<ArrowRight size={20}/></button><div className="rest-preview"><Clock3 size={17}/>{formatTime(data.restPreferences[selected.id]??selected.rest)} rest after this set<button type="button" onClick={openMachineSettings}>Change</button></div></div></form>}
            </section>
            {selectedSets.length>0&&<section className="card set-history"><div className="card-heading"><h3>Your sets on this machine</h3><span>Today’s session</span></div>{selectedSets.map((set,i)=><div className="logged-set" key={i}><span className="logged-number">{i+1}</span><strong>{set.weight}<small> kg</small><span>×</span>{set.reps}<small> reps</small></strong><span className="logged-check"><Check size={16}/>{saveLabel}</span>{setEditButton(data.current!,selected.id,data.current!.sets[selected.id].indexOf(set))}</div>)}{!resting&&<button className="quiet-button undo-set" onClick={undoSet}><RotateCcw size={16}/>Undo last set</button>}</section>}
            {lastUndone&&<div className="restore-bar"><p>Set removed.</p><button className="quiet-button" onClick={restoreSet}>Restore set<RotateCcw size={16}/></button></div>}
            <button className="switch-machine" onClick={showMachines}><Dumbbell size={19}/>Change exercise<ArrowRight size={18}/></button>
          </div><aside className="logger-aside">{miniBody(selected)}<section className="card setup-card"><Settings2 size={20}/><h3>Your setup</h3><p>{data.setups[selected.id]??selected.setup}</p><button className="quiet-button" onClick={openMachineSettings}>Edit setup<ChevronRight size={16}/></button></section></aside></div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadPhoto} className="visually-hidden" aria-label="Upload your machine photo"/>
        </>}

        {tab==='Body'&&<BodyProgress data={data} now={now} view={bodyView} onViewChange={changeBodyView} onExercise={selectMachine} onShare={()=>setModal('share')} onAdd={()=>{if(requireAccount())setModal('add');}} photo={photo}/>}

        {tab==='Progress'&&<><div className="page-heading progress-page-heading heading-with-action"><h1>Progress</h1><button className="secondary-button" onClick={()=>setModal('share')}><Share2 size={18}/>Share</button></div><section className="card progress-card"><ProgressEquipmentPicker equipment={equipment} photos={photos} labels={data.labels} sessions={[...data.history,...(data.current?[data.current]:[])]} selectedId={chartMachine.id} onSelect={selectProgressExercise}/><div className="progress-top"><div className="segmented" aria-label="Chart period">{[30,90,365].map(n=><button key={n} className={days===n?'selected':''} aria-pressed={days===n} onClick={()=>setDays(n)}>{n===365?'1 year':`${n} days`}</button>)}</div></div><ProgressChart key={`${chartMachine.id}-${days}`} sessions={[...data.history,...(data.current?[data.current]:[])]} id={chartMachine.id} days={days} assistance={['assisted-pullup','assisted-dip'].includes(chartMachine.id) || chartMachine.weightHint?.startsWith('Log assistance')} weightHint={chartMachine.weightHint}/></section><div className="progress-summary"><section className="card"><span>Total sessions</span><strong>{historySessions.length}</strong></section><section className="card"><span>Total sets</span><strong>{data.history.reduce((n,s)=>n+totalSets(s),0)+sessionSets}</strong></section><section className="card"><span>Muscles logged this week</span><strong>{weekMuscles.length}<small> / {allMuscles.length}</small></strong></section></div>{demo&&<p className="data-note">Includes your earlier sample history. Manage it in Settings.</p>}</>}

        {tab==='History'&&<><div className="page-heading heading-with-action"><div><h1>History</h1></div><div className="share-entry-actions"><button className="secondary-button" onClick={()=>setModal('share')}><Share2 size={18}/>Share</button><button className="secondary-button" onClick={exportData}><ArrowDownToLine size={18}/>Export</button></div></div>{sessionSets>0&&<div className="rest-banner session-review-banner"><Dumbbell size={25}/><div><strong>Your session is open.</strong><p>{sessionSets} sets · {Object.keys(data.current!.sets).filter(id=>data.current!.sets[id].some(x=>x.done)).length} machines</p></div><button className="secondary-button" onClick={()=>setModal('finish')}>Review & finish<ArrowRight size={17}/></button></div>}{historySessions.length?<section className="card history-list">{historySessions.map(s=><details className="history-entry" key={s.id}><summary><span className="history-date"><Clock3 size={20}/>{formatDate(s.started)}</span><div><strong>{s.routine==='Free training'?'Free training':s.routine}<span className={`history-session-status ${s.finished?'is-finished':'is-open'}`}>{s.finished?'Finished':'Open'}</span></strong><p>{countLabel(totalSets(s),'set')} · {countLabel(Object.keys(s.sets).filter(id=>s.sets[id].some(x=>x.done)).length,'exercise')}{s.demo?' · Sample':''}</p></div><ChevronDown size={21}/></summary><div className="history-detail">{!s.finished&&<div className="open-session-actions"><p>This session is open. Logged sets save automatically to your account.</p><button className="secondary-button" disabled={!canSave || savePending} onClick={()=>resumeSession(s)}>Continue session<ArrowRight size={17}/></button>{data.current?.id===s.id&&<button className="primary-button" disabled={!canSave || savePending} onClick={()=>setModal('finish')}>Name & finish<Check size={17}/></button>}</div>}{Object.entries(s.sets).filter(([,sets])=>sets.some(x=>x.done)).map(([id,sets])=><div key={id}><h3>{equipment.find(e=>e.id===id)?.name??id}</h3><div className="history-set-list">{sets.map((set,index)=>set.done&&<div className="history-set-row" key={index}><span>Set {sets.slice(0,index+1).filter(x=>x.done).length}</span><strong>{formatNumber(set.weight)} kg &times; {set.reps} reps</strong>{setEditButton(s,id,index)}</div>)}</div></div>)}<button className="quiet-button history-delete-button" disabled={!canSave || savePending} onClick={()=>{setDeletingSession(s);setModal('delete-session');}}><Trash2 size={16}/>Delete session</button><span>{formatNumber(volume(s))} kg total volume</span><p>Volume adds up each completed set’s weight × reps across all exercises.</p></div></details>)}</section>:<div className="card empty-state"><span className="empty-icon"><Clock3 size={32}/></span><h2>No saved sessions</h2><p>Log your first set to start an open session. Every set saves automatically to your account.</p><button className="primary-button" onClick={showMachines}>Choose a machine<ArrowRight size={19}/></button></div>}</>}
      </div>
    </main>
    {data.rest&&restMachine&&!(tab==='Train'&&selected?.id===restMachine.id)&&<button className="floating-rest" onClick={()=>selectMachine(restMachine)} aria-label={`${data.rest.complete?'Rest complete':data.rest.paused!==null?'Rest paused':'Rest remaining'} for ${restMachine.name}${data.rest.complete?'':`, ${formatTime(remaining)}`}. Open machine`}><Clock3 size={22}/><strong>{data.rest.complete?'Ready':formatTime(remaining)}</strong><span className="floating-rest-copy"><span>{restMachine.name}</span><small>{data.rest.complete?'Rest complete · Log next set':data.rest.paused!==null?'Rest paused':'Rest remaining'}</small></span><ChevronRight size={19}/></button>}
    {toast&&<div className="toast" role="status"><Check size={18}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={17}/></button></div>}
    <dialog ref={dialogRef} className="dialog" onCancel={()=>setModal(null)} onClick={e=>{if(e.target===dialogRef.current)setModal(null);}} aria-label={modal==='edit-set'?'Edit logged set':modal==='delete-set'?'Delete set':modal==='delete-session'?'Delete session':modal==='share'?'Share your training':modal==='login'?'Log in to save':modal==='finish'?'Finish session':modal==='add'?'Add your machine':modal==='machine'?'Machine settings':'Settings'}><div className="dialog-content"><div className="dialog-top"><button className="icon-button" aria-label="Close dialog" onClick={()=>setModal(null)}><X size={22}/></button></div>
      {modal==='share'&&<TrainingShare data={data}/>}
      {modal==='edit-set'&&correction&&<form onSubmit={e=>{e.preventDefault();void saveCorrection();}}><h2>Edit logged set</h2><p className="dialog-description">{equipment.find(e=>e.id===correction.exerciseId)?.name??correction.exerciseId}. Correct the weight or reps for this set.</p><div className="set-correction-fields"><label className="form-label">Weight (kg)<input type="number" inputMode="decimal" min="0" max="1500" step="any" required value={correction.weight} disabled={correcting} onChange={e=>{setCorrection({...correction,weight:e.target.value});setCorrectionError('');}}/></label><label className="form-label">Reps<input type="number" inputMode="numeric" min="1" max="500" step="1" required value={correction.reps} disabled={correcting} onChange={e=>{setCorrection({...correction,reps:e.target.value});setCorrectionError('');}}/></label></div>{correctionError&&<p role="alert" className="correction-error">{correctionError}</p>}<button className="primary-button full-width" disabled={!canSave || savePending || correcting}>{correcting?'Saving...':'Save changes'}<Check size={18}/></button><button type="button" className="secondary-button full-width" disabled={correcting} onClick={()=>setModal(null)}>Cancel</button><button type="button" className="quiet-button full-width history-delete-button" disabled={!canSave || savePending || correcting} onClick={()=>{setCorrectionError('');setModal('delete-set');}}><Trash2 size={16}/>Delete set</button></form>}
      {modal==='delete-set'&&correction&&<><h2>Delete this set?</h2><p className="dialog-description">Remove {formatNumber(correction.original[correction.index].weight)} kg &times; {correction.original[correction.index].reps} reps from {equipment.find(e=>e.id===correction.exerciseId)?.name??correction.exerciseId}? Your progress totals will update. This cannot be undone.</p>{correctionError&&<p role="alert" className="correction-error">{correctionError}</p>}<button className="primary-button full-width" disabled={!canSave || savePending || correcting} onClick={()=>saveCorrection(true)}>{correcting?'Deleting...':'Delete set'}<Trash2 size={18}/></button><button className="secondary-button full-width" disabled={correcting} onClick={()=>setModal('edit-set')}>Keep set</button></>}
      {modal==='delete-session'&&deletingSession&&<><h2>Delete this session?</h2><p className="dialog-description">Remove {deletingSession.routine||'Free training'} from {formatDate(deletingSession.started)} and all {countLabel(totalSets(deletingSession),'logged set')}? Your progress totals will update. This cannot be undone.</p><button className="primary-button full-width" disabled={!canSave || savePending || correcting} onClick={deleteSession}>{correcting?'Deleting...':'Delete session'}<Trash2 size={18}/></button><button className="secondary-button full-width" disabled={correcting} onClick={()=>setModal(null)}>Keep session</button></>}
      {modal==='login' &&<><h2>Log in to save</h2><p className="dialog-description">Log in to save workouts, favorites, equipment setups and photos. Your training history and progress will stay with your account.</p><Link href="/login" className="primary-button full-width">Log in to save<ArrowRight size={20}/></Link><Link href="/signup" className="secondary-button full-width">Create an account<Plus size={18}/></Link><button className="quiet-button full-width" onClick={()=>setModal(null)}>Keep browsing</button></>}
      {modal==='finish'&&!data.current&&<><h2>{syncStatus==='synced'?'Session finished':'Finishing session...'}</h2><p className="dialog-description">{syncStatus==='syncing'?'Waiting for database confirmation.':syncMessage||'Your session is saved to your account.'}</p>{!canSave&&<button className="primary-button full-width" onClick={retrySync}>Retry connection</button>}</>}
      {modal==='finish'&&data.current&&<><h2>Finish your session?</h2><p className="dialog-description">Your sets save automatically and already appear in History as open. Name this session and mark it finished.</p><label className="form-label session-name-field">Session name<input disabled={!canSave || finishing} value={data.current.routine==='Free training'?'':data.current.routine} onChange={e=>{const name=e.target.value,id=data.current!.id;setData(s=>updateTrainingSession(s,id,session=>({...session,routine:name})));}} placeholder="e.g. Push day" maxLength={60} autoComplete="off" aria-describedby="session-name-help"/></label><p className="session-name-help" id="session-name-help">Leave blank for Free training.</p><div className="finish-stats"><div><strong>{sessionSets}</strong><span>sets logged</span></div><div><strong>{Object.values(data.current.sets).filter(sets=>sets.some(x=>x.done)).length}</strong><span>machines used</span></div></div><div className="review-sets">{Object.entries(data.current.sets).filter(([,sets])=>sets.some(x=>x.done)).map(([id,sets])=><div key={id}><strong>{equipment.find(e=>e.id===id)?.name??id}</strong><span>{sets.filter(x=>x.done).length} {sets.filter(x=>x.done).length===1?'set':'sets'}</span></div>)}</div><button className="primary-button full-width" disabled={!canSave || finishing || savePending} onClick={finishSession}>{finishing?'Finishing...':'Finish session'}<Check size={20}/></button><button className="secondary-button full-width" onClick={()=>setModal(null)}>Keep training</button><button className="quiet-button full-width" onClick={()=>setModal('share')}><Share2 size={18}/>Share your work</button></>}
      {modal==='add'&&<form onSubmit={addMachine}><h2>Add your machine.</h2><p className="dialog-description">Give it a name and choose a similar machine for its default photo and muscle targets.</p><label className="form-label">Machine name<input autoComplete="off" placeholder="e.g. My incline chest press" value={customName} maxLength={70} onChange={e=>{setCustomName(e.target.value);setFormError('');}} required/></label><label className="form-label">Similar equipment<select value={customBase} onChange={e=>setCustomBase(e.target.value)}>{exercises.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label className="form-label">Gym or machine label <span>Optional</span><input placeholder="e.g. Downtown gym · Machine 4" value={customLabel} maxLength={90} onChange={e=>setCustomLabel(e.target.value)}/></label>{formError&&<p className="field-error" role="alert">{formError}</p>}<button className="primary-button full-width" type="submit" disabled={!canSave}>Add machine<Plus size={20}/></button><p className="gentle-note">You can add your own photo after creating it.</p></form>}
      {modal==='machine'&&selected&&<form onSubmit={saveMachineSettings}><h2>Your machine setup.</h2><p className="dialog-description">{selected.name}</p><label className="form-label">Gym or machine label<input placeholder="e.g. Downtown gym · Machine 4" value={labelDraft} maxLength={90} onChange={e=>setLabelDraft(e.target.value)}/></label><label className="form-label">Seat settings & notes<textarea value={setupDraft} onChange={e=>setSetupDraft(e.target.value)} maxLength={200} rows={3}/></label><label className="form-label">Rest after each set<select value={restDraft} onChange={e=>setRestDraft(Number(e.target.value))}>{[30,60,90,120,150,180,240,300].map(n=><option key={n} value={n}>{formatTime(n)} minutes</option>)}</select></label><section className="muscle-editor" aria-label="Muscle targets"><h3>What this trains</h3><p>Choose the muscles this machine works for you.</p><fieldset><legend>Primary muscles</legend><p>Choose at least one. These count toward your body coverage.</p><div className="muscle-choices">{allMuscles.map(m=><label className={`muscle-choice ${primaryDraft.includes(m)?'selected':''}`} key={m}><input type="checkbox" checked={primaryDraft.includes(m)} onChange={()=>togglePrimary(m)}/><span>{m}</span>{primaryDraft.includes(m)&&<Check size={14}/>}</label>)}</div></fieldset><fieldset><legend>Secondary muscles <span>Optional</span></legend><p>Supporting muscles. Primary targets are already included.</p><div className="muscle-choices">{allMuscles.map(m=><label className={`muscle-choice ${secondaryDraft.includes(m)?'selected':''} ${primaryDraft.includes(m)?'unavailable':''}`} key={m}><input type="checkbox" checked={secondaryDraft.includes(m)} disabled={primaryDraft.includes(m)} onChange={()=>toggleSecondary(m)}/><span>{m}</span>{secondaryDraft.includes(m)&&<Check size={14}/>}</label>)}</div></fieldset>{muscleError&&<p className="field-error" role="alert">{muscleError}</p>}</section><div className="photo-settings"><span>Machine photo</span><div><button type="button" className="secondary-button" disabled={uploading} onClick={()=>{if(requireAccount())fileRef.current?.click();}}><ImagePlus size={18}/>{uploading?'Saving…':'Upload your photo'}</button>{photos[selected.id]&&<button type="button" className="quiet-button" onClick={resetPhoto}>Use default</button>}</div><p>JPG, PNG, WebP or AVIF · up to 10 MB. Stored on this device.</p></div><button className="primary-button full-width" type="submit" disabled={!canSave}>Save setup<Check size={20}/></button></form>}
      {modal==='settings'&&<><h2>Settings</h2><div className="settings-row"><div><strong>Accent color</strong><p>A personal touch for your training space.</p></div><ThemeToggle/></div><div className="settings-row"><div><strong>Keep Liftide close</strong><p>Add the app to your Home Screen or desktop.</p></div><button className="secondary-button" onClick={()=>{setModal(null);window.dispatchEvent(new Event('liftide:install'));}}>Install app</button></div><p className="dialog-description">{userId?'Workouts and equipment edits sync to your account. Photos stay on this device.':'Browse the exercise library freely. Log in to save workouts, favorites, equipment edits and photos.'}</p><Link className="settings-home secondary-button" href="/"><ArrowLeft size={17}/>Back to Liftide home</Link><div className="account-panel"><strong>{userId?'Your account':'Train with an account'}</strong><p>{userId?auth.user?.email:'Create an account to save your training and keep it with you across devices.'}</p><Link className="secondary-button" href={userId?'/account':'/signup'}>{userId?'Manage account':'Create account'}</Link>{!userId&&<Link className="auth-inline-link" href="/login">Already have an account? Log in</Link>}</div><label className="form-label">Your name <span>Optional</span><input disabled={!userId || !canSave} value={data.name} maxLength={30} placeholder="Your name" onChange={e=>setData(s=>({...s,name:e.target.value}))}/></label><div className="settings-row"><div><strong>Your training data</strong><p>{data.history.filter(s=>!s.demo).length} saved sessions. Export a copy for safekeeping.</p></div><button className="secondary-button" onClick={exportData}><ArrowDownToLine size={18}/>Export</button></div>{demo&&<div className="settings-row"><div><strong>Earlier sample sessions</strong><p>Remove the examples. Your own sessions will stay.</p></div><button className="secondary-button" onClick={()=>{setData(s=>({...s,history:s.history.filter(session=>!session.demo)}));setToast('Sample sessions removed. Your training is kept.');}}>Remove samples</button></div>}<button className="primary-button full-width" onClick={()=>setModal(null)}>Done<Check size={20}/></button></>}
    </div></dialog>
  </div>;
}
