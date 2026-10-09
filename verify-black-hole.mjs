import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/assets/three.module.js';
import {C} from './dist/physics.js';
import {RS,MIN_RADIUS,REF_RADIUS,BH_MAX_SPEED,lapse,rates,traceRay,advanceObserver,radialLightDelay,signalAt,aberrateToStatic,holdingAcceleration,tidalAcceleration} from './dist/black-hole-physics.js';
import {BlackHoleRenderer} from './dist/black-hole-renderer.js';

const close=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} ≠ ${b}`);
close(RS,2953339.382066879,1e-6);
close(rates(2).player,Math.sqrt(.5));close(rates(1.01).player,.09950371902099896);
close(rates(2).ratio,Math.sqrt(.999/.5));assert.ok(rates(1e10).ratio<1);
assert.ok(holdingAcceleration(1.01)>holdingAcceleration(2));assert.ok(tidalAcceleration(2)>tidalAcceleration(20));

// Integrate a trajectory with different radii and speeds, including a stationary interval.
let position=[0,0,20*RS],coordinate=0,reference=0,proper=0;
for(const [speed,seconds] of [[C*.5,8],[C*.9,4],[0,13]]){
 const next=advanceObserver(position,[0,0,-1],speed,seconds);position=next.position;coordinate+=next.coordinateDelta;reference+=next.referenceDelta;proper+=next.properDelta;
}
close(proper,25);close(reference,coordinate*lapse(REF_RADIUS),1e-10);assert.ok(reference>proper);
const stationary=advanceObserver([0,0,2*RS],[0,0,-1],0,60);close(stationary.referenceDelta,60*rates(2).ratio);assert.deepEqual(stationary.position,[0,0,2*RS]);
const full=advanceObserver([0,0,5*RS],[0,0,-1],C*.5,8);let split=[0,0,5*RS],splitClock=0;
for(let i=0;i<80;i++){const s=advanceObserver(split,[0,0,-1],C*.5,.1);split=s.position;splitClock+=s.coordinateDelta;}
assert.ok(Math.hypot(...full.position.map((v,i)=>v-split[i]))/RS<.001);close(full.coordinateDelta,splitClock,.003);

// Swept exclusion catches crossing the entire horizon region at large time warp.
for(const r of [1.010001,1.1,20]){
 const hit=advanceObserver([0,0,r*RS],[0,0,-1],BH_MAX_SPEED,1000);
 assert.equal(hit.hit,true);close(Math.hypot(...hit.position)/RS,MIN_RADIUS,1e-10);assert.equal(hit.speed,0);assert.ok(Number.isFinite(hit.coordinateDelta));close(hit.properDelta,1000);
 const away=advanceObserver(hit.position,[0,0,1],C*.1,1);assert.equal(away.hit,false);assert.ok(away.position[2]>hit.position[2]);
}

// Exact radial signal formula and its received tick rate along a moving worldline.
for(const r of [1.01,2,20,1200]){
 close(signalAt(100,[0,0,r*RS],[0,0,0]).frequency,rates(r).ratio);
 assert.ok(radialLightDelay(r)>0);
 for(const v of [-C*.3,C*.3]){
  const start=[0,0,r*RS],small=.001,next=advanceObserver(start,[0,0,Math.sign(v)],Math.abs(v),small);
  if(next.hit)continue;
  const initial=signalAt(1e5,start,[0,0,v]),final=signalAt(1e5+next.coordinateDelta,next.position,[0,0,v]);
  close((final.emissionTime-initial.emissionTime)/small,(initial.frequency+final.frequency)/2,.00003);
 }
}

// Shadow boundary from the analytic critical impact parameter, at both sides of the photon sphere.
for(const r of [1.01,1.1,1.5,2,20,100]){
 const cone=Math.asin(Math.min(1,3*Math.sqrt(3)/2*lapse(r)/r)),critical=r>=1.5?Math.PI-cone:cone;
 assert.equal(traceRay(r,Math.cos(critical-.001)).captured,false,`escape at ${r}`);
 assert.equal(traceRay(r,Math.cos(critical+.001)).captured,true,`capture at ${r}`);
}
const winding=traceRay(20,Math.cos(3.0146373186069857-.0001));assert.ok(winding.phi>Math.PI*2);
const impact=100,observerRadius=1e5,scattering=traceRay(observerRadius,-Math.sqrt(1-(impact*lapse(observerRadius)/observerRadius)**2));
close(scattering.phi-Math.PI+Math.asin(impact/observerRadius),2/impact,.0004);
for(const direction of [[0,0,-1],[1,0,0],[.3,.4,Math.sqrt(.75)]]){const shifted=aberrateToStatic(direction,[0,0,.8]),original=aberrateToStatic(shifted,[0,0,-.8]);close(Math.hypot(...shifted),1);original.forEach((v,i)=>close(v,direction[i]));}

// Multiple images are roots of the same geodesic transfer, not scene duplicates.
globalThis.innerWidth=1280;globalThis.innerHeight=720;
const star=JSON.parse(fs.readFileSync('dist/assets/stars.json')).find(s=>s[1]==='Sirius'),direction=new THREE.Vector3(star[2],star[3],star[4]).normalize(),side=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize(),observer=direction.clone().negate().addScaledVector(side,.035).normalize().multiplyScalar(20*RS),camera=new THREE.PerspectiveCamera(65,1280/720,.000005,2e8);
camera.lookAt(observer.clone().negate().normalize());camera.updateMatrixWorld();
const images=BlackHoleRenderer.prototype.referenceImages(camera,observer,star);assert.ok(images.length>=3);assert.ok(images.some(i=>i.x<640)&&images.some(i=>i.x>640));
console.log('Verified Schwarzschild clocks, accumulated trajectory time, radial retarded signals/Doppler, swept horizon exclusion, analytic shadow cones, weak-field deflection, winding images and aberration.');
