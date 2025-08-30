console.log('🚀 Hold On background script loaded at:', new Date().toLocaleString());

// Handle extension installation - trigger onboarding
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🆕 Extension installed - triggering onboarding');
    chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding/onboarding.html')
    });
  }
});

const BLOCKED_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'reddit.com',
  'x.com',
  'linkedin.com'
];

const allowedTabs = new Map();
const interceptedTabs = new Map(); // Track tabs showing intercept page

console.log('🚀 Blocked domains:', BLOCKED_DOMAINS);

// Remove all in-memory state - everything reads from storage directly
// This solves the service worker restart issue permanently

// Global variables to store debug traces
let debugTraces = new Map(); // logId -> trace
let currentLogId = null;

async function isBlockedDomain(hostname, logId = null) {
  // Start building debug trace
  let trace = '';
  
  function addTrace(message) {
    trace += message + '\n';
    console.log(message);
  }
  
  addTrace(`🔍 === BLOCKING DECISION START for ${hostname} ===`);
  
  // Process domain
  const domain = hostname.replace('www.', '').replace('m.', '');
  addTrace(`🔍 STEP 1: Domain processing`);
  addTrace(`🔍   Input hostname: '${hostname}'`);
  addTrace(`🔍   Processed domain: '${domain}'`);
  addTrace(`🔍   Current time: ${new Date().toLocaleString()}`);
  
  // Load whitelist directly from storage every time - NO RACE CONDITIONS
  addTrace(`🔍 STEP 2: Loading whitelist from storage...`);
  
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['temporaryWhitelist'], resolve);
  });
  
  const storedWhitelist = result.temporaryWhitelist || [];
  addTrace(`🔍   Loaded ${storedWhitelist.length} whitelist entries from storage`);
  
  // Clean expired entries and check for matches
  const validEntries = [];
  let isWhitelisted = false;
  let matchedEntry = null;
  
  for (const entry of storedWhitelist) {
    if (Date.now() < entry.expireTime) {
      validEntries.push(entry);
      
      // Check if this domain matches
      const exactMatch = domain === entry.domain;
      const subdomainMatch = domain.endsWith('.' + entry.domain);
      const isMatch = exactMatch || subdomainMatch;
      
      addTrace(`🔍   Checking: '${entry.domain}' vs '${domain}'`);
      addTrace(`🔍     Expires: ${new Date(entry.expireTime).toLocaleString()}`);
      addTrace(`🔍     Time left: ${Math.ceil((entry.expireTime - Date.now()) / 60000)} min`);
      addTrace(`🔍     Exact match: ${exactMatch}`);
      addTrace(`🔍     Subdomain match: ${subdomainMatch}`);
      addTrace(`🔍     Final match: ${isMatch}`);
      
      if (isMatch) {
        isWhitelisted = true;
        matchedEntry = entry;
        break;
      }
    } else {
      addTrace(`🔍   Skipping expired: '${entry.domain}' (expired ${new Date(entry.expireTime).toLocaleString()})`);
    }
  }
  
  // Update storage with cleaned entries
  if (validEntries.length !== storedWhitelist.length) {
    addTrace(`🔍   Cleaning expired entries: ${storedWhitelist.length} -> ${validEntries.length}`);
    chrome.storage.local.set({temporaryWhitelist: validEntries});
  }
  
  // Check whitelist result
  if (isWhitelisted) {
    addTrace(`✅ STEP 3: WHITELIST MATCH FOUND!`);
    addTrace(`✅   Domain '${domain}' matches '${matchedEntry.domain}'`);
    addTrace(`✅   Time remaining: ${Math.ceil((matchedEntry.expireTime - Date.now()) / 60000)} minutes`);
    addTrace(`✅ === BLOCKING DECISION: FALSE (whitelisted) ===`);
    
    if (logId) debugTraces.set(logId, trace);
    return false;
  }
  
  addTrace(`🔍 STEP 3: No whitelist matches found`);
  
  // Check blocked domains
  addTrace(`🔍 STEP 4: Checking against blocked domains`);
  for (const blocked of BLOCKED_DOMAINS) {
    const exactMatch = hostname === blocked;
    const subdomainMatch = hostname.endsWith('.' + blocked);
    const isMatch = exactMatch || subdomainMatch;
    
    addTrace(`🔍   '${blocked}': exact=${exactMatch}, subdomain=${subdomainMatch}, match=${isMatch}`);
    
    if (isMatch) {
      addTrace(`🚫 STEP 5: BLOCKED DOMAIN MATCH!`);
      addTrace(`🚫   '${hostname}' matches blocked domain '${blocked}'`);
      addTrace(`🚫 === BLOCKING DECISION: TRUE (blocked) ===`);
      
      if (logId) debugTraces.set(logId, trace);
      return true;
    }
  }
  
  addTrace(`✅ STEP 5: Not in blocked domains list`);
  addTrace(`✅ === BLOCKING DECISION: FALSE (not blocked) ===`);
  
  if (logId) debugTraces.set(logId, trace);
  return false;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const url = new URL(tab.url);
    console.log(`\n🔵 === TAB UPDATE START for tab ${tabId} ===`);
    console.log(`🔵 URL: ${tab.url}`);
    console.log(`🔵 Hostname: ${url.hostname}`);
    
    // Remove allowedTabs system - everything goes through domain whitelist now
    const logId = Date.now() + '_' + tabId;
    console.log(`🔍 TAB UPDATE: Calling isBlockedDomain('${url.hostname}') with logId: ${logId}...`);
    
    const blockingResult = await isBlockedDomain(url.hostname, logId);
    console.log(`🔍 TAB UPDATE: isBlockedDomain() returned: ${blockingResult}`);
    
    if (blockingResult) {
      console.log(`🚫 TAB UPDATE: Domain ${url.hostname} IS BLOCKED - creating intercept`);
      
      const interceptUrl = chrome.runtime.getURL('intercept/intercept.html') + 
        '?blocked=' + encodeURIComponent(tab.url) + 
        '&tabId=' + tabId + 
        '&logId=' + logId;
      
      // Create log entry
      const logEntry = {
        id: logId,
        timestamp: new Date().toISOString(),
        url: tab.url,
        action: 'Pending'
      };
      
      chrome.storage.local.get(['accessLogs'], (result) => {
        const logs = result.accessLogs || [];
        logs.push(logEntry);
        chrome.storage.local.set({ accessLogs: logs });
      });
      
      // Track intercept
      interceptedTabs.set(tabId, {
        logId: logId,
        originalUrl: tab.url,
        timestamp: new Date().toISOString(),
        resolved: false
      });
      
      console.log(`🚫 TAB UPDATE: Redirecting to intercept page`);
      chrome.tabs.update(tabId, { url: interceptUrl });
    } else {
      console.log(`✅ TAB UPDATE: Domain ${url.hostname} is NOT BLOCKED, allowing through`);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`🔵 BACKGROUND: Received message:`, message);
  
  if (message.action === 'getWhitelistStatus') {
    // Read directly from storage - no in-memory state
    chrome.storage.local.get(['temporaryWhitelist'], (result) => {
      const stored = result.temporaryWhitelist || [];
      const whitelist = stored.map(entry => ({
        domain: entry.domain,
        expireTime: entry.expireTime,
        expired: Date.now() > entry.expireTime
      }));
      sendResponse({ whitelist });
    });
    return true; // Async response
  } else if (message.action === 'getDebugTrace') {
    const trace = message.logId ? debugTraces.get(message.logId) : null;
    sendResponse({ trace: trace || 'No debug trace found for logId: ' + message.logId });
  } else if (message.action === 'setTemporaryWhitelist') {
    const expireTime = Date.now() + (message.minutes * 60 * 1000);
    
    console.log(`🟢 WHITELIST: Adding ${message.domain} for ${message.minutes} minutes`);
    
    // Read current whitelist, add new entry, save back
    chrome.storage.local.get(['temporaryWhitelist'], (result) => {
      const stored = result.temporaryWhitelist || [];
      
      // Remove any existing entry for this domain
      const filtered = stored.filter(entry => entry.domain !== message.domain);
      
      // Add new entry
      filtered.push({
        domain: message.domain,
        expireTime: expireTime
      });
      
      console.log(`🟢 WHITELIST: Saved ${message.domain} until ${new Date(expireTime).toLocaleString()}`);
      
      chrome.storage.local.set({temporaryWhitelist: filtered}, () => {
        console.log(`🟢 WHITELIST: Storage updated with ${filtered.length} entries`);
      });
    });
    
    // Update log entry to Allowed with duration
    if (message.logId) {
      chrome.storage.local.get(['accessLogs'], (result) => {
        const logs = result.accessLogs || [];
        const logIndex = logs.findIndex(log => log.id === message.logId);
        if (logIndex !== -1) {
          logs[logIndex].action = 'Allowed';
          logs[logIndex].duration = message.minutes; // Store duration in minutes
          chrome.storage.local.set({ accessLogs: logs });
        }
      });
    }
  } else if (message.action === 'blockAccess') {
    console.log(`🔴 BLOCK: User clicked No - blocking access for tab ${message.tabId}`);
    
    // Update the existing log entry
    if (message.logId) {
      console.log(`🔴 BLOCK: Updating log entry ${message.logId} to 'Blocked'`);
      chrome.storage.local.get(['accessLogs'], (result) => {
        const logs = result.accessLogs || [];
        const logIndex = logs.findIndex(log => log.id === message.logId);
        if (logIndex !== -1) {
          logs[logIndex].action = 'Blocked';
          chrome.storage.local.set({ accessLogs: logs });
          console.log(`🔴 BLOCK: Updated log entry successfully`);
        } else {
          console.log(`🔴 BLOCK: ERROR - Could not find log entry ${message.logId}`);
        }
      });
    }
    
    // Mark as resolved
    if (interceptedTabs.has(message.tabId)) {
      interceptedTabs.get(message.tabId).resolved = true;
      console.log(`🔴 BLOCK: Marked intercept as resolved for tab ${message.tabId}`);
    }
    
    console.log(`🔴 BLOCK: Closing tab ${message.tabId}`);
    chrome.tabs.remove(message.tabId);
  }
});

// Handle tab closure for unresolved intercepts
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (interceptedTabs.has(tabId)) {
    const intercept = interceptedTabs.get(tabId);
    
    if (!intercept.resolved) {
      // Update the existing log entry to "Closed"
      chrome.storage.local.get(['accessLogs'], (result) => {
        const logs = result.accessLogs || [];
        const logIndex = logs.findIndex(log => log.id === intercept.logId);
        if (logIndex !== -1) {
          logs[logIndex].action = 'Closed';
          chrome.storage.local.set({ accessLogs: logs });
        }
      });
    }
    
    interceptedTabs.delete(tabId);
  }
});