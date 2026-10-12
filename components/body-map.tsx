'use client';
import type { Muscle } from '@/lib/training';
type Props={back:boolean; active:Muscle[]; worked:Muscle[]; selected:Muscle; onSelect:(muscle:Muscle)=>void; diagnostic?:boolean};
const front:{muscle:Muscle;d:string}[]=[
 {muscle:'Shoulders',d:'M93 71 Q72 66 64 87 L59 105 Q73 109 82 96 Z M147 71 Q168 66 176 87 L181 105 Q167 109 158 96 Z'},
 {muscle:'Upper chest',d:'M95 72 L118 79 L118 95 Q97 94 84 87 Z M145 72 L122 79 L122 95 Q143 94 156 87 Z'},
 {muscle:'Chest',d:'M84 90 Q100 99 118 98 L117 115 Q95 128 82 108 Z M156 90 Q140 99 122 98 L123 115 Q145 128 158 108 Z'},
 {muscle:'Biceps',d:'M60 109 Q73 112 80 103 L76 130 Q69 142 57 140 Z M180 109 Q167 112 160 103 L164 130 Q171 142 183 140 Z'},
 {muscle:'Triceps',d:'M53 102 L57 108 L53 139 L46 143 Z M187 102 L183 108 L187 139 L194 143 Z'},
 {muscle:'Abs',d:'M103 122 L118 119 L118 137 L102 135 Z M122 119 L137 122 L138 135 L122 137 Z M102 140 L118 142 L118 157 L102 155 Z M122 142 L138 140 L138 155 L122 157 Z M103 160 L118 163 L118 180 L106 175 Z M122 163 L137 160 L134 175 L122 180 Z'},
 {muscle:'Quads',d:'M87 190 Q99 190 114 191 L108 250 Q103 269 91 279 L79 266 Q77 230 87 190 Z M153 190 Q141 190 126 191 L132 250 Q137 269 149 279 L161 266 Q163 230 153 190 Z'},
 {muscle:'Calves',d:'M81 290 Q94 291 105 284 L100 326 L90 354 L80 352 Z M159 290 Q146 291 135 284 L140 326 L150 354 L160 352 Z'}
];
const rear:{muscle:Muscle;d:string}[]=[
 {muscle:'Shoulders',d:'M91 72 Q70 67 63 89 L59 105 L80 105 Z M149 72 Q170 67 177 89 L181 105 L160 105 Z'},
 {muscle:'Upper back',d:'M96 68 L119 59 L119 119 L95 100 L84 84 Z M144 68 L121 59 L121 119 L145 100 L156 84 Z'},
 {muscle:'Lats',d:'M83 96 L116 123 L111 162 L97 155 L86 127 Z M157 96 L124 123 L129 162 L143 155 L154 127 Z'},
 {muscle:'Lower back',d:'M112 129 L120 124 L128 129 L130 176 L110 176 Z'},
 {muscle:'Triceps',d:'M60 109 L79 107 L75 132 Q67 146 56 141 Z M180 109 L161 107 L165 132 Q173 146 184 141 Z'},
 {muscle:'Glutes',d:'M91 177 Q104 173 118 179 L118 205 Q101 218 85 205 Z M149 177 Q136 173 122 179 L122 205 Q139 218 155 205 Z'},
 {muscle:'Hamstrings',d:'M85 211 Q102 221 115 210 L108 255 L98 279 L80 273 Z M155 211 Q138 221 125 210 L132 255 L142 279 L160 273 Z'},
 {muscle:'Calves',d:'M81 290 Q97 281 106 289 L104 317 L91 349 L81 340 Z M159 290 Q143 281 134 289 L136 317 L149 349 L159 340 Z'}
];
export default function BodyMap({back,active,worked,selected,onSelect,diagnostic=false}:Props){return <svg className={`body-svg ${diagnostic?'diagnostic-body':''}`} viewBox="0 0 240 400" role="group" aria-label={`${back?'Back':'Front'} muscle map. ${diagnostic?'Blue shows muscles logged this week.':'Orange shows muscles targeted by the selected exercise.'}`}>
 <defs><linearGradient id="bodySteel" x1="0" y1="0" x2="1" y2="0"><stop stopColor={diagnostic?"#15232e":"#24272a"}/><stop offset=".5" stopColor={diagnostic?"#506675":"#55585b"}/><stop offset="1" stopColor={diagnostic?"#1b2b37":"#272a2d"}/></linearGradient><linearGradient id="muscleAmber" x1="0" y1="0" x2="1" y2="1"><stop stopColor={diagnostic?"#80e1ff":"#e6a15e"}/><stop offset="1" stopColor={diagnostic?"#216ba4":"#8c4a26"}/></linearGradient><filter id="muscleGlow"><feGaussianBlur stdDeviation="5"/></filter></defs>
 <ellipse cx="120" cy="386" rx="57" ry="6" fill="#16181a"/>
 <path d="M105 19 Q120 7 135 19 L139 38 L131 54 L130 64 L147 69 Q173 64 181 88 L191 128 L199 157 L203 177 L208 189 L202 201 L195 195 L191 181 L184 163 L171 137 L163 117 L153 147 L149 166 L155 192 L165 227 L164 265 L161 280 L163 306 L158 352 L158 370 L169 379 L166 386 L144 384 L138 374 L139 351 L128 301 L127 282 L120 236 L113 282 L112 301 L101 351 L102 374 L96 384 L74 386 L71 379 L82 370 L82 352 L77 306 L79 280 L76 265 L75 227 L85 192 L91 166 L87 147 L77 117 L69 137 L56 163 L49 181 L45 195 L38 201 L32 189 L37 177 L41 157 L49 128 L59 88 Q67 64 93 69 L110 64 L109 54 L101 38 Z" fill="url(#bodySteel)" stroke="#65686a" strokeWidth=".7"/>
 <path d="M106 26 Q120 20 134 26 M110 49 L130 49 M110 64 L120 74 L130 64 M120 77 L120 185 M91 165 L103 181 M149 165 L137 181 M87 280 L104 280 M136 280 L153 280" fill="none" stroke="#797b7d" strokeOpacity=".35"/>
 {(back?rear:front).map(({muscle,d})=><g key={muscle} role="button" tabIndex={0} aria-label={muscle} onClick={()=>onSelect(muscle)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(muscle)}}} aria-pressed={selected===muscle} data-active={active.includes(muscle)} data-selected={selected===muscle} className="muscle-region"><path d={d} fill={active.includes(muscle)?'url(#muscleAmber)':worked.includes(muscle)?(diagnostic?'#244b66':'#625144'):(diagnostic?'#243541':'#36393c')} stroke={selected===muscle?(diagnostic?'#b4efff':'#efb677'):active.includes(muscle)?(diagnostic?'#66c9f4':'#be824f'):(diagnostic?'#5c7485':'#626568')} strokeWidth={selected===muscle?1.8:.65}/><title>{`${muscle}${active.includes(muscle)?(diagnostic?' \u2014 logged this week':' \u2014 targeted by selected exercise'):''}`}</title></g>)}
 <path d="M43 155 L48 161 L41 179 M197 155 L192 161 L199 179 M92 300 L91 338 M148 300 L149 338" stroke="#828487" strokeOpacity=".3" fill="none"/>
 </svg>}
