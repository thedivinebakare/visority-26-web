import {readFile,writeFile} from 'node:fs/promises';
const path='scripts/build-pages.mjs';
let source=await readFile(path,'utf8');
source=source.replace('src="/Brand_Assets/02.%20Images/${img}.png"','src="/assets/images/${img}-960.webp" srcset="/assets/images/${img}-480.webp 480w, /assets/images/${img}-960.webp 960w" sizes="(max-width: 767px) 100vw, 50vw"');
await writeFile(path,source);
for(const [name,url] of [['Bricolage-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt'],['Instrument-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/OFL.txt']]){const response=await fetch(url);if(!response.ok)throw new Error(`Font licence: ${response.status}`);await writeFile('fonts/'+name,await response.text());}
console.log('Responsive portrait markup and font licences ready.');
