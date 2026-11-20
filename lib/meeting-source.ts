import type {FirefliesTranscript} from './fireflies-core';

// Both the compact query and the richer query read an existing transcript.
export async function readMeetingSource(key:string,id:string,queryProvider: <T>(key:string,query:string,vars:Record<string,unknown>)=>Promise<T>){
 const query=(extra:string)=>'query($id:String!){ transcript(id:$id) { id title date duration speakers { id name } sentences { text start_time speaker_name } summary { bullet_gist overview outline notes action_items topics_discussed '+extra+' } } }';
 type Response={transcript:FirefliesTranscript|null};
 try{
  return (await queryProvider<Response>(key,query('short_summary transcript_chapters'),{id})).transcript;
 }catch(error){
  if(!(error instanceof Error)||!['Fireflies rejected the API request format.','Your connected Fireflies account requires Pro or higher for API uploads.','Your Fireflies workspace administrator has disabled this feature.'].includes(error.message))throw error;
  return (await queryProvider<Response>(key,query(''),{id})).transcript;
 }
}
