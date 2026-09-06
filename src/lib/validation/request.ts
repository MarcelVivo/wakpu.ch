/** Bound untrusted request bytes while streaming, including chunked bodies without Content-Length. */
export async function readBoundedJson(request:Request):Promise<unknown> {
  if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('CONTENT_TYPE');
  if(Number(request.headers.get('content-length')||0)>16384)throw new Error('BODY_SIZE');
  if(!request.body)throw new SyntaxError('Empty JSON body');
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      length+=value.byteLength;
      if(length>16384){await reader.cancel();throw new Error('BODY_SIZE');}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
