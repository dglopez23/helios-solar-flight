// Schwarzschild exterior. Kilometres, seconds; local speed measured by static observers.
import {C} from './physics.js';
export const G=6.67430e-20, SOLAR_MASS=1.98847e30;
export const BH_MASS=1e6*SOLAR_MASS, RS=2*G*BH_MASS/(C*C);
export const REF_RADIUS=1000, MIN_RADIUS=1.01, BH_MAX_SPEED=.995*C;
export const lapse=r=>Math.sqrt(1-1/Math.max(MIN_RADIUS,r));
export const lorentz=v=>1/Math.sqrt(1-Math.min(.995,Math.abs(v)/C)**2);
export function rates(r,v=0){const player=lapse(r)/lorentz(v),reference=lapse(REF_RADIUS);return {player,reference,ratio:reference/player};}
export function holdingAcceleration(r){return C*C/(2*RS*r*r*lapse(r))*1000;}
export function tidalAcceleration(r,lengthMetres=2){return C*C/(RS*RS*r*r*r)*lengthMetres;}
// Tortoise-coordinate difference: exact radial light travel time between static radii.
export function radialLightDelay(r){return RS/C*Math.abs(REF_RADIUS-r+Math.log((REF_RADIUS-1)/(Math.max(MIN_RADIUS,r)-1)));}
export function signalAt(coordinateTime,position,velocity){
 const r=Math.hypot(...position)/RS,n=position.map(x=>x/(r*RS));
 const v=Math.hypot(...velocity),radial=velocity.reduce((s,x,i)=>s+x*n[i],0)/C;
 const direction=r<REF_RADIUS?1:-1;
 return {emissionTime:(coordinateTime-radialLightDelay(r))*lapse(REF_RADIUS),delay:radialLightDelay(r),frequency:lapse(REF_RADIUS)/lapse(r)*lorentz(v)*(1+direction*radial)};
}
export function boundaryFraction(start,end,radius=MIN_RADIUS*RS){
 const d=end.map((x,i)=>x-start[i]),a=d.reduce((s,x)=>s+x*x,0);
 if(!a)return null;
 const b=2*start.reduce((s,x,i)=>s+x*d[i],0),c=start.reduce((s,x)=>s+x*x,0)-radius*radius,disc=b*b-4*a*c;
 if(disc<0)return null;
 const t=(-b-Math.sqrt(disc))/(2*a);
 return t>=-1e-10&&t<=1?Math.max(0,t):null;
}
// Input duration is player proper time. Convert local velocity using the spatial metric.
// Assisted propulsion holds the commanded velocity; this is deliberately not free fall.
export function advanceObserver(position,direction,speed,properSeconds){
 let p=[...position],coordinate=0,remaining=Math.max(0,properSeconds),hit=false,v=Math.min(BH_MAX_SPEED,Math.max(0,speed));
 const gamma=lorentz(v);
 while(remaining>1e-10){
  const radius=Math.hypot(...p),r=radius/RS,root=lapse(r),n=p.map(x=>x/radius),vr=direction.reduce((s,x,i)=>s+x*n[i],0)*v;
  const h=v>0?Math.min(remaining,Math.min(.04,.12*(r-1))*RS/(gamma*v)):remaining;
  const first=direction.map((x,i)=>gamma*h*(v*x+(root-1)*vr*n[i]));
  const middle=p.map((x,i)=>x+first[i]/2),midRadius=Math.hypot(...middle),midN=middle.map(x=>x/midRadius),midRoot=lapse(midRadius/RS),midVr=direction.reduce((s,x,i)=>s+x*midN[i],0)*v;
  const d=direction.map((x,i)=>gamma*h*(v*x+(midRoot-1)*midVr*midN[i]));
  const next=p.map((x,i)=>x+d[i]),fraction=boundaryFraction(p,next);
  if(fraction!==null){
   const q=p.map((x,i)=>x+d[i]*fraction),qr=Math.hypot(...q);p=q.map(x=>x/qr*MIN_RADIUS*RS);
   coordinate+=h*fraction*gamma/lapse((r+MIN_RADIUS)/2);remaining-=h*fraction;
   coordinate+=remaining/lapse(MIN_RADIUS);remaining=0;hit=true;v=0;
  }else{
   const mid=Math.hypot(...p.map((x,i)=>(x+next[i])/2))/RS;
   coordinate+=h*gamma/lapse(mid);p=next;remaining-=h;
  }
 }
 return {position:p,coordinateDelta:coordinate,properDelta:properSeconds,referenceDelta:coordinate*lapse(REF_RADIUS),hit,speed:v};
}

// Binet equation for null geodesics, u=r_s/r: u''=-u+3u²/2.
// Directions and the geodesic plane are supplied separately by the renderer.
export function traceRay(radius,cosAlpha,onSegment=null,steps=640){
 const sinAlpha=Math.sqrt(Math.max(0,1-cosAlpha*cosAlpha));
 if(sinAlpha<1e-7)return {captured:cosAlpha<0,phi:0,radial:true};
 const impact=radius*sinAlpha/lapse(radius);
 let u=1/radius,w=-cosAlpha/impact,phi=0;
 const acceleration=x=>-x+1.5*x*x;
 for(let i=0;i<steps;i++){
  const h=.025,oldU=u,oldW=w,oldPhi=phi;
  const a1=acceleration(u),k2u=w+h*a1/2,k2w=acceleration(u+h*w/2),k3u=w+h*k2w/2,k3w=acceleration(u+h*k2u/2),k4u=w+h*k3w,k4w=acceleration(u+h*k3u);
  u+=h*(w+2*k2u+2*k3u+k4u)/6;w+=h*(a1+2*k2w+2*k3w+k4w)/6;phi+=h;
  if(onSegment?.(oldPhi,phi,oldU,u,oldW,w))return {captured:false,phi,disk:true};
  if(u>=1)return {captured:true,phi};
  if(u<=0)return {captured:false,phi:oldPhi+h*oldU/(oldU-u)};
 }
 return {captured:true,phi,truncated:true};
}
export function aberrateToStatic(ray,beta){
 const b2=beta.reduce((s,x)=>s+x*x,0);if(b2<1e-12)return [...ray];
 const gamma=1/Math.sqrt(1-b2),dot=ray.reduce((s,x,i)=>s+x*beta[i],0),factor=(gamma-1)*dot/b2-gamma;
 return ray.map((x,i)=>(x+factor*beta[i])/(gamma*(1-dot)));
}
