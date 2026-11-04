const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../dist/_expo/static/js/web');
const file=fs.readdirSync(dir).find(name=>/^entry-.*\.js$/.test(name));
assert.ok(file,'Web entry not exported');
const entry=fs.readFileSync(path.join(dir,file),'utf8');
const expected=process.env.EXPO_PUBLIC_SUPABASE_URL;
if(expected)assert.ok(entry.includes(expected),'Stale Metro environment in export; rebuild with --clear');
assert.ok(!/\bsb_secret_[A-Za-z0-9_-]{15,}\b/.test(entry),'Secret key in bundle');
for(const jwt of entry.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){
  try{assert.notEqual(JSON.parse(Buffer.from(jwt[1],'base64url')).role,'service_role','Privileged JWT in bundle');}catch(e){if(e.code==='ERR_ASSERTION')throw e;}
}
console.log('Web export checked: entry present, explicit environment consistent, no privileged key pattern.');
