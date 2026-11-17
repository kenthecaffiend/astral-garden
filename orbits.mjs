// Circular, host-centered paths with deterministic traffic control for dense scenes.
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const length=v=>Math.hypot(...v);
export function angularSpeed(mu,radius){return Math.sqrt(mu/Math.pow(Math.max(radius,1),3));}
function normalFor(offset,tilt){let n=[Math.sin(tilt),1,Math.cos(tilt)*.14];const projection=n.reduce((s,v,i)=>s+v*offset[i],0)/Math.max(1,length(offset)**2);n=n.map((v,i)=>v-projection*offset[i]);const l=length(n);return l>.0001?n.map(v=>v/l):[0,0,1];}
export function rotateOrbit(v,n,a){const c=Math.cos(a),s=Math.sin(a),dot=v.reduce((t,x,i)=>t+x*n[i],0),cross=[n[1]*v[2]-n[2]*v[1],n[2]*v[0]-n[0]*v[2],n[0]*v[1]-n[1]*v[0]];return v.map((x,i)=>x*c+cross[i]*s+n[i]*dot*(1-c));}
export function createOrbitSystem(bodies,stars,blackHole=[650,30,-350]){
 const root={id:'black-hole',type:'black-hole',position:[...blackHole],initial:[...blackHole],mu:18000,bodyRadius:380,parent:null,index:0,phase:0,renderPosition:[...blackHole]};const nodes=[root],byId=new Map([[root.id,root]]);
 function add(id,type,position,mu,parent,tilt,bodyRadius){const offset=sub(position,parent.initial),radius=length(offset);const n={id,type,initial:[...position],position:[...position],mu,parent:parent.id,parentIndex:parent.index,offset,radius,bodyRadius,axis:normalFor(offset,tilt),speed:angularSpeed(parent.mu,radius)*.35,index:nodes.length,phase:0,previousPhase:0,renderPosition:[...position]};nodes.push(n);byId.set(id,n);return n;}
 const stellar=stars.map((s,i)=>add('star-'+i,'star',s.position,s.mu??(5000+Math.pow(s.radius,3)*2),root,i*.17,s.radius));
 for(const b of bodies.filter(b=>!b.moon)){const host=stellar.reduce((best,s)=>length(sub(b.position,s.initial))<length(sub(b.position,best.initial))?s:best,stellar[0]);add(b.name,'planet',b.position,Math.pow(b.radius,3)*.008,host,(b.seed||0)*.001,b.radius);}
 for(const b of bodies.filter(b=>b.moon)){const host=byId.get(b.host);if(!host)throw new Error('Missing moon host: '+b.name);add(b.name,'moon',b.position,Math.pow(b.radius,3)*.008,host,(b.seed||0)*.001,b.radius);}
 const step=.05, rates=new Float64Array(nodes.length).fill(1);let tick=0,holds=0;
 function predict(dt,multipliers){const p=[root.position];for(let i=1;i<nodes.length;i++){const n=nodes[i],o=rotateOrbit(n.offset,n.axis,n.phase+n.speed*dt*multipliers[i]),host=p[n.parentIndex];p.push(o.map((v,k)=>v+host[k]));}return p;}
 // Swept spheres in a spatial hash: no endpoint-only tunnelling between accepted ticks.
 function collisions(from,to,padding=.08){const cells=new Map(),checked=new Set(),out=[],cellSize=96;
  for(let i=0;i<nodes.length;i++){const r=nodes[i].bodyRadius+padding,a=from[i],b=to[i];const lo=a.map((v,k)=>Math.floor((Math.min(v,b[k])-r)/cellSize)),hi=a.map((v,k)=>Math.floor((Math.max(v,b[k])+r)/cellSize));
   for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){const key=x+','+y+','+z;let bucket=cells.get(key);if(!bucket){bucket=[];cells.set(key,bucket);}for(const j of bucket){const pair=j*nodes.length+i;if(checked.has(pair))continue;checked.add(pair);const q=sub(from[i],from[j]),v=sub(sub(to[i],from[i]),sub(to[j],from[j]));const vv=v.reduce((s,n)=>s+n*n,0),t=vv>0?Math.max(0,Math.min(1,-q.reduce((s,n,k)=>s+n*v[k],0)/vv)):0;const d2=q.reduce((s,n,k)=>s+(n+v[k]*t)**2,0),limit=nodes[i].bodyRadius+nodes[j].bodyRadius+padding;if(d2<limit*limit)out.push([j,i]);}bucket.push(i);}
  }return out;
 }
 function branch(node,other){const ancestors=new Set();for(let i=other;i>0;i=nodes[i].parentIndex)ancestors.add(i);ancestors.add(0);const chain=[];for(let i=node;i>0&&!ancestors.has(i);i=nodes[i].parentIndex)chain.push(i);return chain;}
 function forecast(multipliers){const from=nodes.map(n=>n.position);let previous=from;const hits=[];for(const dt of [2,6,12]){const next=predict(dt,multipliers);hits.push(...collisions(previous,next,1.5));previous=next;}return hits;}
 function schedule(){rates.fill(1);for(let attempt=0;attempt<5;attempt++){const hits=forecast(rates);if(!hits.length)return;const [a,b]=hits[0];let best=null,bestScore=hits.length;for(const [one,other] of [[a,b],[b,a]]){const chain=branch(one,other);if(!chain.length)continue;const trial=rates.slice();for(const i of chain)trial[i]=0;const score=forecast(trial).length;if(score<bestScore){best=trial;bestScore=score;}}if(!best)return;rates.set(best);}}
 function reset(){tick=0;rates.fill(1);for(const n of nodes){n.phase=0;n.previousPhase=0;n.position.splice(0,3,...n.initial);}}
 return {nodes,byId,get heldTicks(){return holds;},update(time){const desired=Math.max(0,Math.floor((time+1e-8)/step));if(desired<tick)reset();while(tick<desired){if(tick%10===0)schedule();for(const n of nodes)n.previousPhase=n.phase;const before=nodes.map(n=>n.position.slice());let trial=rates.slice(),next=predict(step,trial),hits=collisions(before,next);
   // Freeze only involved phase chains first; the entire previous pose is the last resort.
   for(let attempt=0;hits.length&&attempt<4;attempt++){for(const [a,b] of hits){for(const i of branch(a,b))trial[i]=0;for(const i of branch(b,a))trial[i]=0;}next=predict(step,trial);hits=collisions(before,next);}
   if(!hits.length){for(let i=1;i<nodes.length;i++){nodes[i].phase+=nodes[i].speed*step*trial[i];nodes[i].position.splice(0,3,...next[i]);}}else holds++;
   tick++;
  }
  // Render one fixed step behind, interpolating phases around each moving host.
  const fraction=Math.max(0,Math.min(1,time/step-tick));
  for(let i=1;i<nodes.length;i++){const n=nodes[i],phase=n.previousPhase+(n.phase-n.previousPhase)*fraction,offset=rotateOrbit(n.offset,n.axis,phase),host=nodes[n.parentIndex].renderPosition;for(let k=0;k<3;k++)n.renderPosition[k]=host[k]+offset[k];}
 }};
}
