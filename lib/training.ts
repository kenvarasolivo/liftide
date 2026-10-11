export type Muscle = 'Upper chest' | 'Chest' | 'Shoulders' | 'Triceps' | 'Biceps' | 'Abs' | 'Quads' | 'Calves' | 'Upper back' | 'Lats' | 'Lower back' | 'Glutes' | 'Hamstrings';
export type Exercise = { id: string; name: string; machine: string; muscles: Muscle[]; secondary: Muscle[]; weight: number; reps: number; sets: number; rest: number; setup: string; kind: string };
export type LoggedSet = { weight: number; reps: number; done: boolean };
export type Session = { id: string; routine: string; started: number; finished?: number; sets: Record<string, LoggedSet[]>; demo?: boolean };
export const exercises: Exercise[] = [
 { id:'incline', name:'Incline chest press', machine:'Technogym · Machine 04', muscles:['Upper chest'], secondary:['Shoulders','Triceps'], weight:45,reps:10,sets:3,rest:120,setup:'Seat 3 · handles at upper-chest height',kind:'press' },
 { id:'shoulder', name:'Seated shoulder press', machine:'Technogym · Machine 07', muscles:['Shoulders'],secondary:['Triceps'],weight:30,reps:10,sets:3,rest:120,setup:'Seat 4 · neutral grip',kind:'press' },
 { id:'fly',name:'Pec deck fly',machine:'Life Fitness · Machine 12',muscles:['Chest'],secondary:[],weight:35,reps:12,sets:3,rest:90,setup:'Seat 3 · elbows slightly bent',kind:'fly' },
 { id:'triceps',name:'Cable triceps pushdown',machine:'Cable station · Bay 02',muscles:['Triceps'],secondary:[],weight:20,reps:12,sets:3,rest:90,setup:'Rope attachment · high pulley',kind:'cable' },
 { id:'lat',name:'Lat pulldown',machine:'Technogym · Machine 09',muscles:['Lats'],secondary:['Biceps','Upper back'],weight:45,reps:10,sets:3,rest:120,setup:'Thigh pad 3 · shoulder-width grip',kind:'cable' },
 { id:'row',name:'Seated cable row',machine:'Cable station · Bay 03',muscles:['Upper back'],secondary:['Lats','Biceps'],weight:40,reps:10,sets:3,rest:120,setup:'Close-grip handle · footplate 2',kind:'cable' },
 { id:'curl',name:'Preacher curl',machine:'Life Fitness · Machine 15',muscles:['Biceps'],secondary:[],weight:20,reps:12,sets:3,rest:90,setup:'Seat 2 · upper arms on pad',kind:'fly' },
 { id:'leg',name:'Leg press',machine:'Technogym · Machine 18',muscles:['Quads','Glutes'],secondary:['Hamstrings'],weight:100,reps:10,sets:3,rest:150,setup:'Backrest 3 · feet shoulder-width apart',kind:'press' },
 { id:'ham',name:'Seated leg curl',machine:'Life Fitness · Machine 21',muscles:['Hamstrings'],secondary:[],weight:35,reps:12,sets:3,rest:90,setup:'Knee aligned with pivot · pad 3',kind:'press' },
 { id:'calf',name:'Calf raise',machine:'Technogym · Machine 22',muscles:['Calves'],secondary:[],weight:40,reps:15,sets:3,rest:90,setup:'Shoulder pad 4 · full comfortable range',kind:'press' },
 { id:'abs',name:'Cable crunch',machine:'Cable station · Bay 02',muscles:['Abs'],secondary:[],weight:20,reps:15,sets:3,rest:90,setup:'Rope attachment · high pulley',kind:'cable' },
];
export const routines = [ {name:'Push day',tag:'CHEST · SHOULDERS · TRICEPS',ids:['incline','shoulder','fly','triceps'],duration:45}, {name:'Pull day',tag:'BACK · BICEPS',ids:['lat','row','curl'],duration:40}, {name:'Leg day',tag:'LEGS · CORE',ids:['leg','ham','calf','abs'],duration:50} ];
export const allMuscles: Muscle[] = ['Upper chest','Chest','Shoulders','Triceps','Biceps','Abs','Quads','Calves','Upper back','Lats','Lower back','Glutes','Hamstrings'];
export function createSession(name: string, history: Session[] = []): Session {
 const routine=routines.find(r=>r.name===name)!;
 const sets: Session['sets']={};
 routine.ids.forEach(id=>{ const e=exercises.find(x=>x.id===id)!; const prev=history.find(s=>s.sets[id]?.some(x=>x.done)); const last=prev?.sets[id]?.filter(x=>x.done); sets[id]=Array.from({length:e.sets},(_,i)=>({weight:last?.[i]?.weight??e.weight,reps:last?.[i]?.reps??e.reps,done:false})); });
 return {id:crypto.randomUUID(),routine:name,started:Date.now(),sets};
}
export const totalSets=(s:Session)=>Object.values(s.sets).flat().filter(x=>x.done).length;
export const volume=(s:Session)=>Object.values(s.sets).flat().filter(x=>x.done).reduce((sum,x)=>sum+x.weight*x.reps,0);
export function seedHistory():Session[] { return Array.from({length:9},(_,i)=>{const routine=routines[i%3]; const sets:Session['sets']={}; routine.ids.forEach(id=>{const e=exercises.find(x=>x.id===id)!;sets[id]=Array.from({length:3},()=>({weight:Math.max(5,e.weight-Math.floor(i/3)*2.5),reps:e.reps,done:true}));});const started=Date.now()-(i*2+2)*86400000;return{id:`demo-${i}`,routine:routine.name,started,finished:started+routine.duration*60000,sets,demo:true};}); }
