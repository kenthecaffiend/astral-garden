import * as T from './vendor/three.module.js';
import {rng} from './generation.mjs';
import {createNebulaVolumes} from './volumes.js';

// Reusable, seeded cloud textures keep the extra depth inexpensive to render.
function cloudTexture(seed){
 const size=192,data=new Uint8Array(size*size*4);
 const hash=(x,y)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
 function fbm(x,y){let value=0,amp=.5;for(let i=0;i<5;i++){value+=noise(x,y)*amp;x=x*2.04+8.7;y=y*2.04+3.9;amp*=.5;}return value;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x/(size-1)-.5)*2,v=(y/(size-1)-.5)*2,r=Math.hypot(u,v);
  const warp=fbm(u*2+12,v*2+9),n=fbm(u*4+warp*2+21,v*4+warp*3+6);
  const lane=fbm(u*8+19,v*8-3),envelope=Math.pow(Math.max(0,1-r*r),1.7);
  const density=Math.pow(Math.max(0,(n-.22)*1.65),1.35)*(1-Math.max(0,lane-.54)*2.8);
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.min(1,density*envelope)*255);
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function createNebulae(parent,seed){
 const random=rng(seed^0x72bb98),range=(a,b)=>a+(b-a)*random();
 const textures=Array.from({length:4},(_,i)=>cloudTexture((seed+i*314159)>>>0));
 const palettes=[
  [0x765de8,0xe04891,0x39cbd3], // violet, rose, cyan
  [0x227ec4,0x43d5b4,0x9a74e6], // blue, jade, lavender
  [0xd97832,0xecb660,0xb53e79], // copper, gold, magenta
  [0xb94275,0x7347c0,0x3a8ab6], // crimson, purple, azure
  [0x326c9f,0x59b6cf,0xd7779e], // teal, ice, pink
 ];
 const regions=[
  [420,180,450,0,1],[-750,150,-900,1,1.5],[850,-180,-1000,2,1.7],
  [-260,190,-550,0,1.25],[330,-140,-700,1,1.5],[-600,-160,-500,2,1.4],
 ];
 for(let i=0;i<12;i++){const a=i*Math.PI*2/12+range(-.18,.18),r=range(900,1900);regions.push([Math.cos(a)*r,range(-320,380),Math.sin(a)*r,i%palettes.length,range(1.3,2.1)]);}
 for(const [cx,cy,cz,palette,scale] of regions){
  const colors=palettes[palette];
  for(let i=0;i<22;i++){
   const a=i*.58+range(-.2,.2),spread=range(35,145)*scale;
   const color=new T.Color(colors[Math.floor(i/4)%3]);color.lerp(new T.Color(colors[(Math.floor(i/4)+1)%3]),range(0,.28));
   const sprite=new T.Sprite(new T.SpriteMaterial({map:textures[i%4],color,transparent:true,opacity:range(.19,.34),blending:T.AdditiveBlending,depthWrite:false,rotation:range(0,Math.PI*2)}));
   sprite.position.set(cx+Math.cos(a)*spread,cy+Math.sin(a)*spread*.48,cz+range(-95,65)*scale);
   const width=range(160,270)*scale;sprite.scale.set(width,width*range(.6,1.05),1);parent.add(sprite);
  }
 }
 const volumes=createNebulaVolumes(parent,seed);return {regions:regions.length,clouds:regions.length*22,...volumes};
}
