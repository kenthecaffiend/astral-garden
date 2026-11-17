import * as T from './vendor/three.module.js';
// Shared by a world's surface, atmosphere, clouds and rings.
export const stellarLighting=`
uniform vec3 lightPositions[2];uniform vec3 lightColors[2];uniform float lightRadii[2];uniform vec4 occluders[4];
float visibility(vec3 point,vec3 source,float sourceRadius){vec3 ray=source-point;float len=length(ray);vec3 direction=ray/len;float result=1.;for(int i=0;i<4;i++){if(distance(occluders[i].xyz,source)<.01)continue;vec3 offset=occluders[i].xyz-point;float along=dot(offset,direction);if(occluders[i].w>0.&&along>0.&&along<len){float miss=length(offset-direction*along);float penumbra=max(.08,sourceRadius*along/len);result*=smoothstep(occluders[i].w-penumbra,occluders[i].w+penumbra,miss);}}return result;}
vec3 stellarIrradiance(vec3 normal,vec3 point){vec3 result=vec3(0.);for(int i=0;i<2;i++){vec3 direction=normalize(lightPositions[i]-point);result+=lightColors[i]*max(dot(normal,direction),0.)*visibility(point,lightPositions[i],lightRadii[i]);}return result;}`;
export function makeLightUniforms(){return {lightPositions:{value:[new T.Vector3(),new T.Vector3()]},lightColors:{value:[new T.Color(),new T.Color()]},lightRadii:{value:[1,1]},occluders:{value:Array.from({length:4},()=>new T.Vector4(0,0,0,0))}};}
export function updateLights(planets,sources){
 const blockers=[...planets.filter(b=>!b.mesh.userData.binary),...sources.filter(s=>s.mesh).map(s=>({mesh:s.mesh,radius:s.radius}))];
 for(const p of planets){if(!p.lighting)continue;const u=p.lighting,center=p.mesh.position;
  const ranked=sources.map(s=>({s,power:s.radius*s.radius/Math.max(100,center.distanceToSquared(s.position))})).sort((a,b)=>b.power-a.power);
  for(let i=0;i<2;i++){const {s,power}=ranked[i];u.lightPositions.value[i].copy(s.position);u.lightColors.value[i].copy(s.color).multiplyScalar(Math.min(i===0?1.4:.65,Math.max(i===0?.38:0,power*2200)));u.lightRadii.value[i]=s.radius;}
  // Only geometrically plausible blockers need fragment-side shadow tests.
  const candidates=[];for(const b of blockers){if(b===p)continue;const dx=b.mesh.position.x-center.x,dy=b.mesh.position.y-center.y,dz=b.mesh.position.z-center.z;let score=Infinity;for(let i=0;i<2;i++){const source=u.lightPositions.value[i],rx=source.x-center.x,ry=source.y-center.y,rz=source.z-center.z,len=Math.hypot(rx,ry,rz),along=(dx*rx+dy*ry+dz*rz)/len;if(along<=0||along>=len)continue;const miss=Math.hypot(dx-rx*along/len,dy-ry*along/len,dz-rz*along/len);if(miss<b.radius+p.radius+u.lightRadii.value[i]*along/len)score=Math.min(score,miss/(b.radius+p.radius));}if(Number.isFinite(score))candidates.push({b,score});}
  candidates.sort((a,b)=>a.score-b.score);for(let i=0;i<4;i++){const b=candidates[i]?.b;u.occluders.value[i].set(b?.mesh.position.x||0,b?.mesh.position.y||0,b?.mesh.position.z||0,b?.radius||0);}
 }
}
