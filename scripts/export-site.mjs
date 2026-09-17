import {cp,mkdir,copyFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'dist');
await mkdir(out,{recursive:true});
for(const path of ['index.html','register','partners','ambassadors','checkout','access','vip','assets','fonts']){
  await cp(resolve(root,path),resolve(out,path),{recursive:true});
}
// Inter Tight remains the local fallback. Keep its existing URL without publishing the source asset archive.
const fontDir='Brand_Assets/00. FOnts/Inter_Tight';
await mkdir(resolve(out,fontDir),{recursive:true});
await copyFile(resolve(root,fontDir,'InterTight-VariableFont_wght.ttf'),resolve(out,fontDir,'InterTight-VariableFont_wght.ttf'));
console.log('Production files prepared in dist/. No deployment performed.');
