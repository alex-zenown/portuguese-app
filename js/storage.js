// localStorage abstraction with ptapp_ prefix

const PREFIX = 'ptapp_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write failed:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  // Get all ptapp_ keys
  keys() {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) {
        result.push(k.slice(PREFIX.length));
      }
    }
    return result;
  },

  // Export all app data as JSON string
  exportData() {
    const data = {};
    for (const key of this.keys()) {
      data[key] = this.get(key);
    }
    return JSON.stringify(data, null, 2);
  },

  // Import data from JSON string
  importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value);
      }
      return true;
    } catch {
      return false;
    }
  },

  // Clear all app data
  clearAll() {
    for (const key of this.keys()) {
      this.remove(key);
    }
  }
};

// Streak management
export function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const lastActive = storage.get('lastActiveDate', '');
  let streak = storage.get('streak', 0);

  if (lastActive === today) return streak;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastActive === yesterday) {
    streak++;
  } else if (lastActive !== today) {
    streak = 1;
  }

  storage.set('streak', streak);
  storage.set('lastActiveDate', today);

  // Track activity for heatmap
  const activity = storage.get('activityLog', {});
  activity[today] = (activity[today] || 0) + 1;
  storage.set('activityLog', activity);

  return streak;
}

export function logActivity(count = 1) {
  const today = new Date().toISOString().slice(0, 10);
  const activity = storage.get('activityLog', {});
  activity[today] = (activity[today] || 0) + count;
  storage.set('activityLog', activity);
}
