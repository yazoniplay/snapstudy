export type StudyResult={topic:string;summary:string;flashcards:{question:string;answer:string}[];quiz:{question:string;options:string[];answer:number;explanation:string}[];practiceTest:{question:string;answer:string}[]};
const API_URL=process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL||"https://thqxjxrtcvcrnqnnmjzi.supabase.co/functions/v1/analyze-notes";
export async function analyzeNotes(image:{base64:string;mimeType:string}):Promise<StudyResult>{
 const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageBase64:image.base64,mimeType:image.mimeType})});
 const data=await response.json();if(!response.ok)throw new Error(data?.error||"AI analysis failed");return data;
}