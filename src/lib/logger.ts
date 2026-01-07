 

const isDev = import.meta.env.DEV;

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log("[INFO]", new Date().toISOString(), ...args);
    }
  },

  error: (...args: unknown[]) => {
    console.error("[ERROR]", new Date().toISOString(), ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn("[WARN]", new Date().toISOString(), ...args);
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug("[DEBUG]", new Date().toISOString(), ...args);
    }
  },

  success: (...args: unknown[]) => {
    if (isDev) {
      console.log("[SUCCESS]", new Date().toISOString(), ...args);
    }
  },
};
