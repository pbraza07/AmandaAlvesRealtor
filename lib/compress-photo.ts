export async function compressPhoto(file: File): Promise<File> {
 if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Please choose JPG, PNG, or WebP photos.');
 if (file.size > 20 * 1024 * 1024) throw new Error('Each original photo must be smaller than 20 MB.');
 const bitmap = await createImageBitmap(file);
 try {
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Photo processing is unavailable in this browser.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Unable to compress photo.')), 'image/jpeg', .78));
  if (blob.size > 2 * 1024 * 1024) throw new Error('This photo is too large after compression. Please select a smaller photo.');
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {type:'image/jpeg'});
 } finally { bitmap.close(); }
}
