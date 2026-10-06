import assert from 'node:assert/strict';
import {rotateFlight,aimFlight,ascentAt,LAUNCH_SECONDS} from './dist/flight-controls.js';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from './dist/assets/three.module.js';
import {AU,MAX_SPEED,C,bodies,sweptSphere,sliderFromSpeed,speedFromSlider} from './dist/physics.js';
import {referenceBody,setInfluences,flightDelta,orbitalEllipse,viewBrightness} from './dist/navigation.js';
import {SolarOptics} from './dist/optics.js';
import {sweptTerrain,radiusAt,sampleHeight,rayHeight,terrainNormal} from './dist/terrain.js';
assert.equal(MAX_SPEED,C);assert.ok(Math.abs(speedFromSlider(2000)-MAX_SPEED)<1e-8);
const code=fs.readFileSync('./dist/main.js','utf8'),start=code.indexOf('function updatePhysics(dt)'),end=code.indexOf('function distanceText',start),fn=code.slice(start,end);
function simulation(alt,speed,assist,warp=1){
 const b={id:'earth',name:'Tierra',r:6371.0084,pos:new THREE.Vector3(),previous:new THREE.Vector3()},sun={pos:new THREE.Vector3(1e8,0,0)};
 const state={ready:true,paused:false,phase:'flight',command:speed,speed,sim:0,warp,assist,hold:null,target:'earth'},ship=new THREE.Vector3(b.r+alt,0,0),camera=new THREE.PerspectiveCamera();camera.up.set(0,1,0);camera.lookAt(-1,0,0);
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{open:false,classList:{add(){},remove(){}},value:0,hidden:true});return elements.get(id);};
 const context={rotateFlight,aimFlight,ascentAt,referenceBody:()=>b,flightDelta,THREE,state,ship,camera,sun,ephem:{sun:[[2440587.5+1]]},keys:new Set(),bodies:[b],objects:new Map([['earth',b]]),MAX_SPEED,$,positions(){b.previous.copy(b.pos);},getForward(){return new THREE.Vector3(-1,0,0);},sweptSphere,sweptTerrain,radiusAt,sliderFromSpeed,speedFromSlider,setSpeed(){},toast(){},fmt:String,updateUI(){},document:{exitPointerLock(){}},setTimeout(){}};
 vm.runInNewContext(fn+'\nupdatePhysics(.01);',context);return {state,ship,b};
}
for(const assist of [false,true]){const s=simulation(10,100,assist);assert.equal(s.state.speed,100);assert.ok(Math.abs(s.ship.length()-s.b.r-9)<1e-8);}
for(const [speed,warp] of [[MAX_SPEED,1],[MAX_SPEED,1000],[100,1000]]){const s=simulation(50,speed,true,warp);assert.equal(s.state.phase,'crashed');assert.equal(s.state.impact.speed,speed);assert.ok(Math.abs(s.ship.length()-s.b.r-.001)<1e-7);}
assert.equal(sweptSphere([0,12,0],[20,12,0],[10,0,0],[10,0,0],10),null);
let draws=0;const noop=()=>{},ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop}),arc(){draws++}}, {get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
globalThis.innerWidth=1400;globalThis.innerHeight=900;const optics=new SolarOptics({width:0,height:0,getContext:()=>ctx}),camera=new THREE.PerspectiveCamera(65,1400/900),sun={r:695700,pos:new THREE.Vector3()};
for(const d of [1,40,100]){const ship=new THREE.Vector3(0,0,d*AU);optics.render(camera,ship,sun,[sun],false);assert.equal(optics.info.visible,true);assert.ok(draws>0);if(d===40){assert.ok(optics.info.radiusPixels<.2);assert.ok(optics.info.magnitude<-18);}}
optics.render(camera,new THREE.Vector3(0,0,sun.r*10),sun,[sun],true);assert.equal(optics.info.filtered,true);
const stars=JSON.parse(fs.readFileSync('./dist/assets/stars.json','utf8'));assert.ok(stars.length>5000);const sirius=stars.find(s=>s[1]==='Sirius');assert.ok(sirius);assert.ok(sirius[5]<-1);
for(const b of bodies)if(b.map){assert.ok(fs.existsSync(`./dist/assets/${b.map}.jpg`),b.id);}
const ephem=JSON.parse(fs.readFileSync('./dist/assets/ephemeris.json','utf8'));
const {interpolate}=await import('./dist/physics.js');const jd=2461318.4174674;
for(const b of bodies)b.pos=new THREE.Vector3().fromArray(interpolate(ephem[b.id],jd));
const velocity=b=>new THREE.Vector3().fromArray(interpolate(ephem[b.id],jd+.00001)).sub(new THREE.Vector3().fromArray(interpolate(ephem[b.id],jd-.00001))).divideScalar(.00002*86400);
setInfluences(bodies,velocity);const earth=bodies.find(b=>b.id==='earth'),moon=bodies.find(b=>b.id==='moon');
assert.ok(earth.soi>900000&&earth.soi<950000);assert.ok(moon.soi>50000&&moon.soi<80000);
const close=earth.pos.clone().add(new THREE.Vector3(earth.r+500,0,0));assert.equal(referenceBody(close,bodies).id,'earth');assert.equal(referenceBody(moon.pos.clone().add(new THREE.Vector3(2000,0,0)),bodies).id,'moon');assert.equal(referenceBody(earth.pos.clone().add(new THREE.Vector3(earth.soi*1.1,0,0)),bodies,'earth').id,'sun');
const motion=new THREE.Vector3(30,10,-2),zero=flightDelta(new THREE.Vector3(1,0,0),0,1,motion,new THREE.Vector3());assert.ok(zero.distanceTo(motion)<1e-12);assert.ok(flightDelta(new THREE.Vector3(1,0,0),MAX_SPEED,1,motion,new THREE.Vector3()).length()<=MAX_SPEED+1e-8);
const circular=orbitalEllipse(new THREE.Vector3(7000,0,0),new THREE.Vector3(0,Math.sqrt(398600.44/7000),0),398600.44);assert.ok(circular.e<1e-10);assert.ok(circular.points.every(p=>Math.abs(p.length()-7000)<1e-7));assert.ok(bodies.filter(b=>b.id!=='sun').every(b=>b.orbit&&b.orbit.e<1));
const observer=new THREE.Vector3(0,0,AU),sol={pos:new THREE.Vector3(),r:695700},eyeCamera=new THREE.PerspectiveCamera(65);eyeCamera.lookAt(0,0,-1);const bright=viewBrightness(eyeCamera,observer,sol,[sol]);eyeCamera.lookAt(0,0,1);const dark=viewBrightness(eyeCamera,observer,sol,[sol]);assert.ok(bright.stars<.01&&dark.stars>.99);
for(const id of ['juno','voyager','hubble','new-horizons']){const glb=fs.readFileSync(`./dist/assets/missions/${id}.glb`);assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(4),2);}
const height={width:8,height:4,min:3,max:3,data:new Uint16Array(32)};
const mountain={r:10,terrain:height,pos:new THREE.Vector3(),previous:new THREE.Vector3()};
assert.equal(sampleHeight(height,.5,.5),3);assert.equal(radiusAt(mountain,new THREE.Vector3(1,0,0),0),13);
assert.ok(Math.abs(sweptTerrain([20,0,0],[0,0,0],mountain,0,1)-.35)<1e-6);
assert.ok(Math.abs(rayHeight(height,10,20,0,0,-1,0,0).d-7)<1e-6);
assert.ok(terrainNormal(height,.5,.5,10).distanceTo(new THREE.Vector3(1,0,0))<1e-10);
for(const id of ['ida','gaspra','hygiea','psyche','eunomia','iris','hebe','halley']){assert.equal(ephem[id].length,ephem.earth.length);assert.ok(ephem[id].every(row=>row.every(Number.isFinite)));}
const planet={id:'earth',r:6371,pos:new THREE.Vector3()},light={r:695700,pos:new THREE.Vector3(1e8,0,0)};
const daylightObserver=new THREE.Vector3(7000,0,0),planetCam=new THREE.PerspectiveCamera(65);planetCam.position.set(0,0,0);planetCam.lookAt(-1,0,0);
const groundLight=viewBrightness(planetCam,daylightObserver,light,[light,planet]);
planetCam.lookAt(1,0,0);const nightGround=viewBrightness(planetCam,new THREE.Vector3(-7000,0,0),light,[light,planet]);
assert.ok(groundLight.stars<.02&&nightGround.stars>.99);
console.log('Verified measured-height impacts and ray intersections, all 28 osculating orbits and JPL series, sunlit-ground exposure, SOI co-motion, solar speed cap and NASA GLBs.');
console.log('Verified: no approach braking, heading-only assistance, actual-radius impacts at c and 1000×, solar PSF at Pluto and 100 AU, catalog and every surface map.');

// The same local control is used by mouse and arrows at arbitrary pitch and roll.
for(const angles of [[0,0,0],[Math.PI/2,0,0],[1.9,2.4,.8],[-1.4,-.8,2.8]]){
 const cam=new THREE.PerspectiveCamera();cam.quaternion.setFromEuler(new THREE.Euler(...angles));
 const original=cam.quaternion.clone(),forward=new THREE.Vector3(0,0,-1).applyQuaternion(original),right=new THREE.Vector3(1,0,0).applyQuaternion(original);
 rotateFlight(cam,-.2,0);const after=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);
 assert.ok(Math.abs(forward.angleTo(after)-.2)<1e-12,'horizontal input must turn, never just roll');assert.ok(after.dot(right)>0,'right input turns towards screen right');
 cam.quaternion.copy(original);rotateFlight(cam,0,0,.5);assert.ok(new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).distanceTo(forward)<1e-12,'roll alone preserves heading');
 const destination=forward.clone().negate();cam.quaternion.copy(aimFlight(cam,destination));assert.ok(new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).distanceTo(destination)<1e-12);
 for(let i=0;i<10000;i++)rotateFlight(cam,.01,-.007,.002);assert.ok(Math.abs(cam.quaternion.length()-1)<1e-12);
}
assert.equal(LAUNCH_SECONDS,8);assert.equal(ascentAt(0).height,.05);assert.equal(ascentAt(8).complete,true);assert.equal(ascentAt(8).height,600.05);assert.equal(ascentAt(8).speed,0);
for(let t=.01;t<8;t+=.01)assert.ok(ascentAt(t).height>ascentAt(t-.01).height);
for(const speed of [0,1,100,C*.01,C*.5,C])assert.ok(Math.abs(speedFromSlider(sliderFromSpeed(speed))-speed)<1e-8);
console.log('Verified local yaw at vertical/inverted/rolled attitudes, explicit roll, 10k normalized turns, 8-second ascent and slider through c.');
