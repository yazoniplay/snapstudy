export type StudyResult={topic:string;summary:string;flashcards:{question:string;answer:string}[];quiz:{question:string;options:string[];answer:number;explanation:string;topic?:string}[];practiceTest:{question:string;answer:string}[]};
export type StudyLanguage = "en" | "sv" | "ar";
const API_URL=process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL||"https://thqxjxrtcvcrnqnnmjzi.supabase.co/functions/v1/analyze-notes";
async function postStudy(body:Record<string,unknown>):Promise<StudyResult>{
 const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw new Error(data?.error||"AI study request failed");
 if(!data||typeof data.topic!=="string"||typeof data.summary!=="string"||!Array.isArray(data.flashcards)||!Array.isArray(data.quiz)||!Array.isArray(data.practiceTest))throw new Error("The AI returned an incomplete study session. Please try again.");
 return data as StudyResult;
}
export async function analyzeNotes(image:{base64:string;mimeType:string},language:StudyLanguage="en"):Promise<StudyResult>{
 return postStudy({imageBase64:image.base64,mimeType:image.mimeType,language,action:"analyze"});
}
export async function translateStudyResult(studyResult:StudyResult,language:StudyLanguage):Promise<StudyResult>{
 return postStudy({studyResult,language,action:"translate"});
}
