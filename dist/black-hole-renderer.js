import * as THREE from './assets/three.module.js';
import {RS,lapse,traceRay,aberrateToStatic} from './black-hole-physics.js';

const vertex='varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}';
const fragment=`
precision highp float;
varying vec2 uvScreen;
uniform sampler2D starsMap,milkyMap;
uniform mat3 attitude;
uniform vec3 observer,beta;
uniform float aspect,tanFov,clock,exposure;
uniform bool disk,guides;
const float PI=3.14159265359;
float accel(float u){return -u+1.5*u*u;}
vec3 sky(vec3 d){
 vec2 uv=vec2(.5+atan(d.z,d.x)/(2.*PI),.5+asin(clamp(d.y,-1.,1.))/PI);
 vec3 col=texture2D(starsMap,uv).rgb;
 float eqY=-d.z*.917482-d.y*.397777,eqZ=-d.z*.397777+d.y*.917482;
 vec2 mw=vec2(.5-atan(eqY,d.x)/(2.*PI),.5+asin(clamp(eqZ,-1.,1.))/PI);
 return pow(col,vec3(2.2))+pow(texture2D(milkyMap,mw).rgb*.22,vec3(2.2));
}
vec3 thermal(float temperature){
 float t=temperature/100.;
 float r=t<=66.?255.:329.6987*pow(max(1.,t-60.),-.1332048);
 float g=t<=66.?99.4708*log(max(1.,t))-161.1196:288.1222*pow(max(1.,t-60.),-.0755148);
 float b=t>=66.?255.:t<=19.?0.:138.5177*log(t-10.)-305.0448;
 return pow(clamp(vec3(r,g,b)/255.,0.,1.),vec3(2.2));
}
void main(){
 vec2 p=uvScreen*2.-1.;vec3 ray=normalize(attitude*vec3(p.x*aspect*tanFov,p.y*tanFov,-1.));
 float b2=dot(beta,beta),gamma=1./sqrt(max(.001,1.-b2));
 if(b2>.000001){float dotB=dot(ray,beta);ray=(ray+(((gamma-1.)*dotB/b2)-gamma)*beta)/(gamma*(1.-dotB));}
 float r=length(observer),f=1.-1./r,cosA=clamp(dot(ray,observer/r),-1.,1.),sinA=sqrt(max(0.,1.-cosA*cosA));
 vec3 er=observer/r,et=sinA>.000001?normalize(ray-er*cosA):vec3(0.,1.,0.);
 float observerShift=gamma*(1.+dot(beta,ray))/sqrt(f);
 vec3 color=vec3(0.);bool finished=false;bool diskHit=false;float guide=0.;
 if(sinA<.00001){if(cosA>0.)color=sky(er);finished=true;}
 float impact=r*sinA/sqrt(f),u=1./r,w=-cosA/max(.00001,impact),phi=0.;
 for(int i=0;i<640;i++){
  if(finished)break;
  float h=.025,oldU=u,oldW=w,oldPhi=phi;
  float a1=accel(u),k2u=w+h*a1*.5,k2w=accel(u+h*w*.5),k3u=w+h*k2w*.5,k3w=accel(u+h*k2u*.5),k4u=w+h*k3w,k4w=accel(u+h*k3u);
  u+=h*(w+2.*k2u+2.*k3u+k4u)/6.;w+=h*(a1+2.*k2w+2.*k3w+k4w)/6.;phi+=h;
  vec3 a=er*cos(oldPhi)+et*sin(oldPhi),b=er*cos(phi)+et*sin(phi);
  if(guides){
   if((oldU-1./1.5)*(u-1./1.5)<0.)guide=max(guide,.2);
   if((oldU-1./3.)*(u-1./3.)<0.)guide=max(guide,.07);
  }
  if(disk&&a.y*b.y<0.){
   float frac=abs(a.y)/(abs(a.y)+abs(b.y)),angle=mix(oldPhi,phi,frac),hitU=mix(oldU,u,frac),rr=1./max(.000001,hitU);
   if(rr>=3.&&rr<=22.){
    vec3 radial=er*cos(angle)+et*sin(angle),tangent=-er*sin(angle)+et*cos(angle);
    float hitW=mix(oldW,w,frac),ff=1.-1./rr;
    vec3 backwards=normalize(-hitW/sqrt(ff)*radial+hitU*tangent);
    vec3 orbit=normalize(vec3(-radial.z,0.,radial.x));float speed=sqrt(1./(2.*(rr-1.))),gasGamma=1./sqrt(1.-speed*speed);
    float shift=sqrt(ff)*observerShift/(gasGamma*(1.+speed*dot(orbit,backwards)));
    float temperature=12000.*pow(3./rr,.75);
    float edge=smoothstep(3.,3.4,rr)*(1.-smoothstep(18.,22.,rr));
    float pattern=1.+.12*sin(atan(radial.z,radial.x)*9.+rr*4.-clock*.018/pow(rr,1.5));
    color=thermal(temperature*shift)*pow(3./rr,2.)*pow(clamp(shift,.05,12.),3.)*edge*pattern*8.;finished=true;diskHit=true;
   }
  }
  if(!finished&&u>=1.){finished=true;color=vec3(0.);}
  if(!finished&&u<=0.){
   float angle=oldPhi+h*oldU/(oldU-u);color=sky(normalize(er*cos(angle)+et*sin(angle)));finished=true;
  }
 }
 // Stellar spectral response is approximate; tracing and the frequency factor are physical.
 if(!diskHit){float g=clamp(observerShift,.05,12.);color*=pow(g,3.)*mix(vec3(1.),vec3(.55,.75,1.),clamp(log(g)*.4,0.,1.));}
 color+=guide*vec3(.12,.65,.8);
 color=vec3(1.)-exp(-color*exposure);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;

export class BlackHoleRenderer{
 constructor(renderer,canvas){
  this.renderer=renderer;this.canvas=canvas;this.software=!!renderer.ctx;this.last=0;this.quality='auto';this.adaptiveWidth=640;this.frameMean=25;this.qualityTime=0;
  if(!this.software){
   this.uniforms={starsMap:{value:null},milkyMap:{value:null},attitude:{value:new THREE.Matrix3()},observer:{value:new THREE.Vector3()},beta:{value:new THREE.Vector3()},aspect:{value:1},tanFov:{value:1},clock:{value:0},exposure:{value:1},disk:{value:true},guides:{value:false}};
   this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false})));
   this.target=new THREE.WebGLRenderTarget(640,360,{depthBuffer:false});this.output=new THREE.Scene();
   this.output.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:{image:{value:this.target.texture}},vertexShader:vertex,fragmentShader:'varying vec2 uvScreen;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,uvScreen);\n#include <colorspace_fragment>\n}',depthTest:false,depthWrite:false})));
  }else{this.low=document.createElement('canvas');this.ctx=this.low.getContext('2d');}
 }
 setSky(catalog,milkyTexture,colorForStar){
  this.catalog=catalog;this.milky=milkyTexture;
  const sky=document.createElement('canvas');sky.width=4096;sky.height=2048;const ctx=sky.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,sky.width,sky.height);
  for(const s of catalog){
   const d=new THREE.Vector3(s[2],s[3],s[4]).normalize(),x=(.5+Math.atan2(d.z,d.x)/(2*Math.PI))*sky.width,y=(.5-Math.asin(d.y)/Math.PI)*sky.height;
   const color=colorForStar(s[6]??.65).map(v=>Math.round(v*255)),power=Math.max(.035,Math.min(1,10**(-.4*(s[5]-2)))),size=Math.max(.7,Math.min(3,1.5+(2-s[5])*.35));
   ctx.fillStyle=`rgba(${color.join(',')},${power*.95})`;
   for(const wrap of [-sky.width,0,sky.width]){ctx.beginPath();ctx.arc(x+wrap,y,Math.max(.65,size*.65),0,Math.PI*2);ctx.fill();}
  }
  this.starTexture=new THREE.CanvasTexture(sky);this.starTexture.wrapS=THREE.RepeatWrapping;this.starTexture.minFilter=THREE.LinearFilter;this.starTexture.magFilter=THREE.LinearFilter;
  if(!this.software){this.uniforms.starsMap.value=this.starTexture;this.uniforms.milkyMap.value=milkyTexture;}
  else{
   this.starPixels={width:sky.width,height:sky.height,data:ctx.getImageData(0,0,sky.width,sky.height).data};
   const mw=document.createElement('canvas');mw.width=milkyTexture.image.width;mw.height=milkyTexture.image.height;const mc=mw.getContext('2d',{willReadFrequently:true});mc.drawImage(milkyTexture.image,0,0);this.milkyPixels={width:mw.width,height:mw.height,data:mc.getImageData(0,0,mw.width,mw.height).data};
  }
 }
 render(camera,position,velocity,settings){
  if(!this.catalog)return;
  const beta=velocity.clone().divideScalar(299792.458),r=position.length()/RS;
  const exposure=settings.exposure/Math.max(1,Math.pow(1/lapse(r),1.1));
  if(!this.software){
   const now=performance.now();if(this.renderTime&&now-this.renderTime<250)this.frameMean=this.frameMean*.96+(now-this.renderTime)*.04;this.renderTime=now;
   if(now-this.qualityTime>2000){if(this.frameMean>45)this.adaptiveWidth=Math.max(320,this.adaptiveWidth-128);else if(this.frameMean<24)this.adaptiveWidth=Math.min(960,this.adaptiveWidth+128);this.qualityTime=now;}
   const width=Math.min(this.canvas.width,this.quality==='high'?1280:this.adaptiveWidth),height=Math.round(width*this.canvas.height/this.canvas.width);
   if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
   Object.assign(this.uniforms.aspect,{value:camera.aspect});this.uniforms.tanFov.value=Math.tan(camera.fov*Math.PI/360);this.uniforms.observer.value.copy(position).divideScalar(RS);this.uniforms.beta.value.copy(beta);this.uniforms.attitude.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(camera.quaternion));
   this.uniforms.clock.value=settings.coordinate;this.uniforms.exposure.value=exposure;this.uniforms.disk.value=settings.disk;this.uniforms.guides.value=settings.guides;
   this.renderer.setRenderTarget(this.target);this.renderer.render(this.scene,this.camera);this.renderer.setRenderTarget(null);this.renderer.render(this.output,this.camera);
  }else this.renderCPU(camera,position,beta,settings,exposure);
 }
 renderCPU(camera,position,beta,settings,exposure){
  const now=performance.now();if(now-this.last<140)return;this.last=now;
  const width=Math.min(this.canvas.width,this.quality==='high'?320:176),height=Math.round(width/ camera.aspect);
  if(this.low.width!==width||this.low.height!==height){this.low.width=width;this.low.height=height;}
  const image=this.ctx.createImageData(width,height),er=position.clone().normalize(),r=position.length()/RS,tan=Math.tan(camera.fov*Math.PI/360),betaArray=beta.toArray();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const local=new THREE.Vector3(((x+.5)/width*2-1)*tan*camera.aspect,(1-(y+.5)/height*2)*tan,-1).normalize().applyQuaternion(camera.quaternion),ray=new THREE.Vector3().fromArray(aberrateToStatic(local.toArray(),betaArray)),cosA=Math.max(-1,Math.min(1,ray.dot(er))),et=ray.clone().addScaledVector(er,-cosA).normalize();
   let color=null,guide=0;
   const result=traceRay(r,cosA,settings.disk||settings.guides?(p0,p1,u0,u1,w0,w1)=>{
    if(settings.guides){if((u0-1/1.5)*(u1-1/1.5)<0)guide=Math.max(guide,.2);if((u0-1/3)*(u1-1/3)<0)guide=Math.max(guide,.07);}
    if(!settings.disk)return false;
    const a=er.y*Math.cos(p0)+et.y*Math.sin(p0),b=er.y*Math.cos(p1)+et.y*Math.sin(p1);
    if(a*b>=0)return false;
    const fraction=Math.abs(a)/(Math.abs(a)+Math.abs(b)),angle=p0+(p1-p0)*fraction,hitU=u0+(u1-u0)*fraction,rr=1/hitU;if(rr<3||rr>22)return false;
    const radial=er.clone().multiplyScalar(Math.cos(angle)).addScaledVector(et,Math.sin(angle)),tangent=er.clone().multiplyScalar(-Math.sin(angle)).addScaledVector(et,Math.cos(angle)),hitW=w0+(w1-w0)*fraction,backwards=radial.clone().multiplyScalar(-hitW/lapse(rr)).addScaledVector(tangent,hitU).normalize(),orbit=new THREE.Vector3(-radial.z,0,radial.x).normalize(),gasSpeed=Math.sqrt(1/(2*(rr-1))),gamma=1/Math.sqrt(1-beta.lengthSq()),shift=lapse(rr)/lapse(r)*gamma*(1+beta.dot(ray))/(1/Math.sqrt(1-gasSpeed*gasSpeed)*(1+gasSpeed*orbit.dot(backwards)));
    const t=12000*(3/rr)**.75*shift/100,R=t<=66?255:329.6987*Math.max(1,t-60)**(-.1332048),G=t<=66?99.4708*Math.log(Math.max(1,t))-161.1196:288.1222*Math.max(1,t-60)**(-.0755148),B=t>=66?255:t<=19?0:138.5177*Math.log(t-10)-305.0448;
    const edge=Math.max(0,Math.min(1,(rr-3)/.4))*Math.max(0,Math.min(1,(22-rr)/4)),power=(3/rr)**2*Math.min(12,Math.max(.05,shift))**3*edge*8;
    color=[R,G,B].map(v=>(Math.max(0,Math.min(255,v))/255)**2.2*power);return true;
   }:null);
   if(!color){if(result.captured)color=[0,0,0];else{const d=result.radial?er:er.clone().multiplyScalar(Math.cos(result.phi)).addScaledVector(et,Math.sin(result.phi));color=this.sampleSky(d);const g=Math.min(12,Math.max(.05,1/lapse(r)/Math.sqrt(1-beta.lengthSq())*(1+beta.dot(ray)))),tint=Math.max(0,Math.min(1,Math.log(g)*.4));color=color.map((v,i)=>v*g**3*(1-tint+tint*[.55,.75,1][i]));}}
   if(guide)color=color.map((v,i)=>v+guide*[.12,.65,.8][i]);
   const k=(y*width+x)*4;for(let j=0;j<3;j++)image.data[k+j]=255*Math.pow(1-Math.exp(-color[j]*exposure),1/2.2);image.data[k+3]=255;
  }
  this.ctx.putImageData(image,0,0);this.renderer.ctx.drawImage(this.low,0,0,this.canvas.width,this.canvas.height);
 }
 sampleSky(d){
  const sample=(tex,u,v)=>{const x=((Math.floor(u*tex.width)%tex.width)+tex.width)%tex.width,y=Math.max(0,Math.min(tex.height-1,Math.floor(v*tex.height))),k=(y*tex.width+x)*4;return [0,1,2].map(j=>tex.data[k+j]/255);};
  const stars=sample(this.starPixels,.5+Math.atan2(d.z,d.x)/(2*Math.PI),.5-Math.asin(Math.max(-1,Math.min(1,d.y)))/Math.PI),eqY=-d.z*.917482-d.y*.397777,eqZ=-d.z*.397777+d.y*.917482,mw=sample(this.milkyPixels,.5-Math.atan2(eqY,d.x)/(2*Math.PI),.5-Math.asin(Math.max(-1,Math.min(1,eqZ)))/Math.PI);
  return stars.map((v,i)=>v**2.2+(mw[i]*.22)**2.2);
 }
 referenceImages(camera,position,source){
  // Invert the same transfer function. Secondary images are not duplicate scene objects.
  const er=position.clone().normalize(),d=new THREE.Vector3(source[2],source[3],source[4]).normalize(),cos=d.dot(er),theta=Math.acos(Math.max(-1,Math.min(1,cos))),t=d.clone().addScaledVector(er,-cos).normalize(),r=position.length()/RS,roots=[];
  if(t.lengthSq()<.1)return roots;
  let prev=null;
  const cone=Math.asin(Math.min(1,3*Math.sqrt(3)/2*lapse(r)/r)),limit=r>=1.5?Math.PI-cone:cone;
  for(let i=1;i<1200;i++){
   // Dense sampling near the critical escape cone resolves secondary winding images.
   const tSample=i/1200,alpha=limit*(1-(1-tSample)**4),result=traceRay(r,Math.cos(alpha));if(result.captured){prev=null;continue;}
   if(prev){for(const sign of [1,-1])for(let turn=0;turn<3;turn++){
    const target=sign*theta+turn*2*Math.PI;if(target<0)continue;
    if((prev.phi-target)*(result.phi-target)<=0&&Math.abs(result.phi-prev.phi)<1){
     let lo=prev.alpha,hi=alpha;for(let j=0;j<16;j++){const mid=(lo+hi)/2,rr=traceRay(r,Math.cos(mid));if((rr.phi-target)*(prev.phi-target)>0)lo=mid;else hi=mid;}
     const a=(lo+hi)/2,ray=er.clone().multiplyScalar(Math.cos(a)).addScaledVector(t,sign*Math.sin(a)),local=ray.clone().applyQuaternion(camera.quaternion.clone().invert());if(local.z<0){const screen=ray.clone().project(camera);roots.push({x:(screen.x*.5+.5)*innerWidth,y:(.5-screen.y*.5)*innerHeight,turn});}
    }
   }}prev={alpha,phi:result.phi};
  }
  return roots;
 }
}
