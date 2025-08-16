const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = decodeURIComponent(urlParams.get('blocked'));
const tabId = parseInt(urlParams.get('tabId'));
const logId = urlParams.get('logId');

document.getElementById('blockedUrl').textContent = blockedUrl;

function displayDebugInfo() {
  const currentDomain = new URL(blockedUrl).hostname.replace('www.', '').replace('m.', '');
  const currentTime = new Date().toLocaleString();
  
  // Get whitelist status
  chrome.runtime.sendMessage({action: 'getWhitelistStatus'}, (response) => {
    let debugText = `Current Time: ${currentTime}\n`;
    debugText += `Blocked URL: ${blockedUrl}\n`;
    debugText += `Raw Domain: ${new URL(blockedUrl).hostname}\n`;
    debugText += `Processed Domain: ${currentDomain}\n\n`;
    
    if (response && response.whitelist && response.whitelist.length > 0) {
      debugText += `Current Whitelist:\n`;
      response.whitelist.forEach(w => {
        const timeLeft = Math.max(0, Math.ceil((w.expireTime - Date.now()) / 60000));
        const status = w.expired ? 'EXPIRED' : `${timeLeft} min left`;
        debugText += `  • ${w.domain} - ${status}\n`;
      });
      
      const matchingEntry = response.whitelist.find(w => w.domain === currentDomain);
      if (matchingEntry) {
        const timeLeft = Math.ceil((matchingEntry.expireTime - Date.now()) / 60000);
        if (timeLeft > 0) {
          debugText += `\n🚨 PROBLEM: ${currentDomain} IS whitelisted for ${timeLeft} more minutes!\n`;
          debugText += `This shouldn't be blocked!`;
          
          // Show alert
          document.getElementById('debugInfo').innerHTML += `
            <div class="debug-alert">
              🚨 WHITELIST BUG DETECTED! 
              Domain ${currentDomain} is whitelisted for ${timeLeft} more minutes but was still blocked!
            </div>
          `;
        } else {
          debugText += `\n✅ Whitelist expired, blocking is correct.`;
        }
      } else {
        debugText += `\n✅ No whitelist entry for ${currentDomain}, blocking is correct.`;
      }
    } else {
      debugText += `No active whitelists found.\n`;
      debugText += `✅ Blocking is correct.`;
    }
    
    document.getElementById('debugInfo').textContent = debugText;
  });
  
  // Get the detailed blocking trace using logId
  chrome.runtime.sendMessage({action: 'getDebugTrace', logId: logId}, (response) => {
    if (response && response.trace) {
      document.getElementById('blockingTrace').textContent = response.trace;
    } else {
      document.getElementById('blockingTrace').textContent = 'No debug trace available for logId: ' + logId;
    }
  });
}

function displayLogs() {
  chrome.storage.local.get(['accessLogs'], (result) => {
    const logs = result.accessLogs || [];
    const logsDisplay = document.getElementById('logsDisplay');
    
    // Add current whitelist status
    chrome.runtime.sendMessage({action: 'getWhitelistStatus'}, (response) => {
      const currentDomain = new URL(blockedUrl).hostname.replace('www.', '').replace('m.', '');
      let whitelistInfo = '';
      
      if (response && response.whitelist) {
        const whitelist = response.whitelist;
        const whitelistEntry = whitelist.find(w => w.domain === currentDomain);
        if (whitelistEntry) {
          const timeLeft = Math.ceil((whitelistEntry.expireTime - Date.now()) / 60000);
          whitelistInfo = `<div class="whitelist-status">
            <strong>⏰ Whitelist Status:</strong> ${currentDomain} whitelisted for ${timeLeft} more minutes
          </div>`;
        } else {
          whitelistInfo = `<div class="whitelist-status">
            <strong>⏰ Whitelist Status:</strong> ${currentDomain} not currently whitelisted
          </div>`;
        }
      }
      
      if (logs.length === 0) {
        logsDisplay.innerHTML = whitelistInfo + '<p>No logs found</p>';
        return;
      }
      
      // Show last 10 logs, most recent first
      const recentLogs = logs.slice(-10).reverse();
      const logHtml = recentLogs.map(log => {
        const time = new Date(log.timestamp).toLocaleString();
        const domain = new URL(log.url).hostname;
        return `<div class="log-entry">
          <span class="log-time">${time}</span>
          <span class="log-domain">${domain}</span>
          <span class="log-action ${log.action.toLowerCase()}">${log.action}</span>
        </div>`;
      }).join('');
      
      logsDisplay.innerHTML = whitelistInfo + logHtml;
    });
  });
}



// Debug toggle functionality
document.getElementById('debugToggle').addEventListener('click', () => {
  const debugContainer = document.getElementById('debugContainer');
  const toggleBtn = document.getElementById('debugToggle');
  
  if (debugContainer.style.display === 'none') {
    // Show debug info
    debugContainer.style.display = 'block';
    toggleBtn.textContent = '🔧 Hide Debug Info';
    toggleBtn.classList.add('active');
    
    // Load debug info when first shown
    displayDebugInfo();
    displayLogs();
  } else {
    // Hide debug info
    debugContainer.style.display = 'none';
    toggleBtn.textContent = '🔧 Show Debug Info';
    toggleBtn.classList.remove('active');
  }
});

// Don't load debug info by default anymore - only when toggled

console.log(`🔵 INTERCEPT: Page loaded for ${blockedUrl}, tabId: ${tabId}, logId: ${logId}`);

document.getElementById('yesBtn').addEventListener('click', () => {
  console.log(`🟡 INTERCEPT: User clicked 'Yes, Continue' button`);
  // Show duration modal
  document.getElementById('durationModal').classList.add('show');
  console.log(`🟡 INTERCEPT: Duration modal shown`);
});

// Handle duration selection
document.querySelectorAll('.duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const minutes = parseInt(btn.dataset.minutes);
    const domain = new URL(blockedUrl).hostname.replace('www.', '').replace('m.', '');
    const expireTime = new Date(Date.now() + minutes * 60 * 1000);
    
    console.log(`🟢 INTERCEPT: User selected ${minutes} minutes duration for domain ${domain}`);
    console.log(`🟢 INTERCEPT: Whitelist should expire at: ${expireTime.toLocaleString()}`);
    console.log(`🟢 INTERCEPT: Current time: ${new Date().toLocaleString()}`);
    console.log(`🟢 INTERCEPT: Raw domain from URL: '${new URL(blockedUrl).hostname}'`);
    console.log(`🟢 INTERCEPT: Processed domain: '${domain}'`);
    console.log(`🟢 INTERCEPT: Original URL: ${blockedUrl}`);
    
    // Set temporary whitelist
    console.log(`🟢 INTERCEPT: Sending setTemporaryWhitelist message`);
    chrome.runtime.sendMessage({
      action: 'setTemporaryWhitelist',
      domain: domain,
      minutes: minutes,
      logId: logId
    }, () => {
      // After whitelist is set, redirect current tab
      console.log(`🟢 INTERCEPT: Redirecting to original URL`);
      window.location.href = blockedUrl;
    });
  });
});

document.getElementById('noBtn').addEventListener('click', () => {
  console.log(`🔴 INTERCEPT: User clicked 'No, Go Back' button`);
  console.log(`🔴 INTERCEPT: Sending blockAccess message`);
  chrome.runtime.sendMessage({
    action: 'blockAccess',
    tabId: tabId,
    logId: logId
  });
});

