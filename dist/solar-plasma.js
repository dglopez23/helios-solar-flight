import * as THREE from './assets/three.module.js';
// Reconstructed magnetic arches at observed prominence scales. These are not
// a prediction of active solar regions on the ephemeris date.
export class SolarPlasma{
 constructor(sun){this.sun=sun;this.loops=[];const regions=[[-.12,.14,75000,50000],[1.28,-.25,42000,35000],[2.75,.31,105000,65000],[4.6,-.12,58000,42000]];
  for(const [lon,lat,height,width] of regions){const n=new THREE.Vector3(-Math.cos(lon)*Math.cos(lat),Math.sin(lat),Math.sin(lon)*Math.cos(lat)),u=new THREE.Vector3(Math.sin(lon),0,Math.cos(lon));for(let filament=0;filament<3;filament++){const points=[];for(let i=0;i<=48;i++){const theta=i/48*Math.PI,offset=(width+filament*1500)/sun.r*Math.cos(theta),radius=1+(height+filament*900)/sun.r*Math.pow(Math.sin(theta),.9),p=n.clone().multiplyScalar(Math.cos(offset)).addScaledVector(u,Math.sin(offset)).multiplyScalar(radius);points.push(p);}const curve=new THREE.CatmullRomCurve3(points),core=new THREE.Mesh(new THREE.TubeGeometry(curve,96,(650+filament*180)/sun.r,6,false),new THREE.MeshBasicMaterial({color:0xff5361,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false})),halo=new THREE.Mesh(new THREE.TubeGeometry(curve,72,2600/sun.r,6,false),new THREE.MeshBasicMaterial({color:0xf14748,transparent:true,opacity:.075,blending:THREE.AdditiveBlending,depthWrite:false}));sun.mesh.add(core,halo);this.loops.push({points,core,halo});}}
 }
 update(scene,filtered,time){this.sun.group.updateMatrixWorld(true);const lines=[];for(let i=0;i<this.loops.length;i++){const l=this.loops[i];l.core.visible=l.halo.visible=filtered;l.core.material.opacity=.48+.08*Math.sin(time/130+i*.7);if(filtered)lines.push(l.points.map(p=>p.clone().applyMatrix4(this.sun.mesh.matrixWorld)));}scene.userData.solarLoops=lines;}
}
