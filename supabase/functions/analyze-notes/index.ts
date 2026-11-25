// Multi-provider study AI fallback
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const prompt = `You are SnapStudy's exceptional subject professor, thoughtful tutor, and curriculum designer. Teach like a real professor who knows the subject deeply and genuinely wants the student to understand it: warm, clear, confident, precise, engaging, and intellectually serious—not robotic, not overly formal, and never condescending. Speak directly to the learner naturally when useful. Sound like a skilled real professor in a clear classroom: explain the central idea first, guide the student through the reasoning, connect each section to the next, ask useful rhetorical questions sparingly, and give precise feedback without sounding like a template. Vary sentence structure naturally; do not use canned praise or pretend to have personal experiences. Your job is not to produce a skimpy summary; turn the supplied material into a complete, understandable lesson that helps a student genuinely learn, remember, reason, and apply it.

SOURCE RULES:
- When SOURCE NOTES are supplied, treat them as the student's curriculum. Carefully read all of them, cover all important concepts, and stay faithful to them. You may add brief prerequisite explanations or simple examples needed to make the notes understandable, but do not invent course-specific facts or contradict the notes.
- When images are supplied, inspect all readable content. Use only facts clearly supported by the notes/image. Do not silently skip important sections.
- If a source is too blurry, incomplete, or genuinely lacks enough information, be transparent in the summary and make fewer high-quality items rather than padding or guessing.
- For an ordinary photograph rather than study material, make a short visual-observation quiz about clearly visible, non-sensitive details only. Do not identify people or infer sensitive traits. Never pretend an ordinary photo contains a lesson.
- LANGUAGE IS A CORE REQUIREMENT: Before drafting, determine the dominant instructional language from the pasted SOURCE NOTES or from readable text detected in the uploaded IMAGE(S) using OCR. Treat this as a required analysis step, not a stylistic preference. Generate the topic, summary, headings, flashcards, quiz questions AND all options, explanations, written questions and model answers in that detected source language. The language of the app UI, user account, system prompt, or your default response language must NEVER override the source language. Swedish notes or Swedish text in a photo must produce fluent Swedish throughout—not English, not a Swedish/English mixture, and not translated headings with English answers. Preserve Swedish letters å, ä, ö and correct subject terminology. If multiple languages appear, use the language carrying the majority of the educational content and keep quoted source terms intact. Translate into another language only when an explicit outputLanguage is provided; otherwise preserve the source language.

TEACHING QUALITY (mandatory):
- Explain ideas from simple foundations to harder ideas. Define every important technical term in plain language the first time it appears.
- Explain not only WHAT something is, but HOW it works, WHY it matters, and HOW it connects to other concepts. Build a coherent explanation like a professor at a good lesson, not a disconnected glossary.
- Include concrete, accurate examples, comparisons/analogies where helpful, step-by-step processes, causes/effects, and common confusions/mistakes when the source supports them.
- Use full, informative, natural sentences. Avoid fragments, vague phrases, repetitive filler, one-line definitions, and answers that merely repeat the question. Sound human and teacherly: guide the learner through the idea, emphasize the key insight, and make transitions feel natural. Do not use fake enthusiasm or repetitive 'Great question!' filler.
- Make the material accessible to a student who has never learned this topic before, while preserving the correct subject vocabulary.
- Prioritize understanding and reasoning, not rote memorization alone.

RETURN ONLY valid JSON with exactly this shape:
{"topic":"...","summary":"...","flashcards":[{"question":"...","answer":"..."}],"quiz":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}],"practiceTest":[{"question":"...","answer":"..."}]}

CONTENT REQUIREMENTS:
1) SUMMARY / LESSON: For note-based study, write a substantial, structured lesson (normally 500-900 words when the notes contain enough content). Organize it with Markdown-style headings (## and ###) and separated paragraphs inside the summary string. Cover the main ideas, prerequisite vocabulary, how/why processes work, relationships between concepts, worked examples, and a short recap/checklist. Do not make it one short paragraph. Scale the length to the source; never add nonsense just to hit a word count.
2) FLASHCARDS: Create 15-25 high-quality cards for substantial notes (at least 10 for shorter notes if enough distinct concepts exist). Questions should test different levels: definitions, explain-why, compare/contrast, sequence, apply-to-example, and common misconception. Answers should usually be 2-5 complete sentences with a definition/explanation and a useful example or reasoning where appropriate. Do not make cards that can be answered with vague one-word responses unless the fact genuinely requires it.
3) MULTIPLE-CHOICE QUIZ: Create 10-15 questions for substantial notes (at least 8 for shorter notes when supported). Each has exactly four options, one unambiguously correct answer, and an explanation of 2-4 complete sentences that teaches why the answer is right and why the tempting alternative is wrong. The answer MUST be the zero-based index of the correct option (A=0, B=1, C=2, D=3). Make distractors plausible and based on common misunderstandings, not silly or obviously unrelated. Vary the correct answer position. Independently check each answer index against the options and explanation.
4) WRITTEN PRACTICE: Create 8-12 meaningful open-ended questions for substantial notes (at least 5 for shorter notes when supported). Include a mix of explain-in-your-own-words, compare, apply, analyze, and step-by-step questions. Answers should be thorough model answers, typically 3-7 sentences, with the reasoning and key points a teacher would expect. For calculations or processes, show the steps; for conceptual questions, explain the links between ideas.
5) COVERAGE: Distribute questions across the full source, not only the first paragraph. Avoid duplicate questions and ensure every major learning objective is covered by the summary and at least one practice item.

FINAL SELF-CHECK before returning:
- Summary is actually detailed and teachable, not a tiny overview.
- Answers and explanations are specific, sufficiently long, and educational.
- Quiz has exactly four options each and one defensible correct answer.
- Correct indices are verified against option text.
- No unsupported facts, missing major topics, repeated filler, or broken JSON.`;
const env = (k:string) => Deno.env.get(k)?.trim() || "";
type P = {id:string;key:string;url:string;model:string};
function providers():P[] {
 const list:P[]=[
 {id:"gemini",key:env("GEMINI_API_KEY"),url:"gemini",model:env("GEMINI_MODEL")||"gemini-3.5-flash-lite"},
 {id:"groq",key:env("GROQ_API_KEY"),url:env("GROQ_BASE_URL")||"https://api.groq.com/openai/v1",model:env("GROQ_MODEL")||"qwen/qwen3.8-27b"},
 {id:"nvidia",key:env("NVIDIA_API_KEY"),url:env("NVIDIA_BASE_URL")||"https://integrate.api.nvidia.com/v1",model:env("NVIDIA_MODEL")||"nvidia/nemotron-3.5-super-vl-120b-a12b"},
 {id:"tokenharbor",key:env("TOKEN_HARBOR_KEY")||env("TOKENHARBOR_API_KEY"),url:env("TOKEN_HARBOR_BASE_URL")||env("TOKENHARBOR_BASE_URL")||"https://tokenharbor.ai/v1",model:env("TOKEN_HARBOR_MODEL")||env("TOKENHARBOR_MODEL")||"deepseek-v4.1-flash:free"},
 {id:"huggingface",key:env("HUGGINGFACE_API_KEY")||env("HF_TOKEN"),url:env("HUGGINGFACE_BASE_URL")||"https://router.huggingface.co/v1",model:env("HUGGINGFACE_MODEL")||"Qwen/Qwen2.5-VL-72B-Instruct"},
 {id:"openrouter",key:env("OPENROUTER_API_KEY"),url:env("OPENROUTER_BASE_URL")||"https://openrouter.ai/api/v1",model:env("OPENROUTER_MODEL")||"openrouter/free"},
 {id:"vercel",key:env("AI_GATEWAY_API_KEY")||env("VERCEL_AI_GATEWAY_API_KEY"),url:env("AI_GATEWAY_BASE_URL")||env("VERCEL_AI_GATEWAY_BASE_URL")||"https://ai-gateway.vercel.sh/v1",model:env("AI_GATEWAY_MODEL")||env("VERCEL_AI_GATEWAY_MODEL")||"openai/gpt-oss-120b"},
 {id:"zai",key:env("ZAI_API_KEY")||env("ZHIPU_API_KEY"),url:env("ZAI_BASE_URL")||"https://api.z.ai/api/paas/v4",model:env("ZAI_MODEL")||"glm-4.7-flash"},
 {id:"siliconflow",key:env("SILICONFLOW_API_KEY"),url:env("SILICONFLOW_BASE_URL")||"https://api.siliconflow.com/v1",model:env("SILICONFLOW_MODEL")||"Qwen/Qwen3-30B-A3B-Instruct-2507"},
 {id:"orcarouter",key:env("ORCAROUTER_API_KEY"),url:env("ORCAROUTER_BASE_URL")||"https://api.orcarouter.ai/v1",model:env("ORCAROUTER_MODEL")||"orcarouter/auto"},
 {id:"bazaarlink",key:env("BAZAARLINK_API_KEY"),url:env("BAZAARLINK_BASE_URL")||"https://api.bazaarlink.ai/v1",model:env("BAZAARLINK_MODEL")||"auto:free"},
 {id:"cloudflare",key:env("CLOUDFLARE_API_TOKEN"),url:env("CLOUDFLARE_BASE_URL")||(env("CLOUDFLARE_ACCOUNT_ID")?"https://api.cloudflare.com/client/v4/accounts/"+env("CLOUDFLARE_ACCOUNT_ID")+"/ai/v1":""),model:env("CLOUDFLARE_WORKERS_AI_MODEL")||env("CLOUDFLARE_MODEL")||"@cf/zai-org/glm-4.7-flash"},
 {id:"ollama",key:env("OLLAMA_API_KEY"),url:env("OLLAMA_BASE_URL")||"https://ollama.com/v1",model:env("OLLAMA_MODEL")||"llama3.3"},
 {id:"agentrouter",key:env("AGENTROUTER_API_KEY"),url:env("AGENTROUTER_BASE_URL")||"https://agentrouter.org/v1",model:env("AGENTROUTER_MODEL")||"deepseek-v4-flash"},
 {id:"routeway",key:env("ROUTEWAY_API_KEY"),url:env("ROUTEWAY_BASE_URL")||"https://api.routeway.ai/v1",model:env("ROUTEWAY_MODEL")||"minimax-m3.1-flash:free"},
 {id:"requesty",key:env("REQUESTY_API_KEY"),url:env("REQUESTY_BASE_URL")||"https://router.requesty.ai/v1",model:env("REQUESTY_MODEL")||"nvidia/muse-glimmer-30b"},
 {id:"fastrouter",key:env("FASTROUTER_API_KEY"),url:env("FASTROUTER_BASE_URL")||"https://api.fastrouter.ai/api/v1",model:env("FASTROUTER_MODEL")||"openai/gpt-oss-120b:free"},
 {id:"opencodezen",key:env("OPENCODE_API_KEY")||env("OPENCODE_ZEN_API_KEY"),url:env("OPENCODE_ZEN_BASE_URL")||"https://opencode.ai/zen/v1",model:env("OPENCODE_ZEN_MODEL")||"nemotron-3.5-lightning-free"},
 {id:"aihorde",key:env("AIHORDE_API_KEY")||"0000000000",url:env("AIHORDE_BASE_URL")||"https://oai.aihorde.net/v1",model:env("AIHORDE_MODEL")||"auto"},
 {id:"sambanova",key:env("SAMBANOVA_API_KEY"),url:env("SAMBANOVA_BASE_URL")||"https://api.sambanova.ai/v1",model:env("SAMBANOVA_MODEL")||"deepseek-ai/DeepSeek-V3.2"}
 ];
 const order=env("AI_PROVIDER_ORDER").split(",").map(x=>x.trim().toLowerCase());
 return list.filter(p=>(p.key||p.id==="aihorde")&&(p.url==="gemini"||p.url)).sort((a,b)=>{const x=order.indexOf(a.id),y=order.indexOf(b.id);return (x<0?999:x)-(y<0?999:y);});
}
function parse(raw:string) {
 const s=raw.replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"").trim();
 const v=JSON.parse(s);
 if(!v||typeof v.topic!=="string"||typeof v.summary!=="string"||!Array.isArray(v.flashcards)||!Array.isArray(v.quiz)||!Array.isArray(v.practiceTest))throw new Error("Invalid study JSON");
 const words=(value:string)=>String(value||"").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu," ").split(/[\s-]+/).map(x=>x.replace(/(ing|ed|es|s)$/,"")).filter(x=>x.length>2&&!["the","and","are","was","were","that","this","with","from","into","does","have","has","what","which","when","where","person","individual"].includes(x));
 for(const q of v.quiz){
  if(!Array.isArray(q?.options)||!q.options.length)continue;
  const explanationWords=words(q.explanation);
  const scores=q.options.map((option:string)=>words(option).filter(token=>explanationWords.some(word=>word===token||word.startsWith(token)||token.startsWith(word))).length);
  const best=Math.max(...scores),bestIndex=scores.indexOf(best),answer=Number(q.answer);
  if((!Number.isInteger(answer)||answer<0||answer>=q.options.length)&&Number.isInteger(answer)&&answer>=1&&answer<=q.options.length)q.answer=answer-1;
  else if(best>0&&bestIndex!==answer&&best>=(scores[answer]||0)+1)q.answer=bestIndex;
 }
 return v;
}
async function fetchTimed(url:string, init:RequestInit, timeoutMs=5000):Promise<Response> {
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(url,{...init,signal:controller.signal});}
 catch(error){
  if(error instanceof DOMException&&error.name==="AbortError")throw new Error("Provider request timed out after "+timeoutMs+"ms");
  throw error;
 }finally{clearTimeout(timer);}
}
async function availableHordeChatModels(p:P):Promise<string[]>{
 try{
  const response=await fetchTimed(p.url.replace(/\\/$/,"")+"/models",{method:"GET",headers:{...(p.key?{"Authorization":"Bearer "+p.key}:{})}},5000);
  if(!response.ok)return [];
  const body=await response.json();
  return (Array.isArray(body.data)?body.data:[]).map((item:any)=>String(item?.id||"")).filter(Boolean);
 }catch{return [];}
}
async function run(p:P,images:any[],lang:string,notesText="",budgetMs=20000) {
 const providerTimeout=Math.max(3000,Math.min(budgetMs,p.id==="gemini"?15000:p.id==="groq"?26000:p.id==="tokenharbor"?28000:p.id==="cloudflare"?22000:p.id==="nvidia"?18000:p.id==="opencodezen"?12000:20000));
 const instruction=lang&&lang!=="auto"?`EXPLICIT OUTPUT LANGUAGE: ${lang}. Write every student-facing field in this language, naturally and consistently. This explicit output language is the only reason to translate away from the source language.`:"AUTOMATIC SOURCE-LANGUAGE MODE (MANDATORY): Inspect the pasted text or OCR-readable image text first, identify the dominant language carrying the lesson, and write every student-facing field in that same language. The UI language is irrelevant and must not override the source. Swedish source material—including a photo of Swedish notes—must produce natural Swedish throughout, with å, ä and ö preserved. Never translate Swedish into English by default. Do not mix languages unless the source itself requires it.";
 const sourceText=notesText? "\n\nSOURCE NOTES (use only these facts):\n"+notesText : "";
 const content=[{type:"text",text:prompt+"\n"+instruction+sourceText},...images.map(x=>({type:"image_url",image_url:{url:"data:"+(x.mimeType||"image/jpeg")+";base64,"+x.imageBase64}}))];
 if(p.url==="gemini") {
  const candidates=[p.model,...env("GEMINI_FALLBACK_MODELS").split(",").map(x=>x.trim()),"gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemini-3.5-flash"].filter((x,i,a)=>x&&a.indexOf(x)===i).slice(0,3);
  const errors:string[]=[];
  for(const model of candidates){
   try{
    const response=await fetchTimed("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":p.key},body:JSON.stringify({contents:[{parts:[{text:prompt+"\n"+instruction+sourceText},...images.map(x=>({inlineData:{mimeType:x.mimeType||"image/jpeg",data:x.imageBase64}}))]}],generationConfig:{responseMimeType:"application/json",temperature:0.2}})},Math.min(providerTimeout,11000));
    const data=await response.json();
    if(!response.ok)throw new Error(data.error?.message||"Gemini HTTP "+response.status);
    const result=parse(data.candidates?.[0]?.content?.parts?.map((x:any)=>x.text||"").join("\n")||"");
    console.log("Gemini model success",model);return result;
   }catch(e){const message=e instanceof Error?e.message:String(e);errors.push(model+": "+message.slice(0,100));console.warn("Gemini model fallback",model,message.slice(0,160));}
  }
  throw new Error("Gemini models exhausted: "+errors.join(" | "));
 }
 let models=[p.model];
 if(p.id==="nvidia"){
  models=[p.model,...env("NVIDIA_FALLBACK_MODELS").split(",").map(x=>x.trim()),"nvidia/nemotron-3.5-super-vl-120b-a12b","nvidia/nemotron-3.5-super-120b-a12b"].filter((x,i,a)=>x&&a.indexOf(x)===i).slice(0,3);
 }
 if(p.id==="aihorde"){
  const live=await availableHordeChatModels(p);
  if(live.length){
   const preferred=env("AIHORDE_MODEL").trim();
   const chosen=preferred&&preferred!=="auto"&&live.includes(preferred)?preferred:live[0];
   models=[chosen];
   console.log("AI Horde live model selected",chosen);
  }else if(p.model==="auto")throw new Error("AI Horde could not load its live chat model list");
 }
 const errors:string[]=[];
 for(const model of models){
  try{
   const response=await fetchTimed(p.url.replace(/\/$/,"")+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",...(p.key?{"Authorization":"Bearer "+p.key}:{})},body:JSON.stringify({model,messages:[{role:"system",content:"Return only valid JSON study materials."},{role:"user",content}],temperature:0.2,max_tokens:12000})},providerTimeout);
   const data=await response.json();
   if(!response.ok)throw new Error(data.error?.message||"HTTP "+response.status);
   const answer=data.choices?.[0]?.message?.content;
   return parse(typeof answer==="string"?answer:Array.isArray(answer)?answer.map((x:any)=>x.text||"").join("\n"):"");
  }catch(e){const message=e instanceof Error?e.message:String(e);errors.push(model+": "+message.slice(0,120));console.warn("AI model fallback",p.id,model,message.slice(0,180));}
 }
 throw new Error(errors.join(" | ")||"No model available");
}
serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return new Response("Method not allowed",{status:405,headers:cors});
 try{
  const body=await req.json(),notesText=typeof body.notesText==="string"?body.notesText.trim():"",src=Array.isArray(body.images)&&body.images.length?body.images:body.imageBase64?[{imageBase64:body.imageBase64,mimeType:body.mimeType}]:[];
  const images=src.filter((x:any)=>x?.imageBase64).slice(0,6);if(!images.length&&!notesText)throw new Error("Paste your notes or choose notes images.");if(notesText.length>40000)throw new Error("Notes are too long. Paste up to 40,000 characters.");
  const ps=providers();if(!ps.length)throw new Error("Configure at least one AI provider secret in Supabase.");
  const failures=[],deadline=Date.now()+112000;
  for(const p of ps){
   const remaining=deadline-Date.now();if(remaining<4000){failures.push("remaining providers skipped: request time budget reached");break;}
   try{const result=await run(p,images,typeof body.outputLanguage==="string"?body.outputLanguage:"auto",notesText,Math.min(remaining,30000));console.log("AI provider success",p.id);return new Response(JSON.stringify(result),{headers:{...cors,"Content-Type":"application/json","X-SnapStudy-AI-Provider":p.id}});}
   catch(e){const m=e instanceof Error?e.message:String(e);failures.push(p.id+": "+m.slice(0,160));console.warn("AI fallback",p.id,m.slice(0,220));}
  }
  throw new Error("Every configured AI provider failed: "+failures.join(" | ").slice(0,1400));
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"AI failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
