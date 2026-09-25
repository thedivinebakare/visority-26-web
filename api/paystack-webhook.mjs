import handler from '../server/paystack-webhook.cjs';
export default {
  async fetch(request) {
    const headers=new Headers();let response;
    let size=0;const chunks=[];
    if(request.body){for await(const chunk of request.body){size+=chunk.length;if(size>100000)return new Response('Payload too large',{status:413});chunks.push(Buffer.from(chunk));}}
    await handler({method:request.method,headers:Object.fromEntries(request.headers),body:Buffer.concat(chunks)},{setHeader(k,v){headers.set(k,v);},end(body){response=new Response(body,{status:this.statusCode,headers});}});
    return response;
  }
};
