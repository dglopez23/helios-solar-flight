import * as THREE from './assets/three.module.js';
import {AU} from './physics.js';
// A screen-space optical response: the physical solar disk is never enlarged.
// The PSF and glare remain visible when the disk is smaller than a pixel.
export class SolarOptics{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.info={};}
 render(camera,ship,sun,bodies,filtered){
 const W=innerWidth,H=innerHeight,c=this.canvas;if(c.width!==W||c.height!==H){c.width=W;c.height=H;}const ctx=this.ctx;ctx.clearRect(0,0,W,H);
 const delta=sun.pos.clone().sub(ship),distance=delta.length(),dir=delta.clone().normalize(),local=dir.clone().applyQuaternion(camera.quaternion.clone().invert());
 const magnitude=-26.74+5*Math.log10(distance/AU),f=H/(2*Math.tan(camera.fov*Math.PI/360)),radius=f*sun.r/Math.sqrt(Math.max(1,distance*distance-sun.r*sun.r));
 this.info={distanceAU:distance/AU,magnitude,radiusPixels:radius,filtered,visible:false};if(local.z>=0)return;
 for(const b of bodies){if(b===sun)continue;const p=b.pos.clone().sub(ship),along=p.dot(dir);if(along>0&&along<distance&&p.lengthSq()-along*along<b.r*b.r)return;}
 const x=W/2+local.x/-local.z*f,y=H/2-local.y/-local.z*f,glare=Math.min(W*.5,Math.max(18,35+100/Math.sqrt(distance/AU))),halo=Math.max(radius*4,glare);
 if(x+halo<0||x-halo>W||y+halo<0||y-halo>H)return;this.info.visible=true;
 if(filtered){
 // Low-contrast extended corona under the automatic neutral-density camera filter.
 const g=ctx.createRadialGradient(x,y,radius,x,y,radius*3.5);g.addColorStop(0,'rgba(245,239,225,.09)');g.addColorStop(.35,'rgba(218,230,242,.018)');g.addColorStop(1,'rgba(218,230,242,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius*3.5,0,Math.PI*2);ctx.arc(x,y,radius,0,Math.PI*2,true);ctx.fill();return;
 }
 ctx.globalCompositeOperation='screen';const peak=Math.min(.8,.22+Math.max(0,(-magnitude-12)/20));const g=ctx.createRadialGradient(x,y,0,x,y,halo);g.addColorStop(0,`rgba(255,251,237,${peak})`);g.addColorStop(Math.min(.12,Math.max(.01,radius/halo)),`rgba(255,248,228,${peak*.65})`);g.addColorStop(.3,`rgba(215,235,255,${peak*.13})`);g.addColorStop(1,'rgba(255,244,224,0)');ctx.fillStyle=g;ctx.fillRect(x-halo,y-halo,halo*2,halo*2);
 // Saturated sensor point spread, distinct from the correctly scaled solar mesh.
 const core=Math.max(1.4,Math.min(6,2.5+(-magnitude-18)*.25),radius);ctx.fillStyle='#fffef9';ctx.beginPath();ctx.arc(x,y,core,0,Math.PI*2);ctx.fill();
 // Camera diffraction and veiling glare, informed by ISS photographs. These
 // streaks belong to the instrument response, not a kilometre-sized corona.
 if(radius<150){for(let ray=0;ray<24;ray++){const angle=ray*Math.PI/12+.14,length=glare*(ray%3===0?1.7:.7)+radius*2;for(let j=0;j<24;j++){const a=Math.max(core,j/24*length),b=Math.max(core,(j+1)/24*length),alpha=peak*.32*Math.pow(1-j/24,3);ctx.strokeStyle=`rgba(235,245,255,${alpha})`;ctx.lineWidth=Math.max(.5,4*Math.pow(1-j/24,2));ctx.beginPath();ctx.moveTo(x+Math.cos(angle)*a,y+Math.sin(angle)*a);ctx.lineTo(x+Math.cos(angle)*b,y+Math.sin(angle)*b);ctx.stroke();}}}
 const inner=ctx.createRadialGradient(x,y,core*.3,x,y,Math.max(core*2.5,9));inner.addColorStop(0,'rgba(255,255,255,.8)');inner.addColorStop(.35,'rgba(255,253,247,.45)');inner.addColorStop(1,'rgba(255,246,221,0)');ctx.fillStyle=inner;ctx.beginPath();ctx.arc(x,y,Math.max(core*2.5,9),0,Math.PI*2);ctx.fill();
 ctx.globalCompositeOperation='source-over';
 }
}
