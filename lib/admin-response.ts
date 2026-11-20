/** Admin routes normally return JSON. A login redirect or hosting error may return HTML. */
export async function adminResponse(response:Response){
  if(response.status===401 || (response.redirected && new URL(response.url).pathname==='/admin/login')){
    throw new Error('Your session has expired. Sign in to the owner dashboard again.');
  }
  if(response.status===413)throw new Error('The upload was too large. Choose a recording up to 60 MB.');
  const data=response.headers.get('content-type')?.includes('application/json')
    ? await response.json().catch(()=>null) : null;
  if(!data || typeof data!=='object'){
    throw new Error('The website could not confirm this request. Refresh the page and check its status before trying again.');
  }
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'The request could not be completed. Please try again.');
  return data;
}
