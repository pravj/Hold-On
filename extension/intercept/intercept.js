const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = decodeURIComponent(urlParams.get('blocked'));
const tabId = parseInt(urlParams.get('tabId'));
const logId = urlParams.get('logId');

document.getElementById('blockedUrl').textContent = blockedUrl;

// Global variables for chat system
let interventionContent = null;
let currentRequiredText = null;

// Load dynamic content from JSON
async function loadInterventionContent() {
  try {
    const contentUrl = chrome.runtime.getURL('assets/interventionContent.json');
    const response = await fetch(contentUrl);
    const content = await response.json();
    console.log('📋 Loaded intervention content:', content);
    return content;
  } catch (error) {
    console.error('❌ Failed to load intervention content:', error);
    return null;
  }
}

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Add typing dots animation
function addTypingDots(avatar) {
  const chatMessages = document.getElementById('chatMessages');
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message persona';
  typingDiv.id = 'typing-indicator';
  
  typingDiv.innerHTML = `
    <div class="chat-avatar persona">${avatar}</div>
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return typingDiv;
}

// Remove typing dots
function removeTypingDots() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Add message to chat with optional typing animation
function addChatMessage(text, type, avatar, showTyping = false) {
  const chatMessages = document.getElementById('chatMessages');
  
  if (showTyping && type === 'persona') {
    // Show typing dots first
    const typingDiv = addTypingDots(avatar);
    
    // After delay, remove typing and show actual message
    setTimeout(() => {
      removeTypingDots();
      
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${type}`;
      
      messageDiv.innerHTML = `
        <div class="chat-avatar ${type}">${avatar}</div>
        <div class="chat-bubble ${type}">${text}</div>
      `;
      
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1500); // 1.5 second typing animation
  } else {
    // Show message immediately
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    messageDiv.innerHTML = `
      <div class="chat-avatar ${type}">${avatar}</div>
      <div class="chat-bubble ${type}">${text}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// Show user response buttons
function showUserButtons() {
  const inputArea = document.getElementById('chatInputArea');
  inputArea.style.display = 'block';
  
  inputArea.innerHTML = `
    <div class="chat-buttons">
      <button class="chat-btn primary" id="letMeGoBtn">Let me go</button>
      <button class="chat-btn secondary" id="skipBtn">OK, I will skip</button>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('letMeGoBtn').addEventListener('click', handleLetMeGo);
  document.getElementById('skipBtn').addEventListener('click', handleSkip);
}

// Handle "Let me go" button
function handleLetMeGo() {
  // Add user message
  addChatMessage('Let me go', 'user', '👤');
  
  // Hide input area temporarily
  document.getElementById('chatInputArea').style.display = 'none';
  
  // Generate angry response after a delay
  setTimeout(() => {
    const angryComment = getRandomItem(interventionContent.angryComments);
    
    // Pick a random angryAsk object
    const angryAskObj = getRandomItem(interventionContent.angryAsks);
    const angryVerb = angryAskObj.verb;
    const angryAsk = getRandomItem(angryAskObj.asks);
    
    // Store the required text for validation
    currentRequiredText = angryAsk;
    
    const fullResponse = `${angryComment} ${angryVerb}: "${angryAsk}"`;
    addChatMessage(fullResponse, 'persona', interventionContent.avatar, true);
    
    // Show text input after another delay
    setTimeout(() => {
      showTextInput(angryAsk);
    }, 1000);
  }, 1500);
}

// Handle "OK, I will skip" button  
function handleSkip() {
  // Add user message
  addChatMessage('OK, I will skip', 'user', '👤');
  
  // Hide chat input area
  document.getElementById('chatInputArea').style.display = 'none';
  
  // Show success message from persona
  setTimeout(() => {
    const happyComment = getRandomItem(interventionContent.happyComments);
    addChatMessage(happyComment, 'persona', interventionContent.avatar, true);
    
    // Update log to "Blocked" and close tab after celebrating the good choice
    setTimeout(() => {
      addChatMessage('This tab will close now. Go focus on what matters! 💪', 'persona', interventionContent.avatar, true);
      
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'blockAccess',
          tabId: tabId,
          logId: logId
        });
      }, 1500);
    }, 1500);
  }, 1000);
}

// Show text input for validation
function showTextInput(requiredText) {
  const inputArea = document.getElementById('chatInputArea');
  inputArea.style.display = 'block';
  
  inputArea.innerHTML = `
    <div class="chat-instruction">
      Type exactly: "<strong>${requiredText}</strong>"
    </div>
    <div class="chat-text-input">
      <input type="text" id="validationInput" placeholder="Type the exact text above..." autocomplete="off">
      <div class="chat-error-message" id="errorMessage" style="display: none;"></div>
    </div>
    <div class="chat-buttons" style="margin-top: 15px;">
      <button class="chat-btn primary" id="submitBtn">Submit</button>
    </div>
  `;
  
  // Focus on input
  document.getElementById('validationInput').focus();
  
  // Add event listeners
  document.getElementById('submitBtn').addEventListener('click', validateText);
  
  // Handle Enter key
  document.getElementById('validationInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      validateText();
    }
  });
}

// Validate typed text
function validateText() {
  const input = document.getElementById('validationInput');
  const errorMessage = document.getElementById('errorMessage');
  const typedText = input.value;
  
  if (typedText === currentRequiredText) {
    // Correct! Add user message and proceed
    addChatMessage(typedText, 'user', '👤');
    
    // Hide input area
    document.getElementById('chatInputArea').style.display = 'none';
    
    // Show final persona message and then duration modal
    setTimeout(() => {
      addChatMessage('Fine... You can go. But remember this choice.', 'persona', interventionContent.avatar, true);
      
      // Show duration modal after final message
      setTimeout(() => {
        document.getElementById('durationModal').classList.add('show');
      }, 2000);
    }, 1000);
    
  } else {
    // Incorrect - show error
    input.parentElement.classList.add('error');
    errorMessage.style.display = 'block';
    errorMessage.textContent = 'Not quite right. Type it exactly as shown above.';
    
    // Clear error after user starts typing again
    input.addEventListener('input', function() {
      input.parentElement.classList.remove('error');
      errorMessage.style.display = 'none';
    }, { once: true });
  }
}

// Initialize chat conversation
async function initializeChat() {
  const rawContent = await loadInterventionContent();
  
  if (!rawContent || !rawContent.personas || rawContent.personas.length === 0) {
    console.error('❌ Could not load intervention content, falling back to simple mode');
    return false;
  }
  
  // Use the first persona from the array
  interventionContent = rawContent.personas[0];
  
  // Add avatar if not present
  if (!interventionContent.avatar) {
    interventionContent.avatar = '👤'; // Default avatar
  }
  
  console.log('✅ Loaded persona:', interventionContent.name);
  
  // Start conversation with random first comment
  setTimeout(() => {
    const firstComment = getRandomItem(interventionContent.firstComments);
    addChatMessage(firstComment, 'persona', interventionContent.avatar, true);
    
    // Show user response buttons after persona speaks
    setTimeout(() => {
      showUserButtons();
    }, 1500);
  }, 500);
  
  return true;
}

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

// Initialize chat conversation when page loads
initializeChat();

console.log(`🔵 INTERCEPT: Page loaded for ${blockedUrl}, tabId: ${tabId}, logId: ${logId}`);

// Handle duration selection (for modal)
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

