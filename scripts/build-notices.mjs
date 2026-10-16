import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
const output=['Third-party software notices','Vibe Coding Notes uses the following open-source components. See each component license below.',''];
for(const [location,info] of Object.entries(lock.packages)){
 if(!location||info.dev)continue;
 const directory=resolve(root,location);
 let pkg,files;try{pkg=JSON.parse(await readFile(resolve(directory,'package.json'),'utf8'));files=await readdir(directory)}catch{continue}
 output.push('='.repeat(70),`${pkg.name} ${pkg.version} — ${pkg.license||'See license text'}`);
 for(const name of files.filter(f=>/^(licen[sc]e|notice|copying)(\.[a-z]+)?$/i.test(f))){try{output.push(`\n[${name}]\n`,await readFile(resolve(directory,name),'utf8'))}catch{}}
}
await writeFile(resolve(root,'dist/THIRD-PARTY-NOTICES.txt'),output.join('\n'));
console.log('Third-party license notices added to dist.');

// Keep previously shared standalone-file links usable after replacing the app.
await writeFile(resolve(root, "dist/festival.html"), await readFile(resolve(root, "festival.html")));
