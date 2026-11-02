import assert from "node:assert/strict";
import test from "node:test";
import { sendLeadEmails } from "../lib/email";

test("Gmail API delivers the inquiry and personalized client confirmation", async () => {
  const originalFetch=globalThis.fetch;
  const originalEnvironment={
    clientId:process.env.GMAIL_CLIENT_ID,
    clientSecret:process.env.GMAIL_CLIENT_SECRET,
    refreshToken:process.env.GMAIL_REFRESH_TOKEN,
    senderEmail:process.env.GMAIL_SENDER_EMAIL,
    recipient:process.env.LEAD_NOTIFICATION_EMAIL,
    siteEmail:process.env.SITE_EMAIL,
    databaseUrl:process.env.DATABASE_URL
  };
  const messages:string[]=[];

  try {
    process.env.GMAIL_CLIENT_ID="client-id";
    process.env.GMAIL_CLIENT_SECRET="client-secret";
    process.env.GMAIL_REFRESH_TOKEN="refresh-token";
    process.env.GMAIL_SENDER_EMAIL="amandaborgesalves@gmail.com";
    process.env.LEAD_NOTIFICATION_EMAIL="amandaborgesalves@gmail.com";
    process.env.SITE_EMAIL="amandaborgesalves@gmail.com";
    delete process.env.DATABASE_URL;
    globalThis.fetch=async (input,init) => {
      const url=String(input);
      if(url.includes("oauth2.googleapis.com/token"))return new Response(JSON.stringify({access_token:"access-token"}),{status:200,headers:{"content-type":"application/json"}});
      const payload=JSON.parse(String(init?.body||"{}")) as {raw:string};
      messages.push(Buffer.from(payload.raw,"base64url").toString("utf8"));
      return new Response(JSON.stringify({id:`message-${messages.length}`}),{status:200,headers:{"content-type":"application/json"}});
    };

    const result=await sendLeadEmails({id:"lead-1",type:"BUYER",firstName:"Taylor",lastName:"Client",email:"taylor@example.com",phone:"813-555-0100",preferredContact:"Email",bestTime:null,language:"English",source:"Website",details:{timeline:"Three to six months"}},[{name:"property-photo-1.jpg",contentType:"image/jpeg",content:Buffer.from("test-photo")}]);

    assert.deepEqual(result,{adminSent:true,clientSent:true});
    assert.equal(messages.length,2);
    assert.match(messages[0],/multipart\/mixed/);
    assert.match(messages[0],/filename="property-photo-1.jpg"/);
    assert.match(messages[0],/dGVzdC1waG90bw==/);
    assert.doesNotMatch(messages[1],/multipart\/mixed/);
    assert.match(messages[0],/To: amandaborgesalves@gmail\.com/);
    assert.match(messages[0],/Reply-To: taylor@example\.com/);
    assert.match(messages[1],/To: taylor@example\.com/);
    assert.match(messages[1],/Reply-To: amandaborgesalves@gmail\.com/);
  } finally {
    globalThis.fetch=originalFetch;
    for(const [key,value] of Object.entries(originalEnvironment)){
      const environmentKey={clientId:"GMAIL_CLIENT_ID",clientSecret:"GMAIL_CLIENT_SECRET",refreshToken:"GMAIL_REFRESH_TOKEN",senderEmail:"GMAIL_SENDER_EMAIL",recipient:"LEAD_NOTIFICATION_EMAIL",siteEmail:"SITE_EMAIL",databaseUrl:"DATABASE_URL"}[key]!;
      if(value===undefined)delete process.env[environmentKey];else process.env[environmentKey]=value;
    }
  }
});

test("every inquiry routes from Amanda's Gmail despite a different public contact address, and retries only missing messages",async()=>{
 const keys=['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN','GMAIL_SENDER_EMAIL','LEAD_NOTIFICATION_EMAIL','SITE_EMAIL','DATABASE_URL'] as const;
 const environment=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const originalFetch=globalThis.fetch;const messages:{url:string;mime:string}[]=[];let failOwner=false;
 const lead={id:'email-routing-test',type:'BUYER' as const,firstName:'Routing',lastName:'Test',email:'client@example.com',phone:'not-applicable',preferredContact:'Email',bestTime:null,language:'English',source:'Test',details:{} as Record<string,unknown>};
 try{
  process.env.GMAIL_CLIENT_ID='test-client';process.env.GMAIL_CLIENT_SECRET='test-secret';process.env.GMAIL_REFRESH_TOKEN='test-refresh';process.env.GMAIL_SENDER_EMAIL='amandaborgesalves@gmail.com';process.env.SITE_EMAIL='public-contact@example.com';delete process.env.LEAD_NOTIFICATION_EMAIL;delete process.env.DATABASE_URL;
  globalThis.fetch=async(input,init)=>{
   if(String(input).includes('oauth2.googleapis.com'))return Response.json({access_token:'test-token'});
   const mime=Buffer.from(JSON.parse(String(init?.body)).raw,'base64url').toString();messages.push({url:String(input),mime});return failOwner?Response.json({error:{code:403}},{status:403}):Response.json({id:'test-message'});
  };
  for(const purpose of ['', 'Lifestyle consultation','Travel opportunities','Seller']){
   messages.length=0;const result=await sendLeadEmails({...lead,type:purpose==='Seller'?'SELLER':'BUYER',details:purpose==='Seller'?{}:{inquiryPurpose:purpose}});
   assert.deepEqual(result,{adminSent:true,clientSent:true});assert.equal(messages.length,2);
   for(const message of messages){assert.match(message.url,/users\/amandaborgesalves%40gmail\.com\/messages\/send$/);assert.match(message.mime,/From: Amanda Alves <amandaborgesalves@gmail\.com>/)}
   assert.match(messages[0].mime,/To: amandaborgesalves@gmail\.com/);assert.match(messages[0].mime,/Reply-To: client@example\.com/);assert.match(messages[1].mime,/Reply-To: amandaborgesalves@gmail\.com/);assert.doesNotMatch(messages[1].mime,/public-contact@example\.com/);
  }
  messages.length=0;assert.deepEqual(await sendLeadEmails(lead,[],{adminSent:true,clientSent:false}),{adminSent:true,clientSent:true});assert.equal(messages.length,1);assert.match(messages[0].mime,/To: client@example\.com/);
  messages.length=0;assert.deepEqual(await sendLeadEmails(lead,[],{adminSent:true,clientSent:true}),{adminSent:true,clientSent:true});assert.equal(messages.length,0);
  failOwner=true;messages.length=0;assert.deepEqual(await sendLeadEmails(lead),{adminSent:false,clientSent:false});assert.equal(messages.length,1);assert.match(messages[0].mime,/To: amandaborgesalves@gmail\.com/);
 }finally{globalThis.fetch=originalFetch;for(const key of keys){const value=environment[key];if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
