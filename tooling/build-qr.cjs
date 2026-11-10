const path=require('node:path');
require('esbuild').buildSync({entryPoints:[require.resolve('qrcode/lib/browser.js')],bundle:true,platform:'browser',format:'esm',minify:true,outfile:path.join(__dirname,'../dist/vendor/qr.js')});
require('esbuild').buildSync({entryPoints:[path.join(__dirname,'scanner-entry.js')],bundle:true,platform:'browser',format:'esm',minify:true,outfile:path.join(__dirname,'../dist/vendor/scanner.js')});
