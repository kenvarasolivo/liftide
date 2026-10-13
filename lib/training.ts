export type Muscle = 'Upper chest' | 'Chest' | 'Shoulders' | 'Triceps' | 'Biceps' | 'Abs' | 'Quads' | 'Calves' | 'Upper back' | 'Lats' | 'Lower back' | 'Glutes' | 'Hamstrings';
export type EquipmentType = 'Machines' | 'Free weights' | 'Bodyweight';
export type Exercise = { id: string; name: string; machine: string; muscles: Muscle[]; secondary: Muscle[]; weight: number; reps: number; sets: number; rest: number; setup: string; kind: string; equipmentType?: EquipmentType; illustration?: string; weightHint?: string };
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
// Stable IDs keep existing logs intact as the built-in library grows.
const additions: Array<[string, string, Muscle[], Muscle[], EquipmentType, string, number, string, string]> = [
 ['chest-press','Seated chest press',['Chest'],['Shoulders','Triceps'],'Machines','press',120,'Adjust the seat so handles line up with your chest.','Log the weight shown on the stack, or total loaded plates.'],
 ['smith-press','Smith machine bench press',['Chest'],['Shoulders','Triceps'],'Machines','rack',120,'Position a flat bench under the bar and set the safety stops.','Include the machine’s effective bar weight and all added plates.'],
 ['bench-press','Barbell bench press',['Chest'],['Shoulders','Triceps'],'Free weights','bench',150,'Set the rack and safety bars to suit your bench position.','Log total weight, including the bar and all plates.'],
 ['dumbbell-press','Dumbbell bench press',['Chest'],['Shoulders','Triceps'],'Free weights','dumbbell',120,'Use a flat bench and keep both feet supported.','Log the weight of one dumbbell; reps are per arm.'],
 ['incline-dumbbell','Incline dumbbell press',['Upper chest'],['Shoulders','Triceps'],'Free weights','dumbbell',120,'Set the bench to a comfortable low incline.','Log the weight of one dumbbell; reps are per arm.'],
 ['cable-fly','Cable chest fly',['Chest'],['Shoulders'],'Machines','cable',90,'Set both pulleys at chest height and use single handles.','Log one side’s stack weight; keep both sides equal.'],
 ['assisted-pullup','Assisted pull-up',['Lats'],['Upper back','Biceps'],'Machines','pullup',120,'Adjust the assistance and choose a comfortable grip.','Log assistance in kg. Less assistance means a harder set; volume reflects assistance, not work lifted.'],
 ['pullup','Pull-up',['Lats'],['Upper back','Biceps'],'Bodyweight','pullup',120,'Choose a comfortable grip and use a controlled range.','Log 0 kg for bodyweight, or only the extra weight you add.'],
 ['chest-supported-row','Chest-supported row',['Upper back'],['Lats','Biceps'],'Machines','row',120,'Adjust the chest pad so you can reach the handles comfortably.','Log stack weight or total plates loaded.'],
 ['barbell-row','Barbell bent-over row',['Upper back'],['Lats','Biceps','Lower back'],'Free weights','barbell',120,'Choose a controlled hinge position and comfortable grip.','Log total weight, including the bar and all plates.'],
 ['dumbbell-row','Single-arm dumbbell row',['Lats'],['Upper back','Biceps'],'Free weights','dumbbell',90,'Support one hand on a bench and train both sides.','Log one dumbbell’s weight and reps per side.'],
 ['back-extension','Back extension',['Lower back'],['Glutes','Hamstrings'],'Bodyweight','extension',90,'Set the hip pad below your hip crease.','Log 0 kg for bodyweight, or only the extra weight you hold.'],
 ['reverse-fly','Reverse pec deck fly',['Upper back','Shoulders'],[],'Machines','fly',90,'Face the pad and adjust handles to shoulder height.','Log the weight shown on the stack.'],
 ['lateral-raise','Dumbbell lateral raise',['Shoulders'],[],'Free weights','dumbbell',90,'Use a comfortable stance and slightly bent elbows.','Log the weight of one dumbbell; reps are per arm.'],
 ['dumbbell-shoulder','Dumbbell shoulder press',['Shoulders'],['Triceps'],'Free weights','dumbbell',120,'Use a bench with a supported upright backrest.','Log the weight of one dumbbell; reps are per arm.'],
 ['face-pull','Cable face pull',['Shoulders'],['Upper back'],'Machines','cable',90,'Attach a rope and set the pulley near face height.','Log the weight shown on the stack.'],
 ['dumbbell-curl','Dumbbell biceps curl',['Biceps'],[],'Free weights','dumbbell',90,'Keep your upper arms steady and train both sides.','Log the weight of one dumbbell and reps per arm.'],
 ['hammer-curl','Dumbbell hammer curl',['Biceps'],[],'Free weights','dumbbell',90,'Use a neutral grip with palms facing inward.','Log the weight of one dumbbell and reps per arm.'],
 ['cable-curl','Cable biceps curl',['Biceps'],[],'Machines','cable',90,'Use a low pulley with a straight or EZ attachment.','Log the weight shown on the stack.'],
 ['triceps-extension','Overhead cable triceps extension',['Triceps'],[],'Machines','cable',90,'Use a rope attachment and adjust the pulley for your stance.','Log the weight shown on the stack.'],
 ['assisted-dip','Assisted dip',['Triceps'],['Chest','Shoulders'],'Machines','pullup',120,'Adjust the assistance and use a comfortable range.','Log assistance in kg. Less assistance means a harder set; volume reflects assistance, not work lifted.'],
 ['leg-extension','Leg extension',['Quads'],[],'Machines','extension',90,'Align your knees with the pivot and pad above your ankles.','Log the weight shown on the stack.'],
 ['lying-leg-curl','Lying leg curl',['Hamstrings'],[],'Machines','extension',90,'Align knees with the pivot and place the pad above your heels.','Log the weight shown on the stack.'],
 ['hack-squat','Hack squat',['Quads'],['Glutes','Hamstrings'],'Machines','rack',150,'Set the shoulder pads and safety stops before loading.','Log total added plates; use the same convention every session.'],
 ['smith-squat','Smith machine squat',['Quads'],['Glutes'],'Machines','rack',150,'Set the bar and safety stops for your range of motion.','Include effective bar weight and all added plates.'],
 ['barbell-squat','Barbell back squat',['Quads'],['Glutes','Lower back'],'Free weights','rack',150,'Set the rack hooks and safety bars before loading.','Log total weight, including the bar and all plates.'],
 ['romanian-deadlift','Barbell Romanian deadlift',['Hamstrings'],['Glutes','Lower back'],'Free weights','barbell',150,'Keep the bar close and use a controlled hip hinge.','Log total weight, including the bar and all plates.'],
 ['deadlift','Barbell deadlift',['Glutes','Hamstrings'],['Lower back','Quads','Upper back'],'Free weights','barbell',180,'Start with the bar over mid-foot and a secure grip.','Log total weight, including the bar and all plates.'],
 ['hip-thrust','Hip thrust machine',['Glutes'],['Hamstrings'],'Machines','bench',120,'Position the belt or pad securely across your hips.','Log stack weight or total added plates.'],
 ['goblet-squat','Kettlebell goblet squat',['Quads'],['Glutes','Abs'],'Free weights','kettlebell',120,'Hold the kettlebell close to your chest.','Log the weight of the kettlebell.'],
 ['split-squat','Dumbbell Bulgarian split squat',['Quads','Glutes'],['Hamstrings'],'Free weights','dumbbell',120,'Support your rear foot on a stable low bench; train both legs.','Log the combined weight of both dumbbells and reps per leg.'],
 ['seated-calf','Seated calf raise',['Calves'],[],'Machines','extension',90,'Position pads above your knees and the balls of your feet on the platform.','Log stack weight or total added plates.'],
 ['ab-machine','Abdominal crunch machine',['Abs'],[],'Machines','press',90,'Adjust the seat and pads to a comfortable position.','Log the weight shown on the stack.'],
 ['hanging-knee','Hanging knee raise',['Abs'],[],'Bodyweight','pullup',90,'Use a pull-up bar or supported captain’s chair.','Log 0 kg for bodyweight, or only extra weight.'],
 ['pushup','Push-up',['Chest'],['Triceps','Shoulders','Abs'],'Bodyweight','bodyweight',90,'Set your hands at a comfortable width on a stable surface.','Log 0 kg for bodyweight, or only extra weight.'],
];
exercises.push(...additions.map(([id,name,muscles,secondary,equipmentType,illustration,rest,setup,weightHint]):Exercise => ({id,name,muscles,secondary,equipmentType,illustration,rest,setup,weightHint,machine:equipmentType,kind:illustration,weight:0,reps:10,sets:3})));
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
