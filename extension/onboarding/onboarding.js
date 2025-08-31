document.addEventListener('DOMContentLoaded', function() {
  // Stepper navigation elements
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const stepItems = document.querySelectorAll('.step-item');
  const stepConnector = document.querySelector('.step-connector');
  
  // Navigation buttons
  const nextToInterests = document.getElementById('nextToInterests');
  const backToIntro = document.getElementById('backToIntro');
  const finishOnboarding = document.getElementById('finishOnboarding');
  
  // Interest selection elements
  const interestButtons = document.querySelectorAll('.interest-btn');
  const selectedCountElement = document.getElementById('selectedCount');
  
  let selectedInterests = [];
  const maxSelections = 3;
  let currentStep = 1;
  
  // Initialize stepper navigation
  setupStepperNavigation();

  // Setup stepper navigation functions
  function setupStepperNavigation() {
    // Next to interests step
    nextToInterests.addEventListener('click', function() {
      goToStep(2);
    });
    
    // Back to intro step
    backToIntro.addEventListener('click', function() {
      goToStep(1);
    });
    
    // Finish onboarding
    finishOnboarding.addEventListener('click', function() {
      completeOnboarding();
    });
  }
  
  function goToStep(stepNumber) {
    currentStep = stepNumber;
    
    // Update step visibility
    document.querySelectorAll('.onboarding-step').forEach(step => {
      step.classList.remove('active');
    });
    
    if (stepNumber === 1) {
      step1.classList.add('active');
      updateStepperUI(1, false);
    } else if (stepNumber === 2) {
      step2.classList.add('active');
      updateStepperUI(2, true);
    }
  }
  
  function updateStepperUI(activeStep, step1Completed) {
    stepItems.forEach((item, index) => {
      const stepNum = index + 1;
      item.classList.remove('active', 'completed');
      
      if (stepNum === activeStep) {
        item.classList.add('active');
      } else if (stepNum < activeStep || (stepNum === 1 && step1Completed)) {
        item.classList.add('completed');
      }
    });
    
    // Update connector
    if (step1Completed) {
      stepConnector.classList.add('completed');
    } else {
      stepConnector.classList.remove('completed');
    }
  }
  
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
      
      updateInterestSelectionUI();
    });
  });

  function updateInterestSelectionUI() {
    selectedCountElement.textContent = selectedInterests.length;
    
    // Enable finish button if at least 1 interest is selected
    if (selectedInterests.length > 0) {
      finishOnboarding.disabled = false;
    } else {
      finishOnboarding.disabled = true;
    }
  }

  function completeOnboarding() {
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
  }

  // Initialize with step 1
  goToStep(1);
  
  console.log('🚀 Onboarding page loaded with stepper navigation');
});