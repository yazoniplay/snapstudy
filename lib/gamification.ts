import { loadStudyData, saveStudyData } from "./cloud-study-data";

export type XPKind = "card" | "quiz" | "focus" | "task" | "achievement";
export type XPEvent = { id: string; xp: number; kind: XPKind; title: string; date: string };
export type GamificationState = {
  totalXp: number;
  events: XPEvent[];
  stats: { cardsReviewed: number; quizzesCompleted: number; focusSessions: number; focusMinutes: number; tasksCompleted: number };
  achievements: string[];
};
export const EMPTY_GAMIFICATION: GamificationState = {
  totalXp: 0, events: [],
  stats: { cardsReviewed: 0, quizzesCompleted: 0, focusSessions: 0, focusMinutes: 0, tasksCompleted: 0 },
  achievements: [],
};
const KEY = "gamification:v1";
export const ACHIEVEMENTS = [
  { id: "first-card", title: "First Steps", description: "Review your first flashcard", icon: "🎴", xp: 25, test: (s: GamificationState) => s.stats.cardsReviewed >= 1 },
  { id: "cards-10", title: "Card Collector", description: "Review 10 flashcards", icon: "📚", xp: 50, test: (s: GamificationState) => s.stats.cardsReviewed >= 10 },
  { id: "cards-100", title: "Knowledge Hoarder", description: "Review 100 flashcards", icon: "🧠", xp: 150, test: (s: GamificationState) => s.stats.cardsReviewed >= 100 },
  { id: "first-quiz", title: "Quiz Starter", description: "Complete your first quiz", icon: "🎯", xp: 50, test: (s: GamificationState) => s.stats.quizzesCompleted >= 1 },
  { id: "quiz-10", title: "Quiz Master", description: "Complete 10 quizzes", icon: "🏆", xp: 100, test: (s: GamificationState) => s.stats.quizzesCompleted >= 10 },
  { id: "first-focus", title: "Deep Focus", description: "Finish a 25-minute focus session", icon: "⏱️", xp: 75, test: (s: GamificationState) => s.stats.focusMinutes >= 25 },
  { id: "focus-5", title: "In The Zone", description: "Finish 5 focus sessions", icon: "⚡", xp: 150, test: (s: GamificationState) => s.stats.focusSessions >= 5 },
  { id: "level-5", title: "Rising Scholar", description: "Reach level 5", icon: "✨", xp: 200, test: (s: GamificationState) => getLevel(s.totalXp).level >= 5 },
] as const;

export async function loadGamification(): Promise<GamificationState> {
  const value = await loadStudyData<GamificationState>(KEY, EMPTY_GAMIFICATION);
  return { ...EMPTY_GAMIFICATION, ...value, stats: { ...EMPTY_GAMIFICATION.stats, ...(value?.stats || {}) }, events: Array.isArray(value?.events) ? value.events : [], achievements: Array.isArray(value?.achievements) ? value.achievements : [] };
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
  const date = new Date().toLocaleDateString("en-CA");
  const event: XPEvent = { id, xp: Math.max(0, Math.floor(amount)), kind, title, date };
  state.events = [event, ...state.events].slice(0, 1500);
  state.totalXp += event.xp;
  if (extra) for (const key of Object.keys(extra) as (keyof GamificationState["stats"])[]) state.stats[key] += extra[key] || 0;
  for (const achievement of ACHIEVEMENTS) {
    if (!state.achievements.includes(achievement.id) && achievement.test(state)) {
      state.achievements.push(achievement.id);
      state.totalXp += achievement.xp;
      state.events.unshift({ id: "achievement:" + achievement.id, xp: achievement.xp, kind: "achievement", title: achievement.title, date });
    }
  }
  const dailyEvents = state.events.filter(item => item.date === date);
  const questRules = [
    { id: "cards", goal: 10, kind: "card" as XPKind, bonus: 30, title: "Daily quest: 10 flashcards" },
    { id: "quiz", goal: 1, kind: "quiz" as XPKind, bonus: 40, title: "Daily quest: finish a quiz" },
    { id: "focus", goal: 1, kind: "focus" as XPKind, bonus: 50, title: "Daily quest: focus session" },
  ];
  for (const quest of questRules) {
    const completed = dailyEvents.filter(item => item.kind === quest.kind && !item.id.startsWith("quest:")).length;
    const questId = "quest:" + date + ":" + quest.id;
    if (completed >= quest.goal && !state.events.some(item => item.id === questId)) {
      state.totalXp += quest.bonus;
      state.events.unshift({ id: questId, xp: quest.bonus, kind: "achievement", title: quest.title, date });
    }
  }
  await saveStudyData(KEY, state);
  return state;
}
export function getDailyQuestProgress(state: GamificationState) {
  const today = new Date().toLocaleDateString("en-CA");
  const events = state.events.filter(event => event.date === today);
  return [
    { id: "cards", title: "Review 10 flashcards", goal: 10, progress: Math.min(10, events.filter(e => e.kind === "card").length), xp: 30 },
    { id: "quiz", title: "Finish a quiz", goal: 1, progress: Math.min(1, events.filter(e => e.kind === "quiz").length), xp: 40 },
    { id: "focus", title: "Complete a focus session", goal: 1, progress: Math.min(1, events.filter(e => e.kind === "focus").length), xp: 50 },
  ];
}
