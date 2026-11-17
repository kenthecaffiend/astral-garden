import * as T from './vendor/three.module.js';
import {rng,generateCatalog} from './generation.mjs';
import {planetVisibility} from './effects.mjs';
import {createNebulae} from './nebulae.js';
import {createOrbitSystem,angularSpeed} from './orbits.mjs';
import {stellarLighting,makeLightUniforms,updateLights} from './lighting.js';
import {createPhenomena} from './phenomena.js';
import {rockGeometry,rockMaterial} from './rocks.js';
const noise=`
float hash(vec3 p){p=fract(p*.3183099+.17);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.,a=.5;for(int i=0;i<6;i++){n+=noise(p)*a;p=p*2.04+vec3(4.7,9.2,1.3);a*=.5;}return n;}
float ridge(vec3 p){return 1.-abs(noise(p)*2.-1.);}
vec3 distanceSky(vec3 d){float lane=exp(-pow((d.y+.17*d.x+.09)*4.,2.));float n=fbm(d*7.+3.);float dust=fbm(d*26.+fbm(d*7.)*2.);float fil=pow(n,2.)*lane;vec3 c=vec3(.001,.002,.005)+fil*mix(vec3(.018,.035,.068),vec3(.09,.046,.07),dust);c*=1.-smoothstep(.5,.7,dust)*lane*.65;c+=pow(fbm(d*12.+30.),5.)*vec3(.055,.06,.12);return c;}

`;
const vert=`varying vec3 vP;varying vec3 vN;varying vec3 vW;void main(){vP=position;vN=normalize(mat3(modelMatrix)*normal);vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const planetVert=`varying vec3 vP;varying vec3 vN;varying vec3 vW;uniform float kind;uniform float seed;void main(){vec3 p=position;float detail=sin(p.x*61.+seed)*sin(p.y*57.)*sin(p.z*53.);if(kind>1.5)p*=1.+detail*.0025+sin(p.x*19.+seed)*sin(p.z*23.)*.003;if(abs(seed-420.)<.01)p*=1.-pow(max(0.,1.-abs(p.x+p.z*.35)*7.),3.)*.09;vP=p;vN=normalize(mat3(modelMatrix)*normal);vW=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`;
const surface=`varying vec3 vP;varying vec3 vN;varying vec3 vW;uniform float kind;uniform float seed;uniform float time;uniform vec3 tint;uniform vec3 gasDark;uniform vec3 gasLight;uniform vec3 appearance;uniform float fade;${noise}${stellarLighting}
void main(){vec3 sunDir=normalize(lightPositions[0]-vW);vec3 p=normalize(vP),q=p+vec3(seed*.012,seed*.007,seed*.019);vec3 N=normalize(vN),V=normalize(cameraPosition-vW);float ndl=dot(N,sunDir);float base=fbm(q*3.7),fine=fbm(q*52.);vec3 col=vec3(0.);float elevation=0.,water=0.;vec3 emission=vec3(0.);
 if(kind<.5){
 // Sheared, domain-warped weather: irregular cloud belts and a large cyclonic storm.
 float lat=p.y; q.x+=sin(lat*12.+time*.012)*.025;q.z+=time*.001;float shear=fbm(vec3(q.x*3.,lat*20.,q.z*3.));vec3 warp=vec3(fbm(q*4.),fbm(q*4.+8.),fbm(q*4.+19.));
 float weather=fbm(vec3(q.x*7.,lat*appearance.x+(shear-.5)*appearance.y,q.z*7.)+warp*3.);
 float belt=noise(vec3(lat*appearance.x*.28+shear*.6,seed*.1,0.));
 col=mix(gasDark,gasLight,smoothstep(.23,.76,belt));
 col=mix(col,mix(gasLight,vec3(1.),.25),smoothstep(.53,.7,weather)*.65);
 col*=.83+.28*weather;col+=vec3(.06,.047,.03)*(fine-.5);
 float lon=atan(p.z,p.x);vec2 storm=vec2((lon-appearance.z)*1.5,(lat+.26)*mix(2.5,7.,fract(seed*.37)));float sr=length(storm);float swirl=atan(storm.y,storm.x)+sr*14.;float stormMask=1.-smoothstep(.55,.9,sr);
 vec3 stormCol=mix(vec3(.38,.16,.075),vec3(.74,.48,.27),.5+.5*sin(swirl+weather*9.));col=mix(col,mix(stormCol,gasDark,.35),stormMask*.7);float softness=step(130.,appearance.x);col=mix(col,mix(gasDark,gasLight,.65+weather*.2),softness*.8);col*=tint*.73;elevation=weather*.02;
 }else if(kind<1.5){
 float terrain=fbm(q*3.4+vec3(base)*1.3);water=1.-smoothstep(.485,.502,terrain);float shore=smoothstep(.5,.55,terrain);float mountains=smoothstep(.58,.72,terrain+fine*.09);
 vec3 land=mix(vec3(.30,.27,.12),vec3(.08,.19,.10),shore);land=mix(land,vec3(.33,.32,.27),mountains);col=mix(land,vec3(.006,.041,.075),water);col=mix(col,vec3(.015,.15,.18),water*(1.-smoothstep(.47,.49,terrain))*.2);elevation=terrain;
 float ice=smoothstep(.79,.95,abs(p.y)+(base-.5)*.15);col=mix(col,vec3(.72,.83,.87),ice);water*=1.-ice;
 // Broken cloud shadows and reflected sunlight on the oceans.
 float shadow=smoothstep(.48,.69,fbm(q*12.+sunDir*.03+vec3(time*.0012,0.,0.)));col*=1.-shadow*.24;
 float spec=pow(max(dot(reflect(-sunDir,N),V),0.),80.)*water;emission+=lightColors[0]*spec*max(ndl,0.)*visibility(vW,lightPositions[0],lightRadii[0]);
 }else if(kind<2.5){
 // Craters across several scales, with recessed floors and raised rims.
 float crater=0.;for(int i=0;i<32;i++){float k=float(i)+seed;vec3 c=normalize(vec3(hash(vec3(k,1,7)),hash(vec3(k,9,2)),hash(vec3(k,3,8)))*2.-1.);float radius=.035+.17*hash(vec3(k,5,1));float d=length(p-c)/radius;crater+=-.05*exp(-pow(d*1.12,4.))+.027*exp(-pow((d-1.)*9.,2.));}
 elevation=base*.2+fine*.06+crater;col=mix(vec3(.19,.175,.16),vec3(.49,.46,.42),base);col*=.75+fine*.45;col*=1.+crater*2.;col*=tint;if(abs(seed-420.)<.01){float crack=pow(max(0.,1.-abs(p.x+p.z*.35)*7.),3.);col*=1.-crack*.93;}
 }else if(kind<3.5){
 float fissure=pow(1.-abs(fbm(q*9.)*2.-1.),22.);elevation=base*.1+fine*.03;col=mix(vec3(.10,.24,.33),vec3(.66,.81,.85),smoothstep(.25,.74,base));col*=1.-fissure*.3;col*=.87+fine*.22;
 }else if(kind<4.5){
 float f=fbm(q*6.);float crack=pow(1.-abs(f*2.-1.),45.);elevation=f*.2+fine*.08;col=mix(vec3(.024,.018,.019),vec3(.15,.11,.09),fine);emission=vec3(3.8,.55,.035)*crack*(.75+.25*sin(time*.4+f*20.));
 }else{float dunes=sin(q.y*180.+fbm(q*8.)*40.);elevation=base*.25+fine*.08;col=mix(vec3(.22,.075,.035),vec3(.64,.38,.17),base);col*=.84+.2*fine+.035*dunes;col*=tint;}
 // Derivative bump mapping gives detail a lighting response, instead of a flat painted pattern.
 vec3 dp1=dFdx(vW),dp2=dFdy(vW),r1=cross(dp2,N),r2=cross(N,dp1);float det=dot(dp1,r1);vec3 grad=sign(det)*(dFdx(elevation)*r1+dFdy(elevation)*r2);N=normalize(abs(det)*N-grad*(kind<.5?.12:1.8));ndl=dot(N,sunDir);
 float light=max(ndl,0.);vec3 irradiance=stellarIrradiance(N,vW);col*=vec3(.008,.011,.018)+irradiance*1.55;col+=emission;float fres=pow(1.-max(dot(N,V),0.),5.);if(kind<1.5||kind>2.5&&kind<3.5)col+=vec3(.08,.19,.32)*fres*smoothstep(-.2,.5,ndl)*.35;
 if(kind<1.5){float night=1.-smoothstep(-.2,.2,ndl);float pulse=pow(max(0.,sin(time*2.1+seed)),28.);float storm=pow(noise(q*23.),18.);col+=vec3(.35,.5,1.)*pulse*storm*night*8.;}
 if(fade<.999)col=mix(distanceSky(normalize(vW-cameraPosition)),col,fade);gl_FragColor=vec4(col,1.);
}`;
const atmosphere=`varying vec3 vP;varying vec3 vN;varying vec3 vW;uniform vec3 glow;uniform float fade;uniform float time;uniform float seed;${noise}${stellarLighting}void main(){vec3 sunDir=normalize(lightPositions[0]-vW);vec3 N=normalize(vN),V=normalize(cameraPosition-vW);float rim=pow(1.-abs(dot(N,V)),3.5);float day=smoothstep(-.28,.6,dot(N,sunDir));float sunset=exp(-pow(dot(N,sunDir)*5.,2.));vec3 c=mix(glow,vec3(.72,.22,.06),sunset*.4);float a=rim*day*.57;float latitude=abs(normalize(vP).y);float curtain=exp(-pow((latitude-.86)*36.,2.));float ribbon=.4+.6*sin(atan(vP.z,vP.x)*45.+time*.7+fbm(vP*9.)*10.);float aurora=curtain*ribbon*pow(1.-abs(dot(N,V)),1.5)*(1.-day);c=c*lightColors[0]*1.25+mix(vec3(.05,1.3,.6),vec3(.45,.08,1.),latitude)*aurora*1.8;a+=aurora*.3;gl_FragColor=vec4(c,a*fade);}`;
const clouds=`varying vec3 vP;varying vec3 vN;varying vec3 vW;uniform float seed;uniform float time;uniform float fade;${noise}${stellarLighting}void main(){vec3 sunDir=normalize(lightPositions[0]-vW);vec3 p=normalize(vP);vec3 q=p*5.+seed*.013;vec3 w=vec3(fbm(q),fbm(q+7.),fbm(q+19.));float n=fbm(q*3.+w*2.+vec3(time*.003,0,0));float detail=fbm(q*15.);float alpha=smoothstep(.48,.69,n+detail*.035)*.88;float d=max(dot(normalize(vN),sunDir),0.);gl_FragColor=vec4(vec3(.87,.91,1.)*(vec3(.012)+stellarIrradiance(normalize(vN),vW)*1.5),alpha*fade);}`;
const ringFragment=`varying vec3 vP;varying vec3 vN;varying vec3 vW;uniform float inner;uniform float outer;uniform float radius;uniform float seed;uniform vec3 center;uniform vec3 tint;uniform float fade;${noise}${stellarLighting}
void main(){vec3 sunDir=normalize(lightPositions[0]-vW);float r=length(vP.xy),u=(r-inner)/(outer-inner);float density=noise(vec3(r*7.,seed,0.))*.5+noise(vec3(r*41.,seed,0.))*.3+.2;float broad=noise(vec3(r*.65,seed,0.));density*=.35+.65*broad;float gap=1.-.95*exp(-pow((u-.61)*95.,2.));gap*=1.-.6*exp(-pow((u-.85)*100.,2.));float edge=smoothstep(0.,.02,u)*(1.-smoothstep(.97,1.,u));vec3 rel=vW-center;float along=dot(rel,sunDir);float shadow=1.;if(along<0.)shadow=smoothstep(radius*.96,radius*1.02,length(rel-sunDir*along));vec3 col=mix(vec3(.26,.23,.21),vec3(.76,.69,.57),broad)*tint;col*=mix(vec3(.025),lightColors[0]*1.25,shadow*visibility(vW,lightPositions[0],lightRadii[0]));gl_FragColor=vec4(col,density*gap*edge*.9*fade);}`;
const blackFragment=`varying vec3 vW;uniform vec3 center;uniform float time;uniform float steps;uniform sampler2D backdrop;uniform sampler2D sceneDepth;uniform vec2 viewport;uniform mat4 projectionView;uniform vec3 viewForward;uniform float nearPlane;uniform float farPlane;${noise}
vec3 space(vec3 d){float lane=exp(-pow((d.y+.23*d.x)*3.,2.));float n=fbm(d*5.+3.);vec3 c=vec3(.001,.002,.006)+pow(n,3.)*lane*vec3(.08,.05,.14);vec3 cell=floor(d*620.);float star=pow(hash(cell),1000.)*.7;return c+vec3(star);}
void main(){vec3 ro=cameraPosition-center,rd=normalize(vW-cameraPosition);float bound=112.;float b=dot(ro,rd),c=dot(ro,ro)-bound*bound,disc=b*b-c;if(disc<0.)discard;float nearT=max(0.,-b-sqrt(disc));vec2 screenUV=gl_FragCoord.xy/viewport;float z=texture2D(sceneDepth,screenUV).r;float opaqueDistance=nearPlane*farPlane/(farPlane-z*(farPlane-nearPlane))/max(.001,dot(rd,viewForward));if(opaqueDistance<nearT)discard;vec3 p=ro+rd*(nearT+.02);vec3 color=vec3(0.);float trans=1.;float captured=0.;
 // Integrate curved light paths. Disk volume is sampled only near its plane.
 for(int i=0;i<110;i++){if(float(i)>=steps)break;float r=length(p);if(r<17.8){captured=1.;break;}if(r>113.)break;
 float ds=clamp((r-17.)*.16,.55,3.6)*(110./steps);vec3 accel=-p/(r*r*r)*16.;vec3 nextD=normalize(rd+accel*ds);vec3 nextP=p+nextD*ds;
 float y=p.y*.988-p.z*.156;float ny=nextP.y*.988-nextP.z*.156;float planeDist=min(abs(y),abs(ny));
 if(planeDist<1.6||y*ny<0.){
  float crossing=clamp(y/(y-ny+.00001),0.,1.);vec3 sampleP=mix(p,nextP,crossing);float rr=length(sampleP.xz);float a=atan(sampleP.z,sampleP.x);
  if(rr>25.&&rr<88.){float speed=11./sqrt(rr);vec3 flow=vec3(cos(a-time*speed*.075),rr*.11,sin(a-time*speed*.075));float turbulence=fbm(flow*vec3(8.,2.,8.));float filaments=.35+.65*pow(.5+.5*sin(rr*5.7+turbulence*12.+a*3.),2.);float radial=smoothstep(25.,30.,rr)*(1.-smoothstep(65.,88.,rr));float vertical=exp(-planeDist*planeDist/.35);if(y*ny<0.)vertical=1.;float density=radial*(.3+turbulence)*filaments*vertical;
   float temperature=pow(30./rr,1.7);vec3 heat=mix(vec3(.9,.09,.012),vec3(2.2,1.05,.33),temperature);float doppler=clamp(1.+sampleP.x/rr*.55,.35,1.7);float optical=1.-exp(-density*ds*.75);color+=heat*doppler*optical*trans*.55;trans*=1.-optical*.7;
  }
 }
 p=nextP;rd=nextD;
 }
 // Limit backdrop distortion to a 30% smaller radius without trimming the luminous disk.
 float impact=length(cross(ro,normalize(vW-cameraPosition)));
 float lensFade=1.-smoothstep(38.5,75.6,impact);
 if(captured<.5){vec4 projected=projectionView*vec4(center+p+rd*5000.,1.);vec2 bentUV=projected.xy/max(.001,projected.w)*.5+.5;float valid=step(.001,projected.w)*smoothstep(0.,.025,bentUV.x)*smoothstep(0.,.025,bentUV.y)*(1.-smoothstep(.975,1.,bentUV.x))*(1.-smoothstep(.975,1.,bentUV.y));vec2 sampleUV=mix(screenUV,clamp(bentUV,vec2(.001),vec2(.999)),valid*lensFade);float sampleZ=texture2D(sceneDepth,sampleUV).r;float sampleDistance=nearPlane*farPlane/(farPlane-sampleZ*(farPlane-nearPlane));if(sampleDistance<max(0.,dot(center-cameraPosition,viewForward)-112.))sampleUV=screenUV;color+=texture2D(backdrop,sampleUV).rgb*trans;}
 // Photon-ring glow is produced by near-captured curved rays; a fine rim reinforces it.
 float ring=0.;color+=vec3(1.9,.88,.24)*ring*.32;
 float edgeFade=1.-smoothstep(55.,108.,impact);gl_FragColor=vec4(color*edgeFade,edgeFade);
}`;

export function createCosmos(scene,renderer,camera,worldSeed){
 const random=rng(worldSeed),range=(a,b)=>a+(b-a)*random();const catalog=generateCatalog(worldSeed);const planets=[],rings=[],cloudLayers=[];const group=new T.Group();scene.add(group);
 const gasPalettes=[[[.24,.13,.075],[.77,.65,.46]],[[.045,.12,.24],[.28,.56,.75]],[[.26,.065,.035],[.72,.32,.16]],[[.035,.15,.14],[.32,.65,.52]],[[.17,.10,.24],[.56,.43,.68]],[[.24,.23,.19],[.82,.8,.66]]];
 const visualStyles=new Map();for(const b of catalog){if(b.kind!==0)continue;const nearest=catalog.filter(n=>n.kind===0&&visualStyles.has(n.name)).sort((a,c)=>Math.hypot(...a.position.map((v,k)=>v-b.position[k]))-Math.hypot(...c.position.map((v,k)=>v-b.position[k]))).slice(0,3);let style=b.featured?0:Math.floor(b.seed)%6;for(let i=0;i<6&&nearest.some(n=>visualStyles.get(n.name)===style);i++)style=(style+1)%6;visualStyles.set(b.name,style);}
 const geometries=[new T.SphereGeometry(1,112,72),new T.SphereGeometry(1,48,32),new T.SphereGeometry(1,24,16)];
 function addPlanet(body){const {radius,kind,seed}=body;const fade={value:1},lighting=makeLightUniforms();const tint=new T.Color().setHSL((seed*.001)%1,.10, .78);if(body.featured)tint.setRGB(1,1,1);
  const style=visualStyles.get(body.name)||0,palette=gasPalettes[style];
  const material=new T.ShaderMaterial({uniforms:{gasDark:{value:new T.Color(...palette[0])},gasLight:{value:new T.Color(...palette[1])},appearance:{value:new T.Vector3([90,145,42,66,115,28][style],[7,3,12,9,5,15][style],(seed*.13)%5-2.5)},...lighting,fade,kind:{value:kind},seed:{value:seed},time:{value:0},tint:{value:tint}},vertexShader:planetVert,fragmentShader:surface});const mesh=new T.Mesh(geometries[body.featured?0:2],material);mesh.position.fromArray(body.position);mesh.scale.setScalar(radius);mesh.rotation.z=body.tilt||.16;group.add(mesh);const item={mesh,radius,material,body,lighting};planets.push(item);
  if(kind===0||kind===1||kind===3||kind===5){const glow=kind===0?new T.Color(.42,.35,.23):kind===5?new T.Color(.65,.25,.1):new T.Color(.12,.4,.9);const atmo=new T.Mesh(geometries[1],new T.ShaderMaterial({uniforms:{...lighting,fade,time:material.uniforms.time,seed:{value:seed},glow:{value:glow}},vertexShader:vert,fragmentShader:atmosphere,transparent:true,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending}));atmo.scale.setScalar(1.025);mesh.add(atmo);}
  if(kind===1){const cl=new T.Mesh(geometries[1],new T.ShaderMaterial({uniforms:{...lighting,fade,seed:{value:seed},time:{value:0}},vertexShader:vert,fragmentShader:clouds,transparent:true,depthWrite:false}));cl.scale.setScalar(1.009);mesh.add(cl);cloudLayers.push(cl);}
  if(body.rings){const inner=radius*1.32,outer=radius*(body.featured?2.3:range(1.9,2.6));const r=new T.Mesh(new T.RingGeometry(inner,body.featured?outer:inner+(outer-inner)*(.35+((seed*.17)%1)*.65),180),new T.ShaderMaterial({uniforms:{...lighting,fade,inner:{value:inner},outer:{value:body.featured?outer:inner+(outer-inner)*(.35+((seed*.17)%1)*.65)},radius:{value:radius},center:{value:mesh.position.clone()},seed:{value:seed},tint:{value:tint}},vertexShader:vert,fragmentShader:ringFragment,transparent:true,depthWrite:false,side:T.DoubleSide}));r.position.copy(mesh.position);r.rotation.set(-Math.PI/2+.25,body.featured?-.28:range(-.5,.5),body.tilt||.2);r.userData.planet=mesh;group.add(r);rings.push(r);}
  return mesh;
 }
 for(const b of catalog)addPlanet(b);
 const aurelia=planets[0].mesh,ocean=planets[1].mesh;
 const horizon=new T.Object3D();horizon.position.set(650,30,-350);group.add(horizon);
 const blackhole=new T.Mesh(new T.SphereGeometry(112,64,48),new T.ShaderMaterial({uniforms:{center:{value:horizon.position.clone()},time:{value:0},steps:{value:110}},vertexShader:vert,fragmentShader:blackFragment,side:T.BackSide,transparent:true,premultipliedAlpha:true,depthWrite:false}));blackhole.position.copy(horizon.position);blackhole.renderOrder=10;group.add(blackhole);
 // Smooth point sprites and a volumetric-looking galactic dust lane.
 const starGeometry=new T.BufferGeometry(),sp=[],sc=[],sizes=[];
 for(let i=0;i<23000;i++){const a=range(0,Math.PI*2),z=i<15000?range(-.24,.24):range(-1,1),r=range(2700,7800),s=Math.sqrt(1-z*z);sp.push(Math.cos(a)*s*r,z*r,Math.sin(a)*s*r);const c=new T.Color().setHSL(range(.05,.7),range(.08,.35),range(.45,.9));sc.push(c.r,c.g,c.b);sizes.push(random()<.02?range(3,5):range(.7,1.7));}
 starGeometry.setAttribute('position',new T.Float32BufferAttribute(sp,3));starGeometry.setAttribute('color',new T.Float32BufferAttribute(sc,3));starGeometry.setAttribute('size',new T.Float32BufferAttribute(sizes,1));
 const starMaterial=new T.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{pixelRatio:{value:1}},vertexShader:'attribute float size;varying vec3 col;uniform float pixelRatio;void main(){col=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*pixelRatio;}',fragmentShader:'varying vec3 col;void main(){float d=length(gl_PointCoord-.5)*2.;float a=exp(-d*d*4.);if(d>1.)discard;gl_FragColor=vec4(col*1.35,a);}' });group.add(new T.Points(starGeometry,starMaterial));
 const sky=new T.Mesh(new T.SphereGeometry(10000,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:vert,fragmentShader:`varying vec3 vP;${noise}void main(){vec3 d=normalize(vP);float lane=exp(-pow((d.y+.17*d.x+.09)*4.,2.));float n=fbm(d*7.+3.);float dust=fbm(d*26.+fbm(d*7.)*2.);float fil=pow(n,2.)*lane;vec3 c=vec3(.001,.002,.005)+fil*mix(vec3(.018,.035,.068),vec3(.09,.046,.07),dust);c*=1.-smoothstep(.5,.7,dust)*lane*.65;c+=pow(fbm(d*12.+30.),5.)*vec3(.055,.06,.12);gl_FragColor=vec4(c,1.);}`}));group.add(sky);
 function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(.07,'rgba(255,255,255,.35)');g.addColorStop(.3,'rgba(255,255,255,.09)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(c);}const glow=glowTexture();
 // Keep existing seeded stars and debris stable while replacing the old clouds.
 for(let i=0;i<480;i++)random();
 const nebulaStats=createNebulae(group,worldSeed);
 // Massive stars host the planetary systems and orbit the central black hole.
 const suns=[];for(let i=0;i<11;i++){let p=i===0?[-380,230,-950]:[range(-1300,1400),range(-230,360),range(-1500,1000)];if(i===9)p=[-1900,350,-700];if(i===10)p=[1700,400,-1400];const radius=i===9?3:i===10?45:range(5,12),color=new T.Color(i%3===0?0xffaf55:i%3===1?0x95c9ff:0xffe1a1);for(let attempt=0;attempt<100;attempt++){const safe=catalog.every(b=>Math.hypot(...p.map((x,k)=>x-b.position[k]))>radius+b.radius+20)&&suns.every(s=>s.position.distanceTo(new T.Vector3(...p))>s.scale.x+radius+20)&&new T.Vector3(...p).distanceTo(horizon.position)>radius+430;if(safe)break;p=[range(-1300,1400),range(-230,360),range(-1500,1000)];}const m=new T.Mesh(geometries[1],new T.ShaderMaterial({uniforms:{color:{value:color},time:{value:0}},vertexShader:vert,fragmentShader:`varying vec3 vP;varying vec3 vN;varying vec3 vW;uniform vec3 color;uniform float time;${noise}void main(){float n=fbm(vP*14.+time*.018);float rim=pow(max(dot(normalize(vN),normalize(cameraPosition-vW)),0.),.35);gl_FragColor=vec4(color*(1.4+n*2.4)*(.35+rim*.65),1.);}`}));m.position.fromArray(p);m.scale.setScalar(radius);group.add(m);suns.push(m);m.userData.pulsar=i===9;m.userData.binary=i===10;const corona=new T.Sprite(new T.SpriteMaterial({map:glow,color,blending:T.AdditiveBlending,opacity:.8,depthWrite:false}));corona.position.copy(m.position);corona.scale.setScalar(radius*15);group.add(corona);m.userData.corona=corona;planets.push({mesh:m,radius,material:null,body:{star:true}});}
 const orbitSystem=createOrbitSystem(catalog,suns.map(s=>({position:s.position.toArray(),radius:s.scale.x,mu:s.userData.binary?14000:undefined})),horizon.position.toArray());
 const phenomena=createPhenomena(group,suns,horizon,glow,worldSeed);
 const planetByName=new Map(planets.filter(p=>p.material).map(p=>[p.body.name,p.mesh]));
 phenomena.setShatteredHost(planetByName.get('Shallows Core'));
 const laneHosts=['Shallows Core','Aurelia','Pelagia','black-hole','star-4','Signal Prime'];
 const orbitalPosition=name=>orbitSystem.byId.get(name).renderPosition;
 const laneCenter=i=>orbitalPosition(laneHosts[i]);
 // Multiple debris lanes rather than one isolated asteroid scene.
 const geo=rockGeometry(2);
 const rockMat=rockMaterial();const asteroidCount=4200,belt=new T.InstancedMesh(geo,rockMat,asteroidCount),dummy=new T.Object3D(),rocks=[];
 const lanes=laneHosts.map((_,i)=>[...laneCenter(i),[80,105,125,540,210,145][i]]);
 for(let i=0;i<asteroidCount;i++){const lane=lanes[i%lanes.length],a=range(0,Math.PI*2),r=lane[3]+range(-22,48),size=random()<.03?range(3,6):range(.18,1.9);dummy.position.set(lane[0]+Math.cos(a)*r,lane[1]+range(-14,14),lane[2]+Math.sin(a)*r);dummy.rotation.set(range(0,6),range(0,6),range(0,6));dummy.scale.set(size,size*.78,size*1.12);dummy.updateMatrix();belt.setMatrixAt(i,dummy.matrix);belt.setColorAt(i,new T.Color().setHSL(.08,.08,range(.25,.55)));rocks.push({lane:i%lanes.length,angle:a,orbitalRadius:r,height:dummy.position.y-lane[1],size,rot:random()*6,speed:angularSpeed(orbitSystem.byId.get(laneHosts[i%lanes.length]).mu,r)});}belt.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(belt);const nearBelt=new T.InstancedMesh(rockGeometry(7),rockMat,160);nearBelt.instanceMatrix.setUsage(T.DynamicDrawUsage);nearBelt.count=0;group.add(nearBelt);const rockColor=new T.Color();
 const pgeo=new T.BufferGeometry(),pp=[],dustOrbits=[];for(let i=0;i<6500;i++){const l=lanes[i%6],a=range(0,6.283),r=l[3]+range(-40,70);const height=range(-20,20);pp.push(l[0]+Math.cos(a)*r,l[1]+height,l[2]+Math.sin(a)*r);dustOrbits.push({lane:i%6,angle:a,radius:r,height,speed:angularSpeed(orbitSystem.byId.get(laneHosts[i%6]).mu,r)});}pgeo.setAttribute('position',new T.Float32BufferAttribute(pp,3));group.add(new T.Points(pgeo,new T.PointsMaterial({color:0x8a919b,size:.2,transparent:true,opacity:.4,depthWrite:false})));
 const stats={worlds:catalog.filter(b=>!b.moon).length,moons:catalog.filter(b=>b.moon).length,asteroids:asteroidCount,stars:23000,suns:suns.length,nebulae:nebulaStats.regions};let previousLightTime=-1;
 return {planets,aurelia,ocean,horizon,blackhole,glowTexture:glow,stats,catalog,orbitSystem,phenomena,suns,volumeState:nebulaStats.volumeState,
 bodyPosition(name){return planetByName.get(name)?.position;},
 destinationOffset(index){const names={0:'Aurelia',2:'Pelagia',3:'Shallows Core',5:'Signal Prime'},name=names[index];if(!name)return new T.Vector3();const b=catalog.find(b=>b.name===name);return planetByName.get(name).position.clone().sub(new T.Vector3(...b.position));},
 advance(time){orbitSystem.update(time);for(const p of planets){if(p.material)p.mesh.position.fromArray(orbitalPosition(p.body.name));}suns.forEach((s,i)=>{s.position.fromArray(orbitalPosition('star-'+i));s.userData.corona.position.copy(s.position);});rings.forEach(r=>{r.position.copy(r.userData.planet.position);r.material.uniforms.center.value.copy(r.position);});},
 setQuality(q){blackhole.material.uniforms.steps.value=q<1?76:110;starMaterial.uniforms.pixelRatio.value=renderer.getPixelRatio();nebulaStats.setQuality(q);},
 update(time,camera){
  phenomena.update(time);nebulaStats.update(time,camera);if(time-previousLightTime>.15){updateLights(planets,phenomena.lightSources(suns));previousLightTime=time;}
  for(const item of planets){const {mesh,material,body,radius}=item;if(!material)continue;material.uniforms.time.value=time;material.uniforms.fade.value=planetVisibility(camera.position.distanceTo(mesh.position),radius);mesh.visible=material.uniforms.fade.value>.001;mesh.rotation.y=time*(body.moon?.006:.009)+(body.seed||0);const angular=radius/camera.position.distanceTo(mesh.position);mesh.geometry=geometries[angular>.11?0:angular>.025?1:2];}
  rings.forEach(r=>r.visible=r.userData.planet.visible);
  cloudLayers.forEach(c=>{c.material.uniforms.time.value=time;c.rotation.y=time*.004;});suns.forEach(s=>s.material.uniforms.time.value=time);blackhole.material.uniforms.time.value=time;
  {let nearCount=0;for(let i=0;i<rocks.length;i++){const r=rocks[i];const c=laneCenter(r.lane),a=r.angle+time*r.speed*.35;dummy.position.set(c[0]+Math.cos(a)*r.orbitalRadius,c[1]+Math.sin(a)*r.height,c[2]+Math.sin(a)*Math.sqrt(r.orbitalRadius*r.orbitalRadius-r.height*r.height));dummy.rotation.set(r.rot+time*.025,r.rot+time*.014,r.rot);const clearance=dummy.position.distanceTo(horizon.position)>400?r.size:0;dummy.scale.set(clearance,clearance*.78,clearance*1.12);dummy.updateMatrix();const detailed=clearance>0&&r.size/Math.max(1,camera.position.distanceTo(dummy.position))>.018&&nearCount<160;if(detailed){nearBelt.setMatrixAt(nearCount,dummy.matrix);belt.getColorAt(i,rockColor);nearBelt.setColorAt(nearCount++,rockColor);dummy.scale.setScalar(0);dummy.updateMatrix();}belt.setMatrixAt(i,dummy.matrix);}nearBelt.count=nearCount;nearBelt.instanceMatrix.needsUpdate=true;if(nearBelt.instanceColor)nearBelt.instanceColor.needsUpdate=true;nearBelt.computeBoundingSphere();belt.instanceMatrix.needsUpdate=true;const points=pgeo.attributes.position;for(let i=0;i<dustOrbits.length;i++){const d=dustOrbits[i],c=laneCenter(d.lane),a=d.angle+time*d.speed*.35;points.setXYZ(i,c[0]+Math.cos(a)*d.radius,c[1]+Math.sin(a)*d.height,c[2]+Math.sin(a)*Math.sqrt(d.radius*d.radius-d.height*d.height));}for(let i=0;i<points.count;i++){const dx=points.getX(i)-horizon.position.x,dy=points.getY(i)-horizon.position.y,dz=points.getZ(i)-horizon.position.z;if(Math.hypot(dx,dy,dz)<400)points.setXYZ(i,10000,10000,10000);}points.needsUpdate=true;pgeo.computeBoundingSphere();belt.computeBoundingSphere();}
 }
 };
}
