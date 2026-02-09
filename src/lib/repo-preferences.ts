export type RepoPreferences = {
  pinned: number[];
  archived: number[];
};

const STORAGE_KEY_PREFIX = "agentfoundry:repo-prefs:";

function getKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function loadPreferences(userId: string): RepoPreferences {
  if (typeof window === "undefined") return { pinned: [], archived: [] };
  try {
    const raw = localStorage.getItem(getKey(userId));
    if (!raw) return { pinned: [], archived: [] };
    const parsed = JSON.parse(raw);
    return {
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
      archived: Array.isArray(parsed.archived) ? parsed.archived : [],
    };
  } catch {
    return { pinned: [], archived: [] };
  }
}

export function savePreferences(userId: string, prefs: RepoPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getKey(userId), JSON.stringify(prefs));
}

export function togglePin(userId: string, repoId: number): RepoPreferences {
  const prefs = loadPreferences(userId);
  const idx = prefs.pinned.indexOf(repoId);
  if (idx >= 0) {
    prefs.pinned.splice(idx, 1);
  } else {
    prefs.pinned.push(repoId);
  }
  savePreferences(userId, prefs);
  return prefs;
}

export function toggleArchive(userId: string, repoId: number): RepoPreferences {
  const prefs = loadPreferences(userId);
  const idx = prefs.archived.indexOf(repoId);
  if (idx >= 0) {
    prefs.archived.splice(idx, 1);
  } else {
    prefs.archived.push(repoId);
    // Unpin if archiving
    const pinIdx = prefs.pinned.indexOf(repoId);
    if (pinIdx >= 0) prefs.pinned.splice(pinIdx, 1);
  }
  savePreferences(userId, prefs);
  return prefs;
}
