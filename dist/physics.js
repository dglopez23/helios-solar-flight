export const C=299792.458, MAX_SPEED=C, AU=149597870.7, JD_START=2461317.5, DAY=86400;
export const bodies=[
{id:'sun',name:'Sol',kind:'ESTRELLA · G2V',r:695700,rotation:25.38,tilt:7.25,color:'#fffaf2',map:'sun'},
{id:'mercury',name:'Mercurio',kind:'PLANETA ROCOSO',r:2439.4,rotation:58.6462,tilt:.034,map:'mercury'},
{id:'venus',name:'Venus',kind:'PLANETA ROCOSO',r:6051.8,rotation:-243.018,tilt:2.64,map:'venus_surface'},
{id:'earth',name:'Tierra',kind:'PLANETA ROCOSO',r:6371.0084,rotation:.99726968,tilt:23.439,map:'earth_daymap'},
{id:'moon',name:'Luna',kind:'SATÉLITE DE LA TIERRA',r:1737.4,rotation:27.321661,tilt:6.68,map:'moon',parent:'earth'},
{id:'mars',name:'Marte',kind:'PLANETA ROCOSO',r:3389.5,rotation:1.02595676,tilt:25.19,map:'mars'},
{id:'ceres',map:'ceres',name:'Ceres',kind:'PLANETA ENANO · CINTURÓN PRINCIPAL',r:469.7,rotation:.37809,tilt:4,color:'#817e77'},
{id:'vesta',map:'vesta',name:'Vesta',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:262.7,rotation:.22259,tilt:27,color:'#8d8880'},
{id:'pallas',name:'Palas',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:256,rotation:.32555,tilt:84,color:'#6d6d68'},
{id:'jupiter',name:'Júpiter',kind:'GIGANTE GASEOSO',r:69911,rotation:.41354,tilt:3.13,map:'jupiter'},
{id:'io',map:'io',name:'Ío',kind:'SATÉLITE DE JÚPITER',r:1821.6,rotation:1.769138,tilt:3.13,color:'#c9b675',parent:'jupiter'},
{id:'europa',map:'europa',name:'Europa',kind:'SATÉLITE DE JÚPITER',r:1560.8,rotation:3.551181,tilt:3.13,color:'#b8b19b',parent:'jupiter'},
{id:'ganymede',map:'ganymede',name:'Ganímedes',kind:'SATÉLITE DE JÚPITER',r:2631.2,rotation:7.154553,tilt:3.13,color:'#8e8271',parent:'jupiter'},
{id:'callisto',map:'callisto',name:'Calisto',kind:'SATÉLITE DE JÚPITER',r:2410.3,rotation:16.689018,tilt:3.13,color:'#746f64',parent:'jupiter'},
{id:'saturn',name:'Saturno',kind:'GIGANTE GASEOSO',r:58232,rotation:.44401,tilt:26.73,map:'saturn'},
{id:'titan',map:'titan',name:'Titán',kind:'SATÉLITE DE SATURNO',r:2574.73,rotation:15.945,tilt:26.73,color:'#b79357',parent:'saturn'},
{id:'uranus',name:'Urano',kind:'GIGANTE HELADO',r:25362,rotation:-.71833,tilt:82.23,map:'uranus'},
{id:'neptune',name:'Neptuno',kind:'GIGANTE HELADO',r:24622,rotation:.67125,tilt:28.32,map:'neptune'},
{id:'triton',map:'triton',name:'Tritón',kind:'SATÉLITE DE NEPTUNO',r:1353.4,rotation:-5.876854,tilt:157,color:'#b9b2a8',parent:'neptune'},
{id:'pluto',name:'Plutón',kind:'PLANETA ENANO · DESTINO EXTERIOR',r:1188.3,rotation:-6.38723,tilt:60.4,map:'pluto',color:'#b7a194'},
{id:'charon',map:'charon',name:'Caronte',kind:'SATÉLITE DE PLUTÓN',r:606,rotation:6.38723,tilt:119.6,color:'#96908c',parent:'pluto'},
{id:'ida',name:'Ida',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:15.7,rotation:0.19308333333333336,tilt:0,color:'#8f8174',gm:0.00275,gmEstimated:false},
{id:'gaspra',name:'Gaspra',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:6.1,rotation:0.29341666666666666,tilt:0,color:'#8e8378',gm:0.000125,gmEstimated:true},
{id:'hygiea',name:'Higía',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:203.56,rotation:0.5761666666666666,tilt:0,color:'#5f625f',gm:7,gmEstimated:false},
{id:'psyche',name:'Psique',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:111,rotation:0.1748333333333333,tilt:0,color:'#77756f',gm:1.601,gmEstimated:false},
{id:'eunomia',name:'Eunomia',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:115.8445,rotation:0.25345833333333334,tilt:0,color:'#969088',gm:0.87,gmEstimated:true},
{id:'iris',name:'Iris',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:99.915,rotation:0.2974583333333333,tilt:0,color:'#9a9284',gm:0.68,gmEstimated:true},
{id:'hebe',name:'Hebe',kind:'ASTEROIDE · CINTURÓN PRINCIPAL',r:92.59,rotation:0.3031041666666667,tilt:0,color:'#958d82',gm:0.49,gmEstimated:true},
{id:'halley',name:'Halley',kind:'COMETA · NÚCLEO INACTIVO EN 2026',r:5.5,rotation:2.1999999999999997,tilt:0,color:'#4b4a47',gm:1.47e-05,gmEstimated:true}
];
const atmospheres={earth:{height:120,scale:26,density:1,color:'#508fce'},venus:{height:200,scale:35,density:3,color:'#c4a474'},mars:{height:100,scale:11,density:.32,color:'#cc8967'},titan:{height:600,scale:80,density:3,color:'#d5a255'},jupiter:{height:1500,scale:150,density:2,color:'#c9ab8a'},saturn:{height:1500,scale:200,density:2,color:'#c7b583'},uranus:{height:1000,scale:160,density:2,color:'#7dbbc5'},neptune:{height:1000,scale:130,density:2,color:'#718dc4'},pluto:{height:100,scale:20,density:.03,color:'#9caacb'},triton:{height:60,scale:12,density:.015,color:'#a8b8cf'}};
for(const b of bodies){b.atmosphere=atmospheres[b.id];b.gas=['jupiter','saturn','uranus','neptune'].includes(b.id);}
// Cubic Hermite interpolation using JPL barycentric positions (km) and velocities (km/s).
export function interpolate(rows,jd){
 const step=rows[1][0]-rows[0][0];let i=Math.max(0,Math.min(rows.length-2,Math.floor((jd-rows[0][0])/step)));
 const a=rows[i],b=rows[i+1],h=(b[0]-a[0])*DAY,t=Math.max(0,Math.min(1,(jd-a[0])/(b[0]-a[0]))),t2=t*t,t3=t2*t;
 const p=[];for(let j=0;j<3;j++)p.push((2*t3-3*t2+1)*a[j+1]+(t3-2*t2+t)*h*a[j+4]+(-2*t3+3*t2)*b[j+1]+(t3-t2)*h*b[j+4]);
 return [p[0],p[2],-p[1]];
}
export function speedFromSlider(v){return Math.min(MAX_SPEED,Math.expm1(Math.max(0,Math.min(1000,v))/1000*Math.log1p(MAX_SPEED)));}
export function sliderFromSpeed(v){return 1000*Math.log1p(Math.max(0,Math.min(MAX_SPEED,v)))/Math.log1p(MAX_SPEED);}
// Earliest intersection of moving ship and moving sphere during a simulation step.
export function sweptSphere(a,b,c0,c1,r){
 const p=a.map((v,i)=>v-c0[i]),d=b.map((v,i)=>v-a[i]-(c1[i]-c0[i]));
 const A=d.reduce((s,v)=>s+v*v,0),B=2*p.reduce((s,v,i)=>s+v*d[i],0),D=p.reduce((s,v)=>s+v*v,0)-r*r;
 if(D<0)return 0;if(A<1e-18)return null;const disc=B*B-4*A*D;if(disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;
}
