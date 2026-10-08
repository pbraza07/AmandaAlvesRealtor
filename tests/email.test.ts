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
