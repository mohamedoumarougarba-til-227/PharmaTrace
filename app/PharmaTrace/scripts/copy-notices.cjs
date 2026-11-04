// Accompany the exported web assets with the licenses of redistributed libraries.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const dest=path.resolve(__dirname,'../dist/legal');
if(!fs.existsSync(path.resolve(__dirname,'../dist/index.html')))throw Error('Export web first');
fs.mkdirSync(dest,{recursive:true});
const source=path.join(root,'docs/licenses');
for(const file of fs.readdirSync(source).filter(name=>name.endsWith('.txt')))fs.copyFileSync(path.join(source,file),path.join(dest,file));
fs.copyFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(dest,'THIRD_PARTY_NOTICES.txt'));
console.log('Third-party notices copied into dist/legal; no application license chosen.');
