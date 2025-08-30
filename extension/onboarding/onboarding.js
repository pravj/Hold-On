document.addEventListener('DOMContentLoaded', function() {
  const interestButtons = document.querySelectorAll('.interest-btn');
  const selectedCountElement = document.getElementById('selectedCount');
  const continueButton = document.getElementById('continueBtn');
  
  let selectedInterests = [];
  const maxSelections = 3;

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
      
      updateUI();
    });
  });

  function updateUI() {
    selectedCountElement.textContent = selectedInterests.length;
    
    // Enable continue button if at least 1 interest is selected
    if (selectedInterests.length > 0) {
      continueButton.disabled = false;
    } else {
      continueButton.disabled = true;
    }
  }

  // Handle continue button
  continueButton.addEventListener('click', function() {
    if (selectedInterests.length === 0) {
      return;
    }

    // Save selected interests to storage
    chrome.storage.local.set({
      userInterests: selectedInterests,
      onboardingCompleted: true
    }, function() {
      console.log('✅ Onboarding completed! Selected interests:', selectedInterests);
      
      // Close the onboarding tab
      chrome.tabs.getCurrent((tab) => {
        chrome.tabs.remove(tab.id);
      });
    });
  });

  console.log('🚀 Onboarding page loaded');
});