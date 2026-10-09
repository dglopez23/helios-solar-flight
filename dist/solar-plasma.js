import * as THREE from './assets/three.module.js';
import {regions,regionFrame} from './solar-surface.js';
// Illustrative active regions; paired footpoints share the photosphere spot map.
const vertex=`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUV;void main(){vUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`;
const fragment=`#include <common>
#include <logdepthbuf_pars_fragment>
varying vec2 vUV;uniform float clock,phase,euv,opacity;void main(){
#include <logdepthbuf_fragment>
float flow=.25+.75*pow(.5+.5*sin(vUV.x*37.-clock*.38+phase),3.);flow*=.7+.3*sin(vUV.x*103.+clock*.2+phase);gl_FragColor=vec4(mix(vec3(1.,.18,.25),vec3(1.,.55,.08),euv),opacity*flow);
#include <colorspace_fragment>
}`;
export class SolarPlasma{
 constructor(sun){this.sun=sun;this.loops=[];for(let ri=0;ri<regions.length;ri++){const [lon,lat,height,width,az]=regions[ri],{n,u}=regionFrame(lon,lat,az),side=new THREE.Vector3().crossVectors(n,u);for(let j=0;j<7+ri%5;j++){const points=[];for(let i=0;i<=64;i++){const t=i/64*Math.PI,offset=(width+(j-4)*800)/sun.r*Math.cos(t),rad=1+(height+(j-4)*1400)/sun.r*Math.sin(t)**.9,p=n.clone().multiplyScalar(Math.cos(offset)).addScaledVector(u,Math.sin(offset)).addScaledVector(side,(j-4)*.0007*Math.sin(t)+.002*Math.sin(t*3+j)*Math.sin(t));p.normalize().multiplyScalar(rad);points.push(p);}const curve=new THREE.CatmullRomCurve3(points),material=opacity=>new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{clock:{value:0},phase:{value:ri+j*.8},euv:{value:0},opacity:{value:opacity}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),core=new THREE.Mesh(new THREE.TubeGeometry(curve,80,(220+j%3*90)/sun.r,5,false),material(.28)),halo=new THREE.Mesh(new THREE.TubeGeometry(curve,64,1800/sun.r,5,false),material(.025));sun.mesh.add(core,halo);this.loops.push({points,core,halo,phase:ri+j*.8});}}}
 update(scene,filtered,time){this.sun.group.updateMatrixWorld(true);const lines=[];for(const l of this.loops){l.core.visible=l.halo.visible=filtered;for(const mesh of [l.core,l.halo]){mesh.material.uniforms.clock.value=time%100000;mesh.material.uniforms.euv.value=scene.userData.solarEUV?1:0;}if(filtered)lines.push({points:l.points.map(p=>p.clone().applyMatrix4(this.sun.mesh.matrixWorld)),phase:l.phase,time:time%100000,euv:scene.userData.solarEUV});}scene.userData.solarLoops=lines;}
}
