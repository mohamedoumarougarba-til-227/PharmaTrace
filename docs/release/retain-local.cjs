// Prepare a clean source snapshot without deleting files or rewriting history.
// Default: inspect only. --apply is reserved for the final publication approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'retain-local-manifest.json')));
const apply=process.argv.slice(2);
if(apply.length>1||(apply.length&&apply[0]!=='--apply'))throw Error('Use no argument (dry-run), or --apply after final approval');
const planned=manifest.files.map(row=>{
 const file=path.resolve(root,row.path);
 if(row.path.split('/').includes('..')||!file.startsWith(root+path.sep)||!(/^(ressources\/|landing\/(maquettes|medias)\/|app\/PharmaTrace\/supabase\/\.temp\/)/.test(row.path)))throw Error('Path outside bounded manifest');
 const bytes=fs.readFileSync(file),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 if(sha!==row.sha256)throw Error('Manifest hash changed: '+row.path);
 return{...row,file,bytes};
});
if(!apply.length){console.log(`DRY RUN: ${planned.length} paths verified; no file/index changed. Final publication approval required for --apply.`);process.exit(0);}
const backupRoot=path.join(root,'A exclure de github/PHASE2_OPEN_SOURCE_20261103/retained-local');
for(const row of planned){const dest=path.join(backupRoot,row.path);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest)){if(!fs.readFileSync(dest).equals(row.bytes))throw Error('Existing backup differs');}else fs.writeFileSync(dest,row.bytes);}
cp.execFileSync('git',['rm','--cached','--ignore-unmatch','--',...planned.map(row=>row.path)],{cwd:root,stdio:'inherit'});
const ignore=path.join(root,'.gitignore'),marker='# Retained local archives approved for source publication';
const previous=fs.readFileSync(ignore,'utf8');
if(!previous.includes(marker))fs.appendFileSync(ignore,'\n'+marker+'\n'+planned.map(row=>'/'+row.path).join('\n')+'\n');
console.log('Git index and ignore rules updated; original files and verified backups remain. No commit or push performed.');
