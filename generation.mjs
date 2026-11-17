// Deterministic placement is separate from rendering so worlds can be shared and verified.
export function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export const featured=[
 {position:[0,0,0],radius:27,kind:0,seed:731,name:'Aurelia',rings:true},
 {position:[-520,40,-400],radius:23,kind:1,seed:441,name:'Pelagia'},
 {position:[-570,61,-435],radius:6,kind:2,seed:833,name:'Pelagia I',moon:true,host:'Pelagia'},
 {position:[65,15,-55],radius:5,kind:2,seed:841,name:'Aurelia I',moon:true,host:'Aurelia'},
 {position:[-350,-35,400],radius:12,kind:2,seed:420,name:'Shallows Core'},
 {position:[900,-130,400],radius:18,kind:3,seed:920,name:'Signal Prime'}
];
const reserved=[{position:[650,30,-350],radius:430},...[ [0,32,140],[655,95,-120],[-514,64,-295],[-350,-15,490],[420,185,580],[900,-108,475]].map(position=>({position,radius:30}))];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export function generateCatalog(seed,count=84){const random=rng(seed),between=(a,b)=>a+(b-a)*random();const bodies=featured.map(x=>({...x,position:[...x.position],featured:true}));const syllables=['Nara','Eos','Vesper','Orin','Sora','Iona','Nyx','Kepler','Cinder','Thale','Mira','Cael'];
 const safe=(position,radius)=>[...bodies,...reserved].every(b=>distance(position,b.position)>radius+b.radius+14);
 for(let i=0;i<count;i++){
  const kind=Math.floor(random()*6),radius=kind===0?between(15,37):between(7,24);let position,ok=false;
  for(let tries=0;tries<180;tries++){
   if(i<28)position=[between(-540,540),between(-170,240),between(-820,-130)];
   else {const a=between(0,Math.PI*2),r=between(280,1550);position=[Math.cos(a)*r,between(-280,340),Math.sin(a)*r];}
   if(safe(position,radius*1.7)){ok=true;break;}
  }
  if(!ok)continue;
  const body={position,radius,kind,seed:between(1,9999),name:syllables[i%syllables.length]+' '+(i+1),rings:(kind===0&&random()<.7)||(kind!==0&&random()<.12),tilt:between(-.6,.6)};bodies.push(body);
  const moons=1+Math.floor(random()*3);
  for(let j=0;j<moons;j++){
   const mr=between(1.1,4.4),a=between(0,Math.PI*2),orbit=radius*between(2.3,3.5)+j*9;
   const mp=[position[0]+Math.cos(a)*orbit,position[1]+between(-.5,.5)*orbit,position[2]+Math.sin(a)*orbit];
   if(safe(mp,mr))bodies.push({position:mp,radius:mr,kind:random()<.3?3:2,seed:between(1,9999),name:body.name+' / '+(j+1),moon:true,host:body.name});
  }
 }
 return bodies;
}
