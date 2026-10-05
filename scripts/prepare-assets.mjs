import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync,brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(resolve(root,'assets-manifest.json'),'utf8'));
const hash=data=>createHash('sha256').update(data).digest('hex');
let files=0;
if(!manifest.bundles.every(bundle=>existsSync(resolve(root,bundle.file)))){
 const origin='https://juegos-dglopez.dglopez.chatgpt.site/helios/';
 let sourceData={};
 if(Object.entries(manifest.files).some(([name,expected])=>name.startsWith('data-sources/')&&(!existsSync(resolve(root,name))||hash(readFileSync(resolve(root,name)))!==expected))){
  const archive=manifest.sourceDataArchive;
  if(!archive||archive.file!=='source-data.json.br')throw Error('Falta el archivo de fuentes');
  const response=await fetch(new URL(archive.file,origin),{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error('No se pudieron descargar las fuentes científicas');
  const packed=Buffer.from(await response.arrayBuffer());
  if(hash(packed)!==archive.sha256)throw Error('Archivo de fuentes dañado');
  sourceData=JSON.parse(brotliDecompressSync(packed));
 }
 for(const [name,expected] of Object.entries(manifest.files)){
  if(!(name.startsWith('dist/assets/')||name.startsWith('data-sources/'))||name.includes('..')||name.includes('\\'))throw Error('Ruta inválida: '+name);
  const target=resolve(root,name);
  if(existsSync(target)&&hash(readFileSync(target))===expected){files++;continue;}
  const relative=name.startsWith('dist/')?name.slice(5):name;
  let data;
  if(name.startsWith('data-sources/')){
   if(typeof sourceData[name]!=='string')throw Error('Falta la fuente '+name);
   data=Buffer.from(sourceData[name],'utf8');
  }else{
   const response=await fetch(new URL(relative,origin),{signal:AbortSignal.timeout(120000)});
   if(!response.ok)throw Error('No se pudo descargar '+name+' ('+response.status+')');
   data=Buffer.from(await response.arrayBuffer());
  }
  if(hash(data)!==expected)throw Error('Recurso dañado: '+name);
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data);files++;
  console.log('Preparado: '+name);
 }
 console.log(`HELIOS: ${files} recursos verificados y preparados.`);
 process.exit(0);
}
for(const bundle of manifest.bundles){
 const zip=readFileSync(resolve(root,bundle.file));
 if(hash(zip)!==bundle.sha256)throw Error('Paquete dañado: '+bundle.file);
 let end=zip.length-22;
 while(end>=Math.max(0,zip.length-65557)&&zip.readUInt32LE(end)!==0x06054b50)end--;
 if(end<0)throw Error('ZIP inválido: '+bundle.file);
 const count=zip.readUInt16LE(end+10);let offset=zip.readUInt32LE(end+16);
 for(let i=0;i<count;i++){
  if(zip.readUInt32LE(offset)!==0x02014b50)throw Error('Directorio ZIP inválido');
  const method=zip.readUInt16LE(offset+10),size=zip.readUInt32LE(offset+20),length=zip.readUInt16LE(offset+28),extra=zip.readUInt16LE(offset+30),comment=zip.readUInt16LE(offset+32),local=zip.readUInt32LE(offset+42);
  const name=zip.toString('utf8',offset+46,offset+46+length);offset+=46+length+extra+comment;
  if(!(name.startsWith('dist/assets/')||name.startsWith('data-sources/'))||name.includes('..')||name.includes('\\')||!manifest.files[name])throw Error('Ruta ZIP inválida: '+name);
  const target=resolve(root,name),expected=manifest.files[name];
  if(existsSync(target)&&hash(readFileSync(target))===expected){files++;continue;}
  if(zip.readUInt32LE(local)!==0x04034b50)throw Error('Entrada ZIP inválida');
  const start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28),compressed=zip.subarray(start,start+size);
  const data=method===0?compressed:method===8?inflateRawSync(compressed):null;
  if(!data||hash(data)!==expected)throw Error('Recurso dañado: '+name);
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data);files++;
 }
}
if(files!==Object.keys(manifest.files).length)throw Error('Faltan recursos');
console.log(`HELIOS: ${files} recursos verificados y preparados.`);
