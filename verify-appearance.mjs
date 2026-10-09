import assert from 'node:assert/strict';
import {diskEmission,shiftSky,jetEmission} from './dist/accretion.js';
import {regions,regionFrame,solarColor} from './dist/solar-surface.js';
import {SolarPlasma} from './dist/solar-plasma.js';
import * as THREE from './dist/assets/three.module.js';
for(const r of [3,3.5,5,10,20,22])for(const shift of [.1,1,3,10])assert.ok(diskEmission(r,1,234,shift).every(x=>Number.isFinite(x)&&x>=0));
assert.notDeepEqual(diskEmission(7,1,0,1),diskEmission(7,1,1000,1));
const hot=diskEmission(4,1,0,1),cool=diskEmission(18,1,0,1);assert.ok(hot[2]/hot[0]>cool[2]/cool[0]);
const red=shiftSky([1,1,1],.5),blue=shiftSky([1,1,1],2);assert.ok(blue[2]/blue[0]>red[2]/red[0]);
assert.ok(jetEmission(0,5,0,0,1,1).some(x=>x>0));
const sun={r:695700,mesh:new THREE.Mesh(),group:new THREE.Group()},plasma=new SolarPlasma(sun);assert.ok(plasma.loops.length>100);
for(const l of plasma.loops){for(const p of [l.points[0],l.points.at(-1)])assert.ok(Math.abs(p.length()-1)<1e-10);assert.ok(l.points[32].length()>1.02);}
for(const [lon,lat,h,w,az]of regions){const {n,u}=regionFrame(lon,lat,az);assert.ok(Math.abs(n.dot(u))<1e-12);}
for(const euv of [false,true])assert.ok(solarColor(.5,.1,.4,1,euv,[.2,.1,0],[.4,.2,.89]).every(Number.isFinite));
console.log('Plasma: colores, advección, jets, regiones y anclajes verificados.');
