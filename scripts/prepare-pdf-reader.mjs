import {cpSync, mkdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=path.dirname(require.resolve('pdfjs-dist/package.json'));
const {version}=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
const out=path.resolve('public/pdf-reader',version);
mkdirSync(out,{recursive:true});
for(const file of ['pdf.min.mjs','pdf.worker.min.mjs']){
  cpSync(path.join(root,'legacy/build',file),path.join(out,file));
}
cpSync(path.join(root,'standard_fonts'),path.join(out,'standard_fonts'),{recursive:true});
cpSync(path.join(root,'LICENSE'),path.join(out,'LICENSE'));
