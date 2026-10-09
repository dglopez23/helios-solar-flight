import * as THREE from './assets/three.module.js';
import {C,sliderFromSpeed} from './physics.js';
import {RS,REF_RADIUS,MIN_RADIUS,BH_MAX_SPEED,rates,lapse,advanceObserver,holdingAcceleration,tidalAcceleration,signalAt} from './black-hole-physics.js';
import {BlackHoleRenderer} from './black-hole-renderer.js';

const $=id=>document.getElementById(id),fmt=(n,d=2)=>n.toLocaleString('es-ES',{maximumFractionDigits:d,minimumFractionDigits:d});
export function clockText(seconds){const negative=seconds<0?'−':'',s=Math.abs(seconds),days=Math.floor(s/86400),h=Math.floor(s/3600)%24,m=Math.floor(s/60)%60;return negative+(days?days+' d ':'')+[h,m,Math.floor(s)%60].map(x=>String(x).padStart(2,'0')).join(':')+'.'+String(Math.floor(s%1*10));}

export class BlackHoleExplorer{
 constructor({renderer,canvas,camera,ship,state,look,toast,updateUI}){
  Object.assign(this,{camera,ship,state,look,toast,refresh:updateUI});this.view=new BlackHoleRenderer(renderer,canvas);this.velocity=new THREE.Vector3();this.settings={disk:true,guides:false,exposure:1.8,coordinate:0};this.proper=0;this.reference=0;this.markerTime=0;
  for(const button of document.querySelectorAll('[data-radius]'))button.onclick=()=>this.visit(+button.dataset.radius);
  $('bhDisk').onchange=e=>this.settings.disk=e.target.checked;
  $('bhGuides').onchange=e=>this.settings.guides=e.target.checked;
  $('bhExposure').oninput=e=>this.settings.exposure=+e.target.value;
  $('bhStar').onchange=()=>{this.markerTime=0;this.markerCache=null;};
  $('bhAlignStar').onclick=()=>{
   const source=this.catalog.find(s=>String(s[0])===$('bhStar').value);if(!source){this.toast('Selecciona primero una estrella.');return;}
   const d=new THREE.Vector3(source[2],source[3],source[4]).normalize(),axis=Math.abs(d.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),side=new THREE.Vector3().crossVectors(d,axis).normalize(),radius=this.ship.length();
   this.ship.copy(d).negate().addScaledVector(side,.035).normalize().multiplyScalar(radius);this.state.speed=this.state.command=0;this.velocity.set(0,0,0);$('throttle').value=0;this.state.assist=false;this.look(this.ship.clone().negate().normalize());this.markerSignature='';this.toast('Alineación didáctica con '+source[1]+': observa sus imágenes alrededor de la sombra.');this.refresh();
  };
  $('bhResetClocks').onclick=()=>{this.resetClocks();this.refresh();};
  $('bhLookOut').onclick=()=>{this.state.assist=false;this.look(this.ship.clone().normalize());this.toast('Mirando hacia el exterior. G vuelve a orientar al centro.');};
  $('bhModel').onclick=()=>$('helpButton').click();
  $('bhSafe').onclick=()=>this.visit(20);
  $('bhExterior').onclick=()=>{$('exterior').hidden=!$('exterior').hidden;$('bhExterior').setAttribute('aria-expanded',String(!$('exterior').hidden));};
  $('closeExterior').onclick=()=>{$('exterior').hidden=true;$('bhExterior').setAttribute('aria-expanded','false');};
  for(const button of document.querySelectorAll('[data-exterior]'))button.onclick=()=>{this.externalMode=button.dataset.exterior;for(const b of document.querySelectorAll('[data-exterior]'))b.classList.toggle('active',b===button);this.refresh();};
  this.externalMode='comparison';
 }
 ready(catalog,milky,colorForStar){
  this.catalog=catalog;this.view.setSky(catalog,milky,colorForStar);
  for(const name of ['Sirius','Vega','Betelgeuse','Rigel','Polaris']){const source=catalog.find(s=>s[1]===name);if(!source)continue;const option=document.createElement('option');option.value=source[0];option.textContent=name;$('bhStar').append(option);}
 }
 resetClocks(){this.proper=0;this.reference=0;this.settings.coordinate=0;}
 enter(){
  this.state.started=true;this.state.paused=false;this.state.phase='flight';this.state.warp=1;this.state.assist=false;this.state.hold=null;this.state.target='blackhole';this.state.reference='blackhole';$('timeWarp').value='1';$('pause').innerHTML='PAUSAR <kbd>P</kbd>';
  this.resetClocks();this.camera.up.set(0,1,0);this.camera.lookAt(new THREE.Vector3(0,-.24,-1));this.camera.updateMatrixWorld();this.ship.set(0,.24,1).normalize().multiplyScalar(RS*20);this.visit(20,false);$('welcome').hidden=true;$('crash').hidden=true;$('solarFilter').hidden=true;$('ascentProgress').hidden=true;
  this.toast('Schwarzschild · propulsión asistida. Mismos controles de vuelo. N: explorar; V: velocidad.');
 }
 visit(radius,announce=true){
  // Keep the current latitude: radial shortcuts must not rotate the sky or disk.
  const direction=this.state.scenario==='blackhole'&&this.ship.length()<RS*20000?this.ship.clone().normalize():new THREE.Vector3(0,.24,1).normalize();
  this.ship.copy(direction).multiplyScalar(RS*Math.max(MIN_RADIUS,radius));this.state.speed=this.state.command=0;this.velocity.set(0,0,0);this.state.assist=false;$('throttle').value=0;this.look(direction.clone().negate());this.markerCache=null;
  if(announce)this.toast(radius<=1.1?'Cerca del horizonte: gira o pulsa «Mirar hacia el exterior» para encontrar el cielo.':'Sonda estacionaria en '+fmt(radius)+' rₛ · acceso didáctico instantáneo; relojes conservados.');this.refresh();
 }
 step(dt,keys,getForward){
  if(!this.state.started||this.state.paused||$('scenarioChooser').hidden===false)return;
  if(this.state.assist){const desired=this.ship.clone().negate().normalize(),forward=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion),q=new THREE.Quaternion().setFromUnitVectors(forward,desired).multiply(this.camera.quaternion);this.camera.quaternion.slerp(q,1-Math.exp(-dt*4));}
  const speed=Math.min(BH_MAX_SPEED,this.state.command),direction=getForward().clone(),result=advanceObserver(this.ship.toArray(),direction.toArray(),speed,dt*this.state.warp);
  this.ship.fromArray(result.position);this.settings.coordinate+=result.coordinateDelta;this.proper+=result.properDelta;this.reference+=result.referenceDelta;this.state.speed=result.speed;this.state.command=result.speed;this.velocity.copy(direction).multiplyScalar(result.speed);$('throttle').value=sliderFromSpeed(result.speed);
  if(result.hit){this.state.assist=false;keys.clear();this.toast('Límite de exploración: 1,01 rₛ. Sonda detenida por propulsión asistida.');}
 }
 render(){this.camera.updateMatrixWorld();this.view.render(this.camera,this.ship,this.velocity,this.settings);this.renderMarkers();if(!$('exterior').hidden)this.drawExterior();}
 updateUI(){
  const r=this.ship.length()/RS,rate=rates(r,this.state.speed),signal=signalAt(this.settings.coordinate,this.ship.toArray(),this.velocity.toArray());
  $('speed').textContent=fmt(this.state.speed,this.state.speed<10?2:0);$('hudSpeed').textContent=$('speed').textContent;$('hudTarget').textContent='Agujero negro';$('hudDistance').textContent=fmt(r,3)+' rₛ';$('reference').textContent=this.state.speed===0?'ESTACIONARIO · SCHWARZSCHILD':'VELOCIDAD LOCAL · OBSERVADOR ESTÁTICO';$('cRatio').textContent=fmt(this.state.speed/C*100,4)+' % c';
  $('altBody').textContent='DISTANCIA AL HORIZONTE';$('altitude').innerHTML=fmt((r-1)*RS,0)+' <small>km</small>';$('altNote').textContent='RADIO CENTRAL '+fmt(r,3)+' rₛ';$('phase').textContent=this.state.paused?'SIMULACIÓN EN PAUSA':'AGUJERO NEGRO · EXPLORACIÓN ASISTIDA'+(this.state.warp>1?' · ×'+this.state.warp:'');$('epoch').textContent='SCHWARZSCHILD · 1.000.000 M☉';$('reticleText').textContent=this.state.assist?'RUMBO ASISTIDO':'RUMBO LIBRE';$('assist').querySelector('span').textContent=this.state.assist?'ON':'OFF';$('assist').classList.toggle('active',this.state.assist);
  $('warpNote').textContent='Ritmo ×'+this.state.warp+' del tiempo propio · velocidad local < c';$('navigationNote').textContent='Horizonte: '+fmt(RS,0)+' km de radio. La sonda usa propulsión idealizada.';
  $('bhLocal').textContent=clockText(this.proper);$('bhRemote').textContent=clockText(this.reference);$('bhDifference').textContent=clockText(this.reference-this.proper);$('bhRatio').textContent=fmt(rate.ratio,3)+'×';$('bhPosition').textContent=fmt(r,4)+' rₛ';$('bhAcceleration').textContent=holdingAcceleration(r).toExponential(2)+' m/s²';$('bhTides').textContent=tidalAcceleration(r).toExponential(2)+' m/s²';
  $('externalClock').textContent=clockText(this.externalMode==='comparison'?this.reference:signal.emissionTime);$('externalRate').textContent=fmt(this.externalMode==='comparison'?rate.ratio:signal.frequency,3)+'×';
  $('externalNote').textContent=this.externalMode==='comparison'?'Comparación didáctica de relojes en tiempo coordenado de Schwarzschild. No es una señal instantánea.':'Enlace radial con una red de balizas sincronizadas a 1.000 rₛ. Retraso: '+fmt(signal.delay,1)+' s. El reloj muestra la fecha de emisión; puede preceder al inicio.';
  $('bhReadout').hidden=false;
 }
 drawExterior(){
  const canvas=$('exteriorCanvas'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,signal=signalAt(this.settings.coordinate,this.ship.toArray(),this.velocity.toArray()),time=this.externalMode==='comparison'?this.reference:signal.emissionTime;
  ctx.fillStyle='#070e16';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#233341';ctx.lineWidth=1;for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.save();ctx.translate(w*.35,h*.5);ctx.strokeStyle='#608c9d';ctx.beginPath();ctx.arc(0,0,43,0,Math.PI*2);ctx.stroke();ctx.rotate(time*Math.PI/5);ctx.strokeStyle='#f7bc79';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-38);ctx.stroke();ctx.restore();
  const pulse=(time%2+2)%2<.25;ctx.fillStyle=pulse?'#adf5de':'#17332f';ctx.beginPath();ctx.arc(w*.75,h*.5,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8eabb8';ctx.font='12px monospace';ctx.fillText('GIRO · 10 s',w*.35-40,h-18);ctx.fillText('BALIZA · 2 s',w*.75-40,h-18);
 }
 renderMarkers(){
  const container=$('bhStarLabels'),id=$('bhStar').value;if(id==='none'||this.state.mark==='none'||this.state.speed>0){container.replaceChildren();return;}
  const source=this.catalog.find(s=>String(s[0])===id);if(!source)return;
  const now=performance.now(),signature=(this.ship.length()/RS).toFixed(4)+'|'+this.ship.clone().normalize().toArray().map(x=>x.toFixed(4)).join(',')+'|'+id+'|'+this.camera.quaternion.toArray().map(x=>x.toFixed(3)).join(',');
  if(signature===this.markerSignature||now-this.markerTime<500)return;this.markerTime=now;this.markerSignature=signature;
  const images=this.view.referenceImages(this.camera,this.ship,source);container.replaceChildren();
  images.slice(0,6).forEach((image,i)=>{if(image.x<0||image.x>innerWidth||image.y<0||image.y>innerHeight)return;const label=document.createElement('span');label.className='bh-star-label';label.style.left=image.x+'px';label.style.top=image.y+'px';label.textContent=source[1]+' · imagen '+(i+1);container.append(label);});
 }
}
