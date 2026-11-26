import { loadStudyData, saveStudyData } from "./cloud-study-data";

export type XPKind = "card" | "quiz" | "focus" | "task" | "achievement" | "speed" | "matching" | "study";
export type XPEvent = { id: string; xp: number; kind: XPKind; title: string; date: string };
export type GamificationState = {
  totalXp: number;
  events: XPEvent[];
  stats: { cardsReviewed: number; quizzesCompleted: number; focusSessions: number; focusMinutes: number; tasksCompleted: number; studySetsCreated: number; perfectQuizzes: number };
  achievements: string[];
  streakFreezes: number;
  streakFreezeDates: string[];
};
export type XPRewardNotice = { xp: number; title: string; level: number; previousLevel: number; leveledUp: boolean };
type XPRewardListener = (notice: XPRewardNotice) => void;
const xpRewardListeners = new Set<XPRewardListener>();
export function subscribeXPRewards(listener: XPRewardListener) {
  xpRewardListeners.add(listener);
  return () => { xpRewardListeners.delete(listener); };
}
function publishXPReward(notice: XPRewardNotice) {
  for (const listener of xpRewardListeners) listener(notice);
}
export const EMPTY_GAMIFICATION: GamificationState = {
  totalXp: 0, events: [],
  stats: { cardsReviewed: 0, quizzesCompleted: 0, focusSessions: 0, focusMinutes: 0, tasksCompleted: 0, studySetsCreated: 0, perfectQuizzes: 0 },
  achievements: [], streakFreezes: 0, streakFreezeDates: [],
};
const KEY = "gamification:v1";
export function localDate(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");return y+"-"+m+"-"+d;}
function shiftDate(date:string,days:number){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return localDate(d);}
export function getRank(level:number){if(level>=100)return{title:"Legendary Scholar",next:"",icon:"👑"};if(level>=50)return{title:"Grand Sage",next:"Legendary Scholar",icon:"🌌"};if(level>=25)return{title:"Master Scholar",next:"Grand Sage",icon:"🏆"};if(level>=15)return{title:"Knowledge Seeker",next:"Master Scholar",icon:"🔮"};if(level>=10)return{title:"Rising Scholar",next:"Knowledge Seeker",icon:"✨"};if(level>=5)return{title:"Apprentice",next:"Rising Scholar",icon:"📖"};return{title:"Novice Scholar",next:"Apprentice",icon:"🌱"};}
export function getActivityDays(state:GamificationState){return Array.from(new Set(state.events.filter(e=>e.xp>0&&e.kind!=="achievement"&&!e.id.startsWith("quest:")).map(e=>e.date))).sort();}
export function getStreak(state:GamificationState){const days=new Set([...getActivityDays(state),...(state.streakFreezeDates||[])]);let current=0,cursor=localDate();if(!days.has(cursor))cursor=shiftDate(cursor,-1);while(days.has(cursor)){current++;cursor=shiftDate(cursor,-1);if(current>4000)break;}let best=0,run=0,previous="";for(const day of [...days].sort()){run=previous&&shiftDate(previous,1)===day?run+1:1;best=Math.max(best,run);previous=day;}return{current,best,activeToday:days.has(localDate()),days:[...days]};}
export const ACHIEVEMENTS = [
  { id: "first-card", title: "First Steps", description: "Review your first flashcard", icon: "🎴", xp: 25, test: (s: GamificationState) => s.stats.cardsReviewed >= 1 },
  { id: "cards-10", title: "Card Collector", description: "Review 10 flashcards", icon: "📚", xp: 50, test: (s: GamificationState) => s.stats.cardsReviewed >= 10 },
  { id: "cards-100", title: "Knowledge Hoarder", description: "Review 100 flashcards", icon: "🧠", xp: 150, test: (s: GamificationState) => s.stats.cardsReviewed >= 100 },
  { id: "first-quiz", title: "Quiz Starter", description: "Complete your first quiz", icon: "🎯", xp: 50, test: (s: GamificationState) => s.stats.quizzesCompleted >= 1 },
  { id: "quiz-10", title: "Quiz Master", description: "Complete 10 quizzes", icon: "🏆", xp: 100, test: (s: GamificationState) => s.stats.quizzesCompleted >= 10 },
  { id: "first-focus", title: "Deep Focus", description: "Finish a 25-minute focus session", icon: "⏱️", xp: 75, test: (s: GamificationState) => s.stats.focusMinutes >= 25 },
  { id: "focus-5", title: "In The Zone", description: "Finish 5 focus sessions", icon: "⚡", xp: 150, test: (s: GamificationState) => s.stats.focusSessions >= 5 },
  { id: "level-5", title: "Rising Scholar", description: "Reach level 5", icon: "✨", xp: 200, test: (s: GamificationState) => getLevel(s.totalXp).level >= 5 },
  { id: "perfect-quiz", title: "Perfect Score", description: "Get a perfect quiz score", icon: "💯", xp: 100, test: (s: GamificationState) => s.stats.perfectQuizzes >= 1 },
  { id: "cards-500", title: "Library Legend", description: "Review 500 flashcards", icon: "📚", xp: 350, test: (s: GamificationState) => s.stats.cardsReviewed >= 500 },
  { id: "focus-25", title: "Focus Champion", description: "Finish 25 focus sessions", icon: "🔥", xp: 350, test: (s: GamificationState) => s.stats.focusSessions >= 25 },
  { id: "sets-5", title: "Study Architect", description: "Create 5 study sets", icon: "🧩", xp: 100, test: (s: GamificationState) => s.stats.studySetsCreated >= 5 },
  { id: "sets-25", title: "Learning Builder", description: "Create 25 study sets", icon: "🏗️", xp: 250, test: (s: GamificationState) => s.stats.studySetsCreated >= 25 },
  { id: "streak-3", title: "Three-Day Spark", description: "Study 3 days in a row", icon: "🔥", xp: 75, test: (s: GamificationState) => getStreak(s).best >= 3 },
  { id: "streak-7", title: "Week Warrior", description: "Study 7 days in a row", icon: "🗓️", xp: 200, test: (s: GamificationState) => getStreak(s).best >= 7 },
  { id: "streak-30", title: "Unstoppable", description: "Study 30 days in a row", icon: "🌠", xp: 750, test: (s: GamificationState) => getStreak(s).best >= 30 },
  { id: "level-10", title: "Elite Learner", description: "Reach level 10", icon: "💎", xp: 400, test: (s: GamificationState) => getLevel(s.totalXp).level >= 10 },
] as const;

export async function loadGamification(): Promise<GamificationState> {
  const value = await loadStudyData<GamificationState>(KEY, EMPTY_GAMIFICATION);
  return { ...EMPTY_GAMIFICATION, ...value, stats: { ...EMPTY_GAMIFICATION.stats, ...(value?.stats || {}) }, events: Array.isArray(value?.events) ? value.events : [], achievements: Array.isArray(value?.achievements) ? value.achievements : [], streakFreezes: value?.streakFreezes===undefined?(Array.isArray(value?.achievements)&&value.achievements.includes("streak-7")?1:0):Math.max(0,Number(value.streakFreezes)||0), streakFreezeDates: Array.isArray(value?.streakFreezeDates) ? value.streakFreezeDates : [] };
}
export function getLevel(totalXp: number) {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1, floorXp = 0, nextXp = 100;
  while (xp >= nextXp && level < 1000) { level++; floorXp = nextXp; nextXp = level * level * 100; }
  return { level, floorXp, nextXp, progressXp: xp - floorXp, neededXp: nextXp - floorXp, progress: Math.max(0, Math.min(1, (xp - floorXp) / Math.max(1, nextXp - floorXp))) };
}
export async function awardXP(id: string, amount: number, kind: XPKind, title: string, extra?: Partial<GamificationState["stats"]>): Promise<GamificationState> {
  const state = await loadGamification();
  if (state.events.some(event => event.id === id)) return state;
  const previousTotalXp = state.totalXp;
  const previousLevel = getLevel(previousTotalXp).level;
  const date = localDate();
  const event: XPEvent = { id, xp: Math.max(0, Math.floor(amount)), kind, title, date };
  state.events = [event, ...state.events].slice(0, 1500);
  state.totalXp += event.xp;
  if (extra) for (const key of Object.keys(extra) as (keyof GamificationState["stats"])[]) state.stats[key] += extra[key] || 0;
  for (const achievement of ACHIEVEMENTS) {
    if (!state.achievements.includes(achievement.id) && achievement.test(state)) {
      state.achievements.push(achievement.id);
      state.totalXp += achievement.xp;
      if (achievement.id === "streak-7") state.streakFreezes += 1;
      state.events.unshift({ id: "achievement:" + achievement.id, xp: achievement.xp, kind: "achievement", title: achievement.title, date });
    }
  }
  const dailyEvents = state.events.filter(item => item.date === date);
  const questRules = [
    { id: "cards", goal: 10, kind: "card" as XPKind, bonus: 30, title: "Daily quest: 10 flashcards" },
    { id: "quiz", goal: 1, kind: "quiz" as XPKind, bonus: 40, title: "Daily quest: finish a quiz" },
    { id: "focus", goal: 1, kind: "focus" as XPKind, bonus: 50, title: "Daily quest: focus session" },
    { id: "study", goal: 1, kind: "study" as XPKind, bonus: 35, title: "Daily quest: create a study set" },
  ];
  for (const quest of questRules) {
    const completed = dailyEvents.filter(item => item.kind === quest.kind && !item.id.startsWith("quest:")).length;
    const questId = "quest:" + date + ":" + quest.id;
    if (completed >= quest.goal && !state.events.some(item => item.id === questId)) {
      state.totalXp += quest.bonus;
      state.events.unshift({ id: questId, xp: quest.bonus, kind: "achievement", title: quest.title, date });
    }
  }
  const monday = new Date(date+"T12:00:00"); monday.setDate(monday.getDate()-((monday.getDay()+6)%7)); const weekStart=localDate(monday);
  const weekEvents=state.events.filter(e=>e.date>=weekStart&&e.date<=date&&e.xp>0&&!e.id.startsWith("quest:"));
  const weekly=[{id:"weekly-cards",title:"Review 50 flashcards",progress:weekEvents.filter(e=>e.kind==="card").length,goal:50,xp:120},{id:"weekly-quiz",title:"Complete 5 quizzes",progress:weekEvents.filter(e=>e.kind==="quiz").length,goal:5,xp:150},{id:"weekly-focus",title:"Complete 120 focus minutes",progress:weekEvents.filter(e=>e.kind==="focus").reduce((n,e)=>n+(Number(e.title.match(/(\d+)-minute/)?.[1])||25),0),goal:120,xp:180},{id:"weekly-days",title:"Study on 5 different days",progress:new Set(weekEvents.map(e=>e.date)).size,goal:5,xp:200}];
  for(const q of weekly){const qid="quest:"+weekStart+":"+q.id;if(q.progress>=q.goal&&!state.events.some(e=>e.id===qid)){state.totalXp+=q.xp;state.events.unshift({id:qid,xp:q.xp,kind:"achievement",title:"Weekly quest: "+q.title,date});}}
  await saveStudyData(KEY, state);
  const xpEarned = state.totalXp - previousTotalXp;
  if (xpEarned > 0) {
    const level = getLevel(state.totalXp).level;
    publishXPReward({ xp: xpEarned, title, level, previousLevel, leveledUp: level > previousLevel });
  }
  return state;
}
export function getDailyQuestProgress(state: GamificationState) {
 const today=localDate(),events=state.events.filter(event=>event.date===today&&!event.id.startsWith("quest:"));
 const definitions=[{id:"cards",title:"Review 10 flashcards",goal:10,xp:30,kind:"card" as XPKind,icon:"🎴"},{id:"quiz",title:"Finish a quiz",goal:1,xp:40,kind:"quiz" as XPKind,icon:"🎯"},{id:"focus",title:"Complete a focus session",goal:1,xp:50,kind:"focus" as XPKind,icon:"⏱️"},{id:"study",title:"Create a study set",goal:1,xp:35,kind:"study" as XPKind,icon:"📚"}];
 return definitions.map(q=>{const progress=Math.min(q.goal,events.filter(e=>e.kind===q.kind).length);return{...q,progress,completed:progress>=q.goal};});
}
export function getWeeklyQuestProgress(state:GamificationState){
 const today=localDate(),monday=new Date(today+"T12:00:00");monday.setDate(monday.getDate()-((monday.getDay()+6)%7));const start=localDate(monday);
 const events=state.events.filter(e=>e.date>=start&&e.date<=today&&e.xp>0&&!e.id.startsWith("quest:"));
 return [
  {id:"weekly-cards",title:"Review 50 flashcards",progress:events.filter(e=>e.kind==="card").length,goal:50,xp:120},
  {id:"weekly-quiz",title:"Complete 5 quizzes",progress:events.filter(e=>e.kind==="quiz").length,goal:5,xp:150},
  {id:"weekly-focus",title:"Complete 120 focus minutes",progress:events.filter(e=>e.kind==="focus").reduce((n,e)=>n+(Number(e.title.match(/(\d+)-minute/)?.[1])||25),0),goal:120,xp:180},
  {id:"weekly-days",title:"Study on 5 different days",progress:new Set(events.map(e=>e.date)).size,goal:5,xp:200},
 ].map(q=>({...q,progress:Math.min(q.goal,q.progress),completed:q.progress>=q.goal}));
}
export async function useStreakFreeze():Promise<{state:GamificationState;used:boolean;message:string}>{
 const state=await loadGamification(),today=localDate(),yesterday=shiftDate(today,-1),before=shiftDate(today,-2),active=new Set(getActivityDays(state));
 if(state.streakFreezes<1)return{state,used:false,message:"You don't have a streak freeze available yet."};
 if(!active.has(today))return{state,used:false,message:"Study today first, then you can protect yesterday."};
 if(active.has(yesterday))return{state,used:false,message:"Yesterday already counts toward your streak."};
 if(!active.has(before))return{state,used:false,message:"A freeze can protect one missed day in an active streak."};
 state.streakFreezes-=1;state.streakFreezeDates=[...new Set([...state.streakFreezeDates,yesterday])];
 state.events.unshift({id:"streak-freeze:"+yesterday,xp:0,kind:"achievement",title:"Streak freeze used",date:today});
 await saveStudyData(KEY,state);return{state,used:true,message:"Yesterday is protected. Your streak stays alive!"};
}
