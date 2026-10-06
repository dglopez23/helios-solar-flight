import * as THREE from './assets/three.module.js';
// Angular input is in the pilot's frame, never in a fixed planetary frame.
const delta=new THREE.Quaternion(),axis=new THREE.Vector3();
export function rotateFlight(camera,yaw,pitch,roll=0){
 const angle=Math.hypot(pitch,yaw,roll);if(!angle)return;
 axis.set(pitch,yaw,roll).divideScalar(angle);
 delta.setFromAxisAngle(axis,angle);camera.quaternion.multiply(delta).normalize();
}
export function aimFlight(camera,direction){
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 return new THREE.Quaternion().setFromUnitVectors(forward,direction.clone().normalize()).multiply(camera.quaternion).normalize();
}
export const LAUNCH_SECONDS=8;
export function ascentAt(seconds){const t=Math.max(0,Math.min(1,seconds/LAUNCH_SECONDS));return {complete:t===1,height:.05+600*t*t*(3-2*t),speed:600*(6*t-6*t*t)/LAUNCH_SECONDS,progress:t};}
