/**
 * Simple utility for managing local storage settings
 */
export const localSettings = {
  /**
   * Get a value from local storage
   * @param {string} key The key to get
   * @param {any} defaultValue Default value if key doesn't exist
   * @returns {any} The stored value or defaultValue
   */
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error getting from localStorage:', error);
      return defaultValue;
    }
  },
  
  /**
   * Set a value in local storage
   * @param {string} key The key to set
   * @param {any} value The value to store
   */
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  },
  
  /**
   * Remove a value from local storage
   * @param {string} key The key to remove
   */
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
  
  /**
   * Clear all values from local storage
   */
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}; 