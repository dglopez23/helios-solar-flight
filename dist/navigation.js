import * as THREE from './assets/three.module.js';
import {AU,MAX_SPEED} from './physics.js';
// Laplace spheres of influence are reference-frame boundaries, not cutoffs of gravity.
const gm={sun:132712440018,mercury:22031.87,venus:324858.59,earth:398600.44,moon:4902.8,mars:42828.38,ceres:62.63,vesta:17.29,pallas:14.3,jupiter:126686531.9,io:5959.92,europa:3202.74,ganymede:9887.83,callisto:7179.29,saturn:37931206.23,titan:8978.14,uranus:5793951.26,neptune:6835099.97,triton:1427.6,pluto:869.61,charon:105.88};
export function orbitalEllipse(r,v,mu,count=256){
 const h=new THREE.Vector3().crossVectors(r,v),evec=new THREE.Vector3().crossVectors(v,h).divideScalar(mu).sub(r.clone().normalize()),e=evec.length(),a=1/(2/r.length()-v.lengthSq()/mu);
 if(!(a>0)||e>=1||h.lengthSq()===0)return null;
 const p=e>1e-7?evec.normalize():r.clone().normalize(),q=new THREE.Vector3().crossVectors(h.normalize(),p).normalize(),points=[];
 for(let i=0;i<count;i++){const E=i/count*Math.PI*2;points.push(p.clone().multiplyScalar(a*(Math.cos(E)-e)).addScaledVector(q,a*Math.sqrt(1-e*e)*Math.sin(E)));}
 return {a,e,points};
}
export function setInfluences(bodies,velocity){
 for(const b of bodies){b.gm=gm[b.id]||b.gm;if(b.id==='sun'){b.soi=Infinity;continue;}const parent=bodies.find(x=>x.id===(b.parent||'sun')),r=b.pos.clone().sub(parent.pos),v=velocity(b).sub(velocity(parent)),orbit=orbitalEllipse(r,v,b.gm+parent.gm);b.orbit=orbit;b.soi=(orbit?.a||r.length())*Math.pow(b.gm/parent.gm,.4);}
}
export function referenceBody(ship,bodies,current='sun'){
 const candidates=bodies.filter(b=>b.id!=='sun'&&ship.distanceTo(b.pos)<b.soi*(b.id===current?1.04:1)).sort((a,b)=>a.soi-b.soi);
 return candidates[0]||bodies.find(b=>b.id==='sun');
}
export function flightDelta(dir,speed,dt,referenceDelta,solarDelta){
 const delta=dir.clone().multiplyScalar(speed*dt).add(referenceDelta),solar=delta.clone().sub(solarDelta),limit=MAX_SPEED*dt;
 if(solar.length()>limit&&dt>0)delta.copy(solar.setLength(limit)).add(solarDelta);
 return delta;
}
export class OrbitOverlay{
 constructor(scene,bodies){this.scene=scene;this.bodies=bodies;this.lines=[];this.visible=false;}
 rebuild(){for(const l of this.lines){this.scene.remove(l.mesh);l.mesh.geometry.dispose();l.mesh.material.dispose();}this.lines=[];for(const b of this.bodies){if(!b.orbit)continue;const mesh=new THREE.LineLoop(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(b.orbit.points.length*3),3)),new THREE.LineBasicMaterial({color:b.parent?0x7896ae:0xd1a273,transparent:true,opacity:b.parent?.4:.3,depthWrite:false}));mesh.frustumCulled=false;this.scene.add(mesh);this.lines.push({body:b,mesh});}}
 update(ship){const output=[];for(const l of this.lines){l.mesh.visible=this.visible;if(!this.visible)continue;const parent=this.bodies.find(b=>b.id===(l.body.parent||'sun')),points=l.body.orbit.points.map(p=>p.clone().add(parent.pos).sub(ship).multiplyScalar(.001)),a=l.mesh.geometry.attributes.position;points.forEach((p,i)=>a.setXYZ(i,p.x,p.y,p.z));a.needsUpdate=true;output.push({points,color:l.body.parent?'#7896ae':'#d1a273'});}this.scene.userData.orbitLines=output;}
}
export function viewBrightness(camera,ship,sun,bodies,atmosphere=0){
 const look=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),toSun=sun.pos.clone().sub(ship),distance=toSun.length(),sunDir=toSun.clone().normalize(),dot=look.dot(sunDir),half=Math.cos(camera.fov*Math.PI/360),inView=THREE.MathUtils.smoothstep(dot,half-.12,half+.08);
 const blocked=bodies.some(b=>{if(b===sun)return false;const p=b.pos.clone().sub(ship),along=p.dot(sunDir);return along>0&&along<distance&&p.lengthSq()-along*along<b.r*b.r;});
 let brightness=blocked?0:inView*15/Math.max(.04,Math.pow(distance/AU,.55));
 const tan=Math.tan(camera.fov*Math.PI/360),aspect=camera.aspect||1,entries=bodies.filter(b=>b!==sun).map(b=>({b,p:b.pos.clone().sub(ship),r:b.r+(b.terrain?.max||0),light:sun.pos.clone().sub(b.pos).normalize()}));
 let reflected=0;
 for(let y=0;y<5;y++)for(let x=0;x<7;x++){
  const ray=new THREE.Vector3(((x+.5)/7*2-1)*tan*aspect,(1-(y+.5)/5*2)*tan,-1).normalize().applyQuaternion(camera.quaternion);let nearest=Infinity,hit=null;
  for(const e of entries){const along=ray.dot(e.p),disc=along*along-e.p.lengthSq()+e.r*e.r;if(disc<0)continue;const t=along-Math.sqrt(disc);if(t>0&&t<nearest){nearest=t;hit=e;}}
  if(hit){const normal=ray.clone().multiplyScalar(nearest).sub(hit.p).normalize(),mu=Math.max(0,normal.dot(hit.light)),albedo=hit.b.id==='earth'?.35:hit.b.gas?.45:.15;reflected+=mu*albedo*40;}
 }
 brightness+=reflected/35;
 // Nearby sunlit ground also contributes veiling glare outside the camera frame.
 for(const e of entries){const d=e.p.length(),alt=d-e.r;if(alt>e.r*.15)continue;const sunlit=Math.max(0,e.p.clone().negate().normalize().dot(e.light));brightness+=sunlit*(e.b.id==='earth'?2:1)*Math.exp(-Math.max(0,alt)/(e.r*.04));}
 brightness+=atmosphere*8;return {brightness,stars:Math.exp(-brightness*1.1)*(1-atmosphere)};
}
