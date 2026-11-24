// Multi-provider study AI fallback
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const prompt = "Read all supplied note images as one set. Return only JSON with topic, summary, flashcards [{question,answer}], quiz [{question,options,answer,explanation}], practiceTest [{question,answer}]. Make 8-12 flashcards, 6 quizzes, 5 practice questions. Use only the notes.";
const env = (k:string) => Deno.env.get(k)?.trim() || "";
type P = {id:string;key:string;url:string;model:string};
function providers():P[] {
 const list:P[]=[
 {id:"gemini",key:env("GEMINI_API_KEY"),url:"gemini",model:env("GEMINI_MODEL")||"gemini-3.5-flash-lite"},
 {id:"groq",key:env("GROQ_API_KEY"),url:env("GROQ_BASE_URL")||"https://api.groq.com/openai/v1",model:env("GROQ_MODEL")||"qwen/qwen3.8-27b"},
 {id:"nvidia",key:env("NVIDIA_API_KEY"),url:env("NVIDIA_BASE_URL")||"https://integrate.api.nvidia.com/v1",model:env("NVIDIA_MODEL")||"nvidia/nemotron-nano-12b-v2-vl"},
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
 {id:"aihorde",key:env("AIHORDE_API_KEY")||"0000000000",url:env("AIHORDE_BASE_URL")||"https://oai.aihorde.net/v1",model:env("AIHORDE_MODEL")||"koboldcpp/Qwen_Qwen3-0.6B-IQ4_XS"},
 {id:"sambanova",key:env("SAMBANOVA_API_KEY"),url:env("SAMBANOVA_BASE_URL")||"https://api.sambanova.ai/v1",model:env("SAMBANOVA_MODEL")||"deepseek-ai/DeepSeek-V3.2"}
 ];
 const order=env("AI_PROVIDER_ORDER").split(",").map(x=>x.trim().toLowerCase());
 return list.filter(p=>(p.key||p.id==="aihorde")&&(p.url==="gemini"||p.url)).sort((a,b)=>{const x=order.indexOf(a.id),y=order.indexOf(b.id);return (x<0?999:x)-(y<0?999:y);});
}
function parse(raw:string) {
 const s=raw.replace(/^\s*\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`\s*$/,"").trim();
 const v=JSON.parse(s);
 if(!v||typeof v.topic!=="string"||typeof v.summary!=="string"||!Array.isArray(v.flashcards)||!Array.isArray(v.quiz)||!Array.isArray(v.practiceTest))throw new Error("Invalid study JSON");
 return v;
}
async function fetchTimed(url:string, init:RequestInit, timeoutMs=5000):Promise<Response> {
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(url,{...init,signal:controller.signal});}
 finally{clearTimeout(timer);}
}
async function run(p:P,images:any[],lang:string) {
 const providerTimeout=p.id==="gemini"?18000:p.id==="groq"?15000:p.id==="cloudflare"?15000:p.id==="tokenharbor"?25000:15000;
 const instruction=lang==="sv"?"Write every field in natural Swedish.":lang==="ar"?"اكتب باللغة العربية الفصحى.":"Write every field in natural English.";
 if(p.url==="gemini") {
  const response=await fetchTimed("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(p.model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":p.key},body:JSON.stringify({contents:[{parts:[{text:prompt+"\n"+instruction},...images.map(x=>({inlineData:{mimeType:x.mimeType||"image/jpeg",data:x.imageBase64}}))]}],generationConfig:{responseMimeType:"application/json",temperature:0.2}})},providerTimeout);
  const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Gemini failed");
  return parse(data.candidates?.[0]?.content?.parts?.map((x:any)=>x.text||"").join("\n")||"");
 }
 const content=[{type:"text",text:prompt+"\n"+instruction},...images.map(x=>({type:"image_url",image_url:{url:"data:"+(x.mimeType||"image/jpeg")+";base64,"+x.imageBase64}}))];
 const response=await fetchTimed(p.url.replace(/\/$/,"")+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",...(p.key?{"Authorization":"Bearer "+p.key}:{})},body:JSON.stringify({model:p.model,messages:[{role:"system",content:"Return only valid JSON study materials."},{role:"user",content}],temperature:0.2,max_tokens:8000})},providerTimeout);
 const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"HTTP "+response.status);
 const c=data.choices?.[0]?.message?.content;return parse(typeof c==="string"?c:Array.isArray(c)?c.map((x:any)=>x.text||"").join("\n"):"");
}
serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return new Response("Method not allowed",{status:405,headers:cors});
 try{
  const body=await req.json(),src=Array.isArray(body.images)&&body.images.length?body.images:body.imageBase64?[{imageBase64:body.imageBase64,mimeType:body.mimeType}]:[];
  const images=src.filter((x:any)=>x?.imageBase64).slice(0,6);if(!images.length)throw new Error("Choose notes images.");
  const ps=providers();if(!ps.length)throw new Error("Configure at least one AI provider secret in Supabase.");
  const failures=[];
  for(const p of ps){try{const result=await run(p,images,body.language||"en");console.log("AI provider success",p.id);return new Response(JSON.stringify(result),{headers:{...cors,"Content-Type":"application/json","X-SnapStudy-AI-Provider":p.id}});}catch(e){const m=e instanceof Error?e.message:String(e);failures.push(p.id+": "+m.slice(0,160));console.warn("AI fallback",p.id,m.slice(0,220));}}
  throw new Error("Every configured AI provider failed: "+failures.join(" | ").slice(0,1400));
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"AI failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
