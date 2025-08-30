// Interest Selection Functionality
document.addEventListener('DOMContentLoaded', function() {
  const interestButtons = document.querySelectorAll('.interest-btn');
  const selectedCountElement = document.getElementById('selectedCount');
  const saveButton = document.getElementById('saveInterests');
  
  let selectedInterests = [];
  const maxSelections = 3;

  // Load current interests from storage
  chrome.storage.local.get(['userInterests'], function(result) {
    selectedInterests = result.userInterests || [];
    updateInterestUI();
  });

  // Handle interest selection
  interestButtons.forEach(button => {
    button.addEventListener('click', function() {
      const interest = this.getAttribute('data-interest');
      
      if (this.classList.contains('selected')) {
        // Deselect
        this.classList.remove('selected');
        selectedInterests = selectedInterests.filter(item => item !== interest);
        
        // Re-enable all disabled buttons
        interestButtons.forEach(btn => {
          btn.classList.remove('disabled');
        });
      } else if (selectedInterests.length < maxSelections) {
        // Select
        this.classList.add('selected');
        selectedInterests.push(interest);
        
        // If we've reached max selections, disable non-selected buttons
        if (selectedInterests.length === maxSelections) {
          interestButtons.forEach(btn => {
            if (!btn.classList.contains('selected')) {
              btn.classList.add('disabled');
            }
          });
        }
      }
      
      updateInterestUI();
    });
  });

  function updateInterestUI() {
    selectedCountElement.textContent = selectedInterests.length;
    
    // Update button states based on current selection
    interestButtons.forEach(button => {
      const interest = button.getAttribute('data-interest');
      if (selectedInterests.includes(interest)) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });
    
    // Handle disabled state
    if (selectedInterests.length === maxSelections) {
      interestButtons.forEach(btn => {
        if (!btn.classList.contains('selected')) {
          btn.classList.add('disabled');
        }
      });
    } else {
      interestButtons.forEach(btn => {
        btn.classList.remove('disabled');
      });
    }
  }

  // Handle save button
  saveButton.addEventListener('click', function() {
    chrome.storage.local.set({
      userInterests: selectedInterests
    }, function() {
      console.log('✅ Interests saved:', selectedInterests);
      
      // Show success feedback
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Saved!';
      saveButton.style.background = '#28a745';
      
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.style.background = '';
      }, 1500);
    });
  });
});

// View Logs Functionality
document.getElementById('viewLogsBtn').addEventListener('click', () => {
  chrome.storage.local.get(['accessLogs'], (result) => {
    const logs = result.accessLogs || [];
    if (logs.length === 0) {
      alert('No access attempts logged yet.');
      return;
    }
    
    let logText = 'Access Log:\n\n';
    logs.forEach((log, index) => {
      const date = new Date(log.timestamp).toLocaleString();
      logText += `${index + 1}. ${date}\n`;
      logText += `   URL: ${log.url}\n`;
      logText += `   Action: ${log.action}\n\n`;
    });
    
    alert(logText);
  });
});