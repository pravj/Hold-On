// Time calculation utilities

/**
 * Calculates total minutes spent on blocked sites today
 * @returns {Promise<number>} Total minutes spent today
 */
function calculateTodayTimeSpent() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessLogs'], (result) => {
      const logs = result.accessLogs || [];
      
      // Get start of today (12 AM local time)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStartTime = todayStart.getTime();
      
      // Filter logs for today and sum up allowed durations
      let totalMinutes = 0;
      
      logs.forEach(log => {
        const logTime = new Date(log.timestamp).getTime();
        
        // Only count logs from today that were allowed with a duration
        if (logTime >= todayStartTime && log.action === 'Allowed' && log.duration) {
          totalMinutes += log.duration;
        }
      });
      
      resolve(totalMinutes);
    });
  });
}

/**
 * Formats minutes into a human-readable string
 * @param {number} minutes - Total minutes to format
 * @returns {string} Formatted time string
 */
function formatTimeSpent(minutes) {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Gets the appropriate time message for the intervention
 * @param {number} minutes - Total minutes spent today
 * @returns {string} Message to display to user
 */
function getTimeMessage(minutes) {
  if (minutes === 0) {
    return "Let's keep today productive!";
  }
  
  if (minutes < 60) {
    return `You've spent nearly ${minutes} minute${minutes !== 1 ? 's' : ''} on blocked websites today`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `You've almost spent ${hours} hour${hours !== 1 ? 's' : ''} on distracting websites today`;
  }
  
  return `You've almost spent ${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} on distracting websites today`;
}

/**
 * Gets the time category based on minutes spent
 * @param {number} minutes - Total minutes spent today
 * @returns {string} Time category: 'short', 'medium', or 'long'
 */
function getTimeCategory(minutes) {
  if (minutes <= 15) {
    return 'short';  // 0-15 minutes
  } else if (minutes <= 60) {
    return 'medium'; // 16-60 minutes
  } else {
    return 'long';   // 60+ minutes
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateTodayTimeSpent,
    formatTimeSpent,
    getTimeMessage,
    getTimeCategory
  };
}