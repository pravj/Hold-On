# Project Overview

## Goal
Chrome extension that blocks certain websites, prompts user to confirm before visiting, and logs all such attempts.

---

## Core Features
- User can add/remove websites to a block list.
- When visiting a blocked site, show a **full-page intercept** with Yes/No question.
- "Yes" → allow access to original URL.
- "No" → close tab.
- Log every attempt with:
  - Timestamp
  - URL
  - User action (Allowed / Blocked)

---

## Tech Stack
- Chrome Extension API (Manifest V3)
- HTML, CSS, JavaScript
- Chrome Storage API (settings + logs)
- (Optional) IndexedDB for advanced logging

---

## Folder Structure
extension/
  manifest.json
  background/background.js
  intercept/intercept.html
  intercept/intercept.js
  intercept/intercept.css
  options/options.html
  options/options.js
  options/options.css
  utils/storage.js
  utils/logger.js
  assets/icon-16.png
  assets/icon-48.png
  assets/icon-128.png
  _project_overview.md

---

## Development Phases
1. **Basic Interception**
   - Hardcoded blocked site list.
   - Intercept page replacement with Yes/No flow.

2. **User Website List**
   - Onboarding to set domains.
   - Options page to edit list.

3. **Logging**
   - Store timestamp, URL, and action locally.
   - Simple export option.

4. **UI/UX**
   - Improve intercept page design.
   - Make layouts responsive.

---

## Constraints
- Use full-page intercept, not modal, for reliability.
- Keep logging local only.
- Structure code so it’s easy to port to Firefox/Edge later.

---

## Future Ideas
- Delay timer before “Yes” becomes clickable.
- Custom motivational messages.
- Integration with a productivity dashboard.
- Daily/weekly summary reports.
