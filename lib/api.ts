export type StudyResult={topic:string;summary:string;flashcards:{question:string;answer:string}[];quiz:{question:string;options:string[];answer:number;explanation:string}[];practiceTest:{question:string;answer:string}[]};
const API_URL=process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL;
export async function analyzeNotes(imageBase64:string):Promise<StudyResult>{
  if(!API_URL) throw new Error("Missing EXPO_PUBLIC_SUPABASE_FUNCTION_URL");
  const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64})});
  const data=await response.json();
  if(!response.ok) throw new Error(data?.error||"AI analysis failed");
  return data;
}