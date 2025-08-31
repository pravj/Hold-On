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
  
  // Set the site info (favicon and clean domain)
  setSiteInfo(blockedUrl);
  
  // Load slogans and user interests
  await loadSlogans();
  await loadUserInterests();
  
  // Calculate and display time spent today (this will also display the slogan)
  await displayTimeSpent();
  
  // Calculate and display focus metrics
  await displayFocusMetrics();
  
  // Set up event listeners
  setupEventListeners();
  
  // Start the 10-second timer for the allow button
  startAllowButtonTimer();
  
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
  
  const timeMessageElement = document.getElementById('timeMessage');
  if (timeMessageElement) {
    timeMessageElement.textContent = message;
  } else {
    console.error('❌ timeMessage element not found in DOM');
  }
  console.log(`⏰ Time spent today: ${minutes} minutes - Message: "${message}"`);
  
  // Display slogan based on time spent
  displayTimedSlogan(minutes);
}

// Display random slogan based on user interests and time spent
function displayTimedSlogan(minutesSpent) {
  const sloganElement = document.getElementById('sloganText');
  if (!sloganElement) {
    console.error('❌ sloganText element not found in DOM');
    return;
  }
  
  if (!slogansData || userInterests.length === 0) {
    sloganElement.textContent = "Take a moment to consider your priorities.";
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
  
  sloganElement.textContent = randomSlogan;
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
  
  // Close modal when clicking outside or pressing Esc
  setupModalCloseHandlers();
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
  
  // Template messages for randomization
  const messageTemplates = [
    "You've already lost TIME to distractions today.",
    "Roughly TIME wasted today — want to add more?",
    "Almost TIME slipped away today. For what?",
    "You've scrolled away around TIME today.",
    "You have traded almost TIME today for scrolling.",
    "Around TIME gone to nothing today.",
    "Today's tally: TIME lost to scrolling.",
    "Nearly TIME of today, gone for nothing.",
    "About TIME of today — wasted on scrolling.",
    "You've lost nearly TIME today.",
    "Around TIME wasted away today.",
    "You've burned almost TIME today.",
    "TIME of focus lost today.",
    "Nearly TIME slipped off today.",
    "You've thrown away TIME today.",
    "Today's loss: about TIME.",
    "TIME traded for nothing today.",
    "You've drained TIME today."
  ];
  
  // Format time in "Xh Ym" or "Xm" format
  const timeString = formatTimeCompact(minutes);
  
  // Select random template and replace TIME placeholder
  const randomTemplate = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
  return randomTemplate.replace('TIME', timeString);
}

// Helper function to format time in compact format (e.g., "2h 15m" or "45m")
function formatTimeCompact(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

// Calculate and display focus metrics
async function displayFocusMetrics() {
  const minutes = await calculateTodayTimeSpent();
  const wastedHours = minutes / 60;
  
  // Calculate hours passed since start of day
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hoursPassedSinceStart = (now - todayStart) / (1000 * 60 * 60);
  
  // Dynamic denominator: use elapsed hours until 17 hours have passed, then cap at 17
  let totalAvailableHours;
  if (hoursPassedSinceStart >= 17) {
    totalAvailableHours = 17;  // Cap at 17 hours max
  } else {
    totalAvailableHours = hoursPassedSinceStart;  // Use actual elapsed time
  }
  
  // Calculate focus uptime with dynamic denominator
  const uptime = Math.max(0, ((totalAvailableHours - wastedHours) / totalAvailableHours) * 100);
  
  // Display uptime percentage
  const uptimeValueElement = document.getElementById('focusUptimeValue');
  if (uptimeValueElement) {
    uptimeValueElement.textContent = `${uptime.toFixed(2)}%`;
  } else {
    console.error('❌ focusUptimeValue element not found in DOM');
  }
  
  console.log(`📊 Focus metrics: ${minutes}min wasted, ${hoursPassedSinceStart.toFixed(1)}h elapsed, ${totalAvailableHours.toFixed(1)}h available, ${uptime.toFixed(2)}% uptime`);
  
  // Generate craving spikes bars for focus uptime visualization
  generateCravingSpikes();
}

// Removed old uptime blocks function - now using craving bars for focus uptime

// Generate activity visualization based on real access logs
async function generateCravingSpikes() {
  const cravingContainer = document.getElementById('cravingBars');
  if (!cravingContainer) {
    console.error('❌ cravingBars element not found in DOM');
    return;
  }
  cravingContainer.innerHTML = '';
  
  // Get access logs
  const accessLogs = await getAccessLogs();
  
  // Calculate intervals (24 hours * 60 minutes / 5 minutes = 288 intervals)
  const totalIntervals = (24 * 60) / 5; // 288 intervals
  
  // Get current time and start of today
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Process logs to create interval map with site information
  const intervalData = new Array(totalIntervals).fill(null).map(() => ({
    status: 'no-interruption',
    site: null
  }));
  
  accessLogs.forEach(log => {
    const logTime = new Date(log.timestamp);
    const logDate = new Date(logTime.getFullYear(), logTime.getMonth(), logTime.getDate());
    
    // Only process logs from today
    if (logDate.getTime() === todayStart.getTime()) {
      // Calculate which 5-minute interval this log belongs to
      const minutesFromStart = Math.floor((logTime - todayStart) / (1000 * 60));
      const intervalIndex = Math.floor(minutesFromStart / 5);
      
      if (intervalIndex >= 0 && intervalIndex < totalIntervals) {
        // Extract clean domain from log URL
        let cleanSite = 'unknown site';
        try {
          if (log.url) {
            const urlObj = new URL(log.url);
            cleanSite = urlObj.hostname.replace(/^www\./, '');
          }
        } catch (e) {
          // Keep default 'unknown site'
        }
        
        // Handle both old and new log formats for backward compatibility
        const isResisted = log.action === 'Attempted' || log.action === 'Prevented' || log.action === 'Blocked';
        const isAllowed = log.action === 'Allowed';
        
        if (isResisted) {
          // Only mark as resisted if not already marked as gave-in
          if (intervalData[intervalIndex].status === 'no-interruption') {
            intervalData[intervalIndex] = {
              status: 'resisted',
              site: cleanSite
            };
          }
        } else if (isAllowed) {
          // Mark as gave-in (overrides resisted)
          intervalData[intervalIndex] = {
            status: 'gave-in',
            site: cleanSite
          };
        }
      }
    }
  });
  
  // Calculate current time interval to determine future bars
  const currentMinutesFromStart = Math.floor((now - todayStart) / (1000 * 60));
  const currentIntervalIndex = Math.floor(currentMinutesFromStart / 5);
  
  // Generate bars based on real data
  for (let i = 0; i < totalIntervals; i++) {
    const bar = document.createElement('div');
    bar.className = 'craving-bar';
    
    // Determine status: future bars should be grey
    let status, site = null;
    if (i > currentIntervalIndex) {
      status = 'future';
      bar.classList.add('future');
      // No tooltip for future bars
    } else {
      const intervalInfo = intervalData[i];
      status = intervalInfo.status;
      site = intervalInfo.site;
      bar.classList.add(status);
      
      // Set tooltip based on status
      if (status === 'gave-in' && site) {
        bar.title = `Gave in: ${site}`;
      } else if (status === 'resisted' && site) {
        bar.title = `Attempted to open: ${site}`;
      } else if (status === 'no-interruption') {
        // Calculate time for no-interruption tooltip
        const startMinute = i * 5;
        const startHour = Math.floor(startMinute / 60);
        const startMin = startMinute % 60;
        const endMin = (startMin + 5) % 60;
        const endHour = startMin + 5 >= 60 ? startHour + 1 : startHour;
        
        const formatTime = (h, m) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return `${hour12}:${m.toString().padStart(2, '0')}${period}`;
        };
        
        bar.title = `${formatTime(startHour, startMin)}–${formatTime(endHour, endMin)} • No interruption`;
      }
    }
    
    // Add staggered animation delay
    bar.style.animationDelay = `${i * 0.001}s`;
    
    cravingContainer.appendChild(bar);
  }
  
  console.log(`📊 Generated ${totalIntervals} activity bars from real access logs`);
}

// Get access logs from storage
function getAccessLogs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessLogs'], (result) => {
      resolve(result.accessLogs || []);
    });
  });
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

// Start the 10-second timer for the allow button
function startAllowButtonTimer() {
  const allowBtn = document.getElementById('allowBtn');
  const timerSlider = allowBtn.querySelector('.timer-slider');
  
  if (!allowBtn || !timerSlider) {
    console.error('❌ Allow button or timer slider not found');
    return;
  }
  
  // Start the slider animation
  timerSlider.classList.add('active');
  
  // Enable the button after 10 seconds
  setTimeout(() => {
    allowBtn.disabled = false;
    allowBtn.title = 'Click to allow access';
    console.log('🔓 Allow button enabled after 10 seconds');
  }, 10000);
}

// Set up modal close handlers
function setupModalCloseHandlers() {
  const modal = document.getElementById('durationModal');
  const modalContent = document.querySelector('.modal-content');
  
  if (!modal || !modalContent) {
    console.error('❌ Duration modal elements not found');
    return;
  }
  
  // Close when clicking outside the modal content
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      console.log('🚫 User clicked outside modal - closing');
      hideDurationModal();
    }
  });
  
  // Prevent clicks inside modal content from closing the modal
  modalContent.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // Close when pressing Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      console.log('🚫 User pressed Escape - closing modal');
      hideDurationModal();
    }
  });
}

// Set site favicon and clean domain
function setSiteInfo(url) {
  const faviconElement = document.getElementById('siteFavicon');
  const domainElement = document.getElementById('siteDomain');
  
  if (!faviconElement || !domainElement) {
    console.error('❌ Site info elements not found in DOM');
    return;
  }
  
  try {
    const urlObj = new URL(url);
    let cleanDomain = urlObj.hostname;
    
    // Remove www. prefix if present
    if (cleanDomain.startsWith('www.')) {
      cleanDomain = cleanDomain.substring(4);
    }
    
    // Set the clean domain
    domainElement.textContent = cleanDomain;
    
    // Set favicon using Google's favicon service
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=32`;
    faviconElement.src = faviconUrl;
    faviconElement.alt = `${cleanDomain} favicon`;
    
    // Fallback if favicon fails to load
    faviconElement.onerror = function() {
      this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';
      this.alt = 'Website icon';
    };
    
    console.log(`🌐 Set site info: ${cleanDomain}`);
  } catch (error) {
    console.error('❌ Error parsing URL:', error);
    domainElement.textContent = 'Unknown site';
    faviconElement.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';
  }
}