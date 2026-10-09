// Shared emission model: true frequency factors, compressed illustrative temperature palette.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const fract=x=>x-Math.floor(x),hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
export function noise(x,y){const i=Math.floor(x),j=Math.floor(y),u=smooth(0,1,fract(x)),v=smooth(0,1,fract(y));return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;}
export function thermal(T){const t=clamp(T,1000,40000)/100;return [t<=66?255:329.6987*(t-60)**-.1332048,t<=66?99.4708*Math.log(t)-161.1196:288.1222*(t-60)**-.0755148,t>=66?255:t<=19?0:138.5177*Math.log(t-10)-305.0448].map(x=>clamp(x/255)**2.2);}
export function diskEmission(r,angle,time,shift){const q=Math.log(r),phase=angle-time*.071779/r**1.5,x=Math.cos(phase),y=Math.sin(phase),coarse=noise(x*9+q*17,y*9-q*11),fine=noise(x*31+q*39,y*31-q*27),ribbon=.5+.5*Math.sin(q*55+coarse*18+3*Math.sin(phase*7-q*6));const edge=smooth(3,3.35,r)*(1-smooth(18+coarse*2,21+fine*2,r)),turb=.08+2.2*coarse**2*fine**1.5+.85*ribbon**5*(.15+1.8*noise(x*55+q*65,y*55-q*39)),T=180000*(3/r)**.75*Math.max(0,1-Math.sqrt(3/r))**.25,power=1.65*(3/r)**1.15*clamp(shift,.08,8)**1.65*edge*turb;return thermal(900+10000*clamp(T*shift/85000,0,6)**2.8).map(v=>v*power);}
export function shiftSky(rgb,g){const a=thermal(5800*g),b=thermal(5800);return rgb.map((v,i)=>v*a[i]/Math.max(.001,b[i])*clamp(g,.05,8)**1.5);}
export function jetEmission(x,y,z,time,step,g){const h=Math.abs(y),w=.12+.045*h,p=Math.exp(-(x*x+z*z)/(w*w))*smooth(1.7,3,h)*(1-smooth(38,60,h))*(.3+.7*(.5+.5*Math.sin(h*4-time*.13))**4)*Math.min(step,3)*.12;return thermal(20000*g).map(v=>v*p);}
export const emissionGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
vec3 thermal(float T){float t=clamp(T,1000.,40000.)/100.;float r=t<=66.?255.:329.6987*pow(t-60.,-.1332048);float g=t<=66.?99.4708*log(t)-161.1196:288.1222*pow(t-60.,-.0755148);float b=t>=66.?255.:t<=19.?0.:138.5177*log(t-10.)-305.0448;return pow(clamp(vec3(r,g,b)/255.,0.,1.),vec3(2.2));}
vec3 diskEmission(float r,float angle,float time,float shift){float q=log(r),phase=angle-time*.071779/pow(r,1.5),x=cos(phase),y=sin(phase),coarse=noise(vec2(x*9.+q*17.,y*9.-q*11.)),fine=noise(vec2(x*31.+q*39.,y*31.-q*27.)),ribbon=.5+.5*sin(q*55.+coarse*18.+3.*sin(phase*7.-q*6.));float edge=smoothstep(3.,3.35,r)*(1.-smoothstep(18.+coarse*2.,21.+fine*2.,r)),turb=.08+2.2*pow(coarse,2.)*pow(fine,1.5)+.85*pow(ribbon,5.)*(.15+1.8*noise(vec2(x*55.+q*65.,y*55.-q*39.))),T=180000.*pow(3./r,.75)*pow(max(0.,1.-sqrt(3./r)),.25),power=1.65*pow(3./r,1.15)*pow(clamp(shift,.08,8.),1.65)*edge*turb;return thermal(900.+10000.*pow(clamp(T*shift/85000.,0.,6.),2.8))*power;}
vec3 shiftSky(vec3 rgb,float g){return rgb*thermal(5800.*g)/max(vec3(.001),thermal(5800.))*pow(clamp(g,.05,8.),1.5);}
vec3 jetEmission(vec3 p,float time,float stepSize,float g){float h=abs(p.y),w=.12+.045*h,power=exp(-dot(p.xz,p.xz)/(w*w))*smoothstep(1.7,3.,h)*(1.-smoothstep(38.,60.,h))*(.3+.7*pow(.5+.5*sin(h*4.-time*.13),4.))*min(stepSize,3.)*.12;return thermal(20000.*g)*power;}
`;
