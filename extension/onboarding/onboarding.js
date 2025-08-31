document.addEventListener('DOMContentLoaded', function() {
  // Stepper navigation elements
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');
  const stepItems = document.querySelectorAll('.step-item');
  const stepConnectors = document.querySelectorAll('.step-connector');
  
  // Navigation buttons
  const nextToInterests = document.getElementById('nextToInterests');
  const backToIntro = document.getElementById('backToIntro');
  const nextToWebsites = document.getElementById('nextToWebsites');
  const backToInterests = document.getElementById('backToInterests');
  const nextToConfirmation = document.getElementById('nextToConfirmation');
  const backToWebsites = document.getElementById('backToWebsites');
  const finishOnboarding = document.getElementById('finishOnboarding');
  
  // Interest selection elements
  const interestButtons = document.querySelectorAll('.interest-btn');
  const selectedCountElement = document.getElementById('selectedCount');
  
  // Website selection elements
  const websiteButtons = document.querySelectorAll('.website-btn:not(#addCustomWebsite)');
  const selectedWebsiteCountElement = document.getElementById('selectedWebsiteCount');
  
  let selectedInterests = [];
  let selectedWebsites = [];
  const minSelections = 3;
  let currentStep = 1;
  
  // Initialize stepper navigation
  setupStepperNavigation();
  
  // Initialize custom website functionality
  setupCustomWebsiteModal();

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
    
    // Next to websites step
    nextToWebsites.addEventListener('click', function() {
      goToStep(3);
    });
    
    // Back to interests step
    backToInterests.addEventListener('click', function() {
      goToStep(2);
    });
    
    // Next to confirmation step
    nextToConfirmation.addEventListener('click', function() {
      goToStep(4);
    });
    
    // Back to websites step
    backToWebsites.addEventListener('click', function() {
      goToStep(3);
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
      updateStepperUI(1);
    } else if (stepNumber === 2) {
      step2.classList.add('active');
      updateStepperUI(2);
    } else if (stepNumber === 3) {
      step3.classList.add('active');
      updateStepperUI(3);
    } else if (stepNumber === 4) {
      step4.classList.add('active');
      updateStepperUI(4);
      updateSummary();
    }
  }
  
  function updateStepperUI(activeStep) {
    stepItems.forEach((item, index) => {
      const stepNum = index + 1;
      item.classList.remove('active', 'completed');
      
      if (stepNum === activeStep) {
        item.classList.add('active');
      } else if (stepNum < activeStep) {
        item.classList.add('completed');
      }
    });
    
    // Update connectors
    stepConnectors.forEach((connector, index) => {
      if (index < activeStep - 1) {
        connector.classList.add('completed');
      } else {
        connector.classList.remove('completed');
      }
    });
  }
  
  // Handle interest selection
  interestButtons.forEach(button => {
    button.addEventListener('click', function() {
      const interest = this.getAttribute('data-interest');
      
      if (this.classList.contains('selected')) {
        // Deselect
        this.classList.remove('selected');
        selectedInterests = selectedInterests.filter(item => item !== interest);
      } else {
        // Select (no maximum limit)
        this.classList.add('selected');
        selectedInterests.push(interest);
      }
      
      updateInterestSelectionUI();
    });
  });

  // Handle website selection
  websiteButtons.forEach(button => {
    button.addEventListener('click', function() {
      const website = this.getAttribute('data-website');
      
      if (this.classList.contains('selected')) {
        // Deselect
        this.classList.remove('selected');
        selectedWebsites = selectedWebsites.filter(item => item !== website);
      } else {
        // Select (no maximum limit)
        this.classList.add('selected');
        selectedWebsites.push(website);
      }
      
      updateWebsiteSelectionUI();
    });
  });

  function updateWebsiteSelectionUI() {
    selectedWebsiteCountElement.textContent = selectedWebsites.length;
  }

  // Custom website modal functionality
  function setupCustomWebsiteModal() {
    const addCustomWebsite = document.getElementById('addCustomWebsite');
    const modal = document.getElementById('customWebsiteModal');
    const closeModal = document.getElementById('closeCustomModal');
    const cancelBtn = document.getElementById('cancelCustomWebsite');
    const customInput = document.getElementById('customWebsiteInput');
    const addBtn = document.getElementById('addCustomWebsiteBtn');
    const preview = document.getElementById('websitePreview');
    const previewFavicon = preview.querySelector('.preview-favicon');
    const previewLabel = preview.querySelector('.preview-label');
    const previewUrl = preview.querySelector('.preview-url');
    
    let currentCustomWebsite = null;
    
    // Open modal
    addCustomWebsite.addEventListener('click', function() {
      modal.style.display = 'flex';
      setTimeout(() => customInput.focus(), 100);
    });
    
    // Close modal functions
    const closeModalFunc = () => {
      modal.style.display = 'none';
      customInput.value = '';
      preview.style.display = 'none';
      addBtn.disabled = true;
      currentCustomWebsite = null;
    };
    
    closeModal.addEventListener('click', closeModalFunc);
    cancelBtn.addEventListener('click', closeModalFunc);
    
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModalFunc();
      }
    });
    
    // Input handling with debounce
    let inputTimeout;
    customInput.addEventListener('input', function() {
      const value = this.value.trim();
      
      clearTimeout(inputTimeout);
      
      if (!value) {
        preview.style.display = 'none';
        addBtn.disabled = true;
        currentCustomWebsite = null;
        return;
      }
      
      inputTimeout = setTimeout(() => {
        processCustomWebsite(value);
      }, 500);
    });
    
    // Add custom website
    addBtn.addEventListener('click', function() {
      if (currentCustomWebsite) {
        addCustomWebsiteToGrid(currentCustomWebsite);
        selectedWebsites.push(currentCustomWebsite.domain);
        updateWebsiteSelectionUI();
        closeModalFunc();
      }
    });
    
    function processCustomWebsite(input) {
      try {
        const domain = cleanDomain(input);
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        const label = capitalizeFirstLetter(domain.split('.')[0]);
        
        currentCustomWebsite = {
          domain: domain,
          label: label,
          faviconUrl: faviconUrl
        };
        
        // Update preview
        previewFavicon.src = faviconUrl;
        previewFavicon.alt = label;
        previewLabel.textContent = label;
        previewUrl.textContent = domain;
        preview.style.display = 'flex';
        addBtn.disabled = false;
        
      } catch (error) {
        preview.style.display = 'none';
        addBtn.disabled = true;
        currentCustomWebsite = null;
      }
    }
    
    function cleanDomain(input) {
      // Remove protocol if present
      let domain = input.replace(/^https?:\/\//, '');
      
      // Remove www. if present
      domain = domain.replace(/^www\./, '');
      
      // Remove path, query params, fragments
      domain = domain.split('/')[0].split('?')[0].split('#')[0];
      
      // Basic validation
      if (!domain || !domain.includes('.')) {
        throw new Error('Invalid domain');
      }
      
      return domain.toLowerCase();
    }
    
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function addCustomWebsiteToGrid(website) {
      const websitesGrid = document.querySelector('.websites-grid');
      const button = document.createElement('button');
      button.className = 'website-btn selected';
      button.setAttribute('data-website', website.domain);
      button.setAttribute('data-custom', 'true');
      
      button.innerHTML = `
        <img class="website-favicon" src="${website.faviconUrl}" alt="${website.label}">
        <span class="website-label">${website.label}</span>
        <span class="website-url">${website.domain}</span>
      `;
      
      // Add click handler for deselection
      button.addEventListener('click', function() {
        const domain = this.getAttribute('data-website');
        
        if (this.classList.contains('selected')) {
          // Deselect and remove custom website
          selectedWebsites = selectedWebsites.filter(item => item !== domain);
          this.remove();
          updateWebsiteSelectionUI();
        }
      });
      
      // Insert before the "Others" button
      const othersBtn = document.getElementById('addCustomWebsite');
      websitesGrid.insertBefore(button, othersBtn.nextSibling);
    }
  }

  function updateInterestSelectionUI() {
    selectedCountElement.textContent = selectedInterests.length;
    
    // Enable next button if at least 3 interests are selected
    if (selectedInterests.length >= minSelections) {
      nextToWebsites.disabled = false;
    } else {
      nextToWebsites.disabled = true;
    }
  }

  function updateSummary() {
    // Update interests summary
    const interestsSummary = document.getElementById('selectedInterestsSummary');
    interestsSummary.innerHTML = '';
    selectedInterests.forEach(interest => {
      const span = document.createElement('span');
      span.className = 'summary-tag';
      span.textContent = interest.charAt(0).toUpperCase() + interest.slice(1);
      interestsSummary.appendChild(span);
    });
    
    // Update websites summary
    const websitesSummary = document.getElementById('selectedWebsitesSummary');
    websitesSummary.innerHTML = '';
    selectedWebsites.forEach(website => {
      const span = document.createElement('span');
      span.className = 'summary-tag';
      span.textContent = website;
      websitesSummary.appendChild(span);
    });
    
    // Update test links
    const testLinks = document.getElementById('testLinks');
    testLinks.innerHTML = '';
    selectedWebsites.slice(0, 3).forEach(website => {
      const button = document.createElement('button');
      button.className = 'test-link-btn';
      button.textContent = `Test ${website}`;
      button.addEventListener('click', function() {
        window.open(`https://${website}`, '_blank');
      });
      testLinks.appendChild(button);
    });
  }

  function completeOnboarding() {
    if (selectedInterests.length < minSelections) {
      return;
    }

    // Save selected interests and websites to storage
    chrome.storage.local.set({
      userInterests: selectedInterests,
      blockedWebsites: selectedWebsites,
      onboardingCompleted: true
    }, function() {
      console.log('✅ Onboarding completed!');
      console.log('Selected interests:', selectedInterests);
      console.log('Blocked websites:', selectedWebsites);
      
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