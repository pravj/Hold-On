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