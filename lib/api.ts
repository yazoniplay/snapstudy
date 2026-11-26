import { supabase } from "./supabase";

export type StudyResult={topic:string;summary:string;flashcards:{question:string;answer:string}[];quiz:{question:string;options:string[];answer:number;explanation:string;topic?:string}[];practiceTest:{question:string;answer:string}[]};
export type StudyLanguage = "en" | "sv" | "ar";
type StudyImage={base64:string;mimeType:string};

async function postStudy(body:Record<string,unknown>):Promise<StudyResult>{
 // Use Supabase's function client so it attaches the project's apikey and the
 // signed-in user's access token. A raw fetch here was being rejected by the
 // Edge Function gateway with UNAUTHORIZED_NO_AUTH_HEADER.
 const {data,error}=await supabase.functions.invoke("analyze-notes",{body});
 if(error){
  let message=error.message||"AI study request failed";
  const response=(error as any).context;
  if(response&&typeof response.json==="function"){
   try{
    const details=await response.json();
    if(typeof details?.error==="string")message=details.error;
    else if(typeof details?.message==="string")message=details.message;
   }catch{/* Keep the original Functions error message. */}
  }
  throw new Error(message);
 }
 if(!data||typeof data.topic!=="string"||typeof data.summary!=="string"||!Array.isArray(data.flashcards)||!Array.isArray(data.quiz)||!Array.isArray(data.practiceTest))throw new Error("The AI returned an incomplete study session. Please try again.");
 return data as StudyResult;
}
export async function analyzeNotes(image:StudyImage|StudyImage[],language:StudyLanguage="en"):Promise<StudyResult>{
 const images=(Array.isArray(image)?image:[image]).filter(item=>item?.base64);
 if(!images.length)throw new Error("Choose at least one clear photo of your notes.");
 return postStudy({images:images.map(item=>({imageBase64:item.base64,mimeType:item.mimeType})),imageBase64:images[0].base64,mimeType:images[0].mimeType,language,action:"analyze"});
}
export async function analyzeNotesText(notesText:string,language:StudyLanguage="en"):Promise<StudyResult>{
 const text=notesText.trim();
 if(text.length<20)throw new Error("Paste at least a few lines of notes (20 characters or more).");
 if(text.length>40000)throw new Error("Your notes are too long. Please paste up to 40,000 characters at a time.");
 return postStudy({notesText:text,language,action:"analyze"});
}
export async function translateStudyResult(studyResult:StudyResult,language:StudyLanguage):Promise<StudyResult>{
 return postStudy({studyResult,language,action:"translate"});
}
