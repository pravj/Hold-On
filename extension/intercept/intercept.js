// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = decodeURIComponent(urlParams.get('blocked'));
const tabId = parseInt(urlParams.get('tabId'));
const logId = urlParams.get('logId');

// Global variables
let slogansData = null;
let userInterests = [];

// Load necessary data and initialize page
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Intercept page loaded for:', blockedUrl);
  
  // Set the blocked URL
  document.getElementById('blockedUrl').textContent = blockedUrl;
  
  // Load slogans and user interests
  await loadSlogans();
  await loadUserInterests();
  
  // Calculate and display time spent today (this will also display the slogan)
  await displayTimeSpent();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up debug functionality
  setupDebugMode();
});

// Load slogans from JSON file
async function loadSlogans() {
  try {
    const slogansUrl = chrome.runtime.getURL('assets/slogans.json');
    const response = await fetch(slogansUrl);
    slogansData = await response.json();
    console.log('✅ Loaded slogans data');
  } catch (error) {
    console.error('❌ Failed to load slogans:', error);
    // Fallback slogans
    slogansData = {
      others: ["Take a moment to reflect on what truly matters to you."]
    };
  }
}

// Load user interests from storage
async function loadUserInterests() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userInterests'], (result) => {
      userInterests = result.userInterests || [];
      console.log('✅ Loaded user interests:', userInterests);
      
      // If no interests selected, default to "others"
      if (userInterests.length === 0) {
        userInterests = ['others'];
        console.log('ℹ️ No interests found, using default: others');
      }
      
      resolve();
    });
  });
}

// Calculate and display time spent today
async function displayTimeSpent() {
  const minutes = await calculateTodayTimeSpent();
  const message = getTimeMessage(minutes);
  
  document.getElementById('timeMessage').textContent = message;
  console.log(`⏰ Time spent today: ${minutes} minutes - Message: "${message}"`);
  
  // Display slogan based on time spent
  displayTimedSlogan(minutes);
}

// Display random slogan based on user interests and time spent
function displayTimedSlogan(minutesSpent) {
  if (!slogansData || userInterests.length === 0) {
    document.getElementById('sloganText').textContent = "Take a moment to consider your priorities.";
    return;
  }
  
  // Determine time category based on minutes spent
  const timeCategory = getTimeCategory(minutesSpent);
  
  // Select random interest from user's interests
  const randomInterest = userInterests[Math.floor(Math.random() * userInterests.length)];
  
  // Get slogans for that interest and time category
  const interestData = slogansData[randomInterest] || slogansData.others;
  const timeCategorySlogans = interestData[timeCategory] || interestData.short;
  
  // Select random slogan
  const randomSlogan = timeCategorySlogans[Math.floor(Math.random() * timeCategorySlogans.length)];
  
  document.getElementById('sloganText').textContent = randomSlogan;
  console.log(`💡 Time category: ${timeCategory}, Interest: "${randomInterest}", Slogan: "${randomSlogan}"`);
}

// Get time category based on minutes spent
function getTimeCategory(minutes) {
  if (minutes <= 15) {
    return 'short';  // 0-15 minutes
  } else if (minutes <= 60) {
    return 'medium'; // 16-60 minutes
  } else {
    return 'long';   // 60+ minutes
  }
}

// Set up event listeners for buttons
function setupEventListeners() {
  // Allow Access button
  document.getElementById('allowBtn').addEventListener('click', function() {
    console.log('🟢 User clicked Allow Access');
    showDurationModal();
  });
  
  // Close Tab button
  document.getElementById('blockBtn').addEventListener('click', function() {
    console.log('🔴 User clicked Close Tab');
    blockAccess();
  });
  
  // Duration modal buttons
  const durationButtons = document.querySelectorAll('.duration-btn');
  durationButtons.forEach(button => {
    button.addEventListener('click', function() {
      const minutes = parseInt(this.getAttribute('data-minutes'));
      console.log(`🟢 User selected ${minutes} minutes duration`);
      allowAccess(minutes);
    });
  });
}

// Show duration selection modal
function showDurationModal() {
  const modal = document.getElementById('durationModal');
  modal.style.display = 'flex';
}

// Hide duration modal
function hideDurationModal() {
  const modal = document.getElementById('durationModal');
  modal.style.display = 'none';
}

// Allow access for specified duration
function allowAccess(minutes) {
  const url = new URL(blockedUrl);
  const domain = url.hostname.replace('www.', '').replace('m.', '');
  
  console.log(`🟢 INTERCEPT: Allowing access to ${domain} for ${minutes} minutes`);
  
  chrome.runtime.sendMessage({
    action: 'setTemporaryWhitelist',
    domain: domain,
    minutes: minutes,
    logId: logId
  }, () => {
    console.log(`🟢 INTERCEPT: Redirecting to original URL`);
    window.location.href = blockedUrl;
  });
}

// Block access and close tab
function blockAccess() {
  console.log(`🔴 INTERCEPT: User chose to block access`);
  
  chrome.runtime.sendMessage({
    action: 'blockAccess',
    tabId: tabId,
    logId: logId
  });
}

// Time calculation utilities (inline versions of timeCalculator.js functions)
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

// Debug functionality
function setupDebugMode() {
  const debugToggle = document.getElementById('debugToggle');
  const debugContainer = document.getElementById('debugContainer');
  
  debugToggle.addEventListener('click', function() {
    if (debugContainer.style.display === 'none') {
      debugContainer.style.display = 'block';
      debugToggle.textContent = '🔧 Hide Debug Info';
      loadDebugInfo();
    } else {
      debugContainer.style.display = 'none';
      debugToggle.textContent = '🔧 Show Debug Info';
    }
  });
}

function loadDebugInfo() {
  const debugInfo = document.getElementById('debugInfo');
  const blockingTrace = document.getElementById('blockingTrace');
  const logsDisplay = document.getElementById('logsDisplay');
  
  // Basic debug info
  debugInfo.textContent = `
Tab ID: ${tabId}
Log ID: ${logId}
Blocked URL: ${blockedUrl}
User Interests: ${userInterests.join(', ')}
Slogans Loaded: ${slogansData ? 'Yes' : 'No'}
Timestamp: ${new Date().toLocaleString()}
  `.trim();
  
  // Get blocking decision trace
  chrome.runtime.sendMessage({
    action: 'getDebugTrace',
    logId: logId
  }, (response) => {
    if (response && response.trace) {
      blockingTrace.textContent = response.trace;
    } else {
      blockingTrace.textContent = 'No blocking trace available';
    }
  });
  
  // Load recent logs
  chrome.storage.local.get(['accessLogs'], (result) => {
    const logs = result.accessLogs || [];
    const recentLogs = logs.slice(-5).reverse();
    
    let logText = '';
    recentLogs.forEach((log, index) => {
      const date = new Date(log.timestamp).toLocaleString();
      logText += `${index + 1}. ${date}\n`;
      logText += `   URL: ${log.url}\n`;
      logText += `   Action: ${log.action}`;
      if (log.duration) {
        logText += ` (${log.duration} min)`;
      }
      logText += `\n\n`;
    });
    
    logsDisplay.textContent = logText || 'No logs available';
  });
}