import { loadStudyData, saveStudyData } from "./cloud-study-data";
export type AIStudyActivity = { id:string; type:"quiz"|"flashcards"; title:string; createdAt:number; data:any; completed?:boolean; score?:number; total?:number; known?:number };
const KEY="snapstudy:ai-study-activities";
export async function saveAIStudyActivity(type:AIStudyActivity["type"],data:any):Promise<AIStudyActivity>{
 const existing=await loadStudyData<AIStudyActivity[]>(KEY,[]);
 const activity:AIStudyActivity={id:"ai-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),type,title:data.title|| (type==="quiz"?"AI Quiz":"AI Flashcards"),createdAt:Date.now(),data,completed:false};
 await saveStudyData(KEY,[activity,...(Array.isArray(existing)?existing:[])].slice(0,100));
 return activity;
}
export async function updateAIStudyActivity(id:string,patch:Partial<AIStudyActivity>){
 const list=await loadStudyData<AIStudyActivity[]>(KEY,[]);
 if(!Array.isArray(list))return;
 await saveStudyData(KEY,list.map(item=>item.id===id?{...item,...patch}:item));
}
