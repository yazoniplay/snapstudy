import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const prompt=`You are SnapStudy. Read the handwritten notes in the image. Return ONLY valid JSON:
{"topic":"short topic","summary":"student-friendly summary","flashcards":[{"question":"...","answer":"..."}],"quiz":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}],"practiceTest":[{"question":"...","answer":"..."}]}
Create 8-12 flashcards, 6 quiz questions and 5 practice-test questions. Use only information supported by the notes.`;
serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const {imageBase64,language="en",mimeType="image/jpeg"}=await req.json(); if(!imageBase64)throw new Error("No image supplied");\n  const languageInstruction=language==="sv"?"Write every generated field in natural Swedish.":language==="ar"?"اكتب جميع الحقول المُنشأة باللغة العربية الفصحى الواضحة.":"Write every generated field in natural English.";\n  const localizedPrompt=prompt+"\\n\\n"+languageInstruction;
  const key=Deno.env.get("GEMINI_API_KEY"); if(!key)throw new Error("GEMINI_API_KEY is not configured");
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(key),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:localizedPrompt},{inline_data:{mime_type:mimeType||"image/jpeg",data:imageBase64}}]}],generationConfig:{responseMimeType:"application/json"}})});
  const j=await r.json(); if(!r.ok)throw new Error(j?.error?.message||"Gemini request failed");
  const raw=j?.candidates?.[0]?.content?.parts?.[0]?.text; if(!raw)throw new Error("Gemini returned no content");
  return new Response(JSON.stringify(JSON.parse(raw)),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"Unknown error"}),{status:500,headers:{...cors,"Content-Type":"application/json"}})}
});