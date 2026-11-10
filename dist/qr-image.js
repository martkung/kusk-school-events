// Apply responsive dimensions after the QR library writes its inline pixel sizes.
export async function drawQrImage(canvas,text,renderer){
 await renderer.toCanvas(canvas,text,{scale:8,margin:4,errorCorrectionLevel:'M'});
 canvas.style.width='100%';canvas.style.maxWidth='320px';canvas.style.height='auto';
 canvas.style.aspectRatio='1 / 1';canvas.style.display='block';canvas.style.margin='16px auto';
 canvas.style.imageRendering='pixelated';canvas.style.backgroundColor='#fff';
}
