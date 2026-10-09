import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

/**
 * Per-account JSON sync for study progress.
 * Cloud data wins when present; on first use, existing device data is migrated up.
 * Local writes happen first so studying remains responsive and works offline.
 */
export async function loadStudyData<T>(key: string, fallback: T): Promise<T> {
  const localKey = "snapstudy:" + key;
  let localValue: T | null = null;
  try {
    const raw = await AsyncStorage.getItem(localKey);
    if (raw !== null) localValue = JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Could not read local study data:", key, error);
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return localValue ?? fallback;

    const { data, error } = await supabase
      .from("user_study_data")
      .select("data_value")
      .eq("user_id", authData.user.id)
      .eq("data_key", key)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const cloudValue = data.data_value as T;
      await AsyncStorage.setItem(localKey, JSON.stringify(cloudValue));
      return cloudValue;
    }

    // No cloud copy yet: preserve and migrate the existing device data.
    if (localValue !== null) {
      const { error: saveError } = await supabase.from("user_study_data").upsert({
        user_id: authData.user.id,
        data_key: key,
        data_value: localValue,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,data_key" });
      if (saveError) throw saveError;
      return localValue;
    }
    return fallback;
  } catch (error) {
    console.warn("Cloud study data load failed; using local cache:", key, error);
    return localValue ?? fallback;
  }
}

export async function saveStudyData<T>(key: string, value: T): Promise<void> {
  const localKey = "snapstudy:" + key;
  await AsyncStorage.setItem(localKey, JSON.stringify(value));

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) return;

    const { error } = await supabase.from("user_study_data").upsert({
      user_id: authData.user.id,
      data_key: key,
      data_value: value,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,data_key" });
    if (error) throw error;
  } catch (error) {
    // Keep the local copy and let the next load retry; never block a study session.
    console.warn("Cloud study data save failed; retained local copy:", key, error);
  }
}
