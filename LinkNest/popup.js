// Global state
let savedLinks = [];

// Load saved theme preference
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
  
  // Initialize UI
  updatePreview();
  
  // Load saved links
  loadSavedLinks();
});

// Load saved links from storage
function loadSavedLinks() {
  chrome.storage.sync.get(['savedLinks'], (result) => {
    if (result.savedLinks && Array.isArray(result.savedLinks)) {
      savedLinks = result.savedLinks;
      renderSavedLinks();
    } else {
      savedLinks = [];
      renderSavedLinks();
    }
  });
}

// Save the current links to storage
function saveLinkToStorage() {
  chrome.storage.sync.set({ savedLinks }, () => {
    if (chrome.runtime.lastError) {
      showNotification('Error saving links: ' + chrome.runtime.lastError);
    }
  });
}

// Render saved links in the UI
function renderSavedLinks() {
  const container = document.getElementById('savedLinksList');
  
  // Clear current content
  container.innerHTML = '';
  
  if (savedLinks.length === 0) {
    container.innerHTML = '<div class="empty-state">No saved links yet</div>';
    return;
  }
  
  // Add each saved link
  savedLinks.forEach((link, index) => {
    const item = document.createElement('div');
    item.className = 'saved-link-item';
    
    const linkText = document.createElement('div');
    linkText.className = 'saved-link-text';
    linkText.textContent = link.text || link.url;
    linkText.title = `URL: ${link.url}\nText: ${link.text || link.url}`;
    
    const actions = document.createElement('div');
    actions.className = 'saved-link-actions';
    
    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.className = 'icon-button';
    loadBtn.title = 'Load Link';
    loadBtn.innerHTML = '<span class="material-icons">arrow_downward</span>';
    loadBtn.addEventListener('click', () => loadSavedLink(index));
    
    // Copy HTML button
    const copyHtmlBtn = document.createElement('button');
    copyHtmlBtn.className = 'icon-button';
    copyHtmlBtn.title = 'Copy as HTML';
    copyHtmlBtn.innerHTML = '<span class="material-icons">link</span>';
    copyHtmlBtn.addEventListener('click', () => copySavedLinkAsHtml(index));
    
    // Copy Markdown button
    const copyMdBtn = document.createElement('button');
    copyMdBtn.className = 'icon-button';
    copyMdBtn.title = 'Copy as Markdown';
    copyMdBtn.innerHTML = '<span class="material-icons">code</span>';
    copyMdBtn.addEventListener('click', () => copySavedLinkAsMarkdown(index));
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-button';
    deleteBtn.title = 'Delete Link';
    deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
    deleteBtn.addEventListener('click', () => deleteSavedLink(index));
    
    actions.appendChild(loadBtn);
    actions.appendChild(copyHtmlBtn);
    actions.appendChild(copyMdBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(linkText);
    item.appendChild(actions);
    container.appendChild(item);
  });
}

// Load a saved link into the form
function loadSavedLink(index) {
  const link = savedLinks[index];
  if (!link) return;
  
  document.getElementById('url').value = link.url;
  document.getElementById('text').value = link.text || '';
  document.getElementById('format').value = link.format || 'html';
  
  updatePreview();
  showNotification('Link loaded');
}

// Copy a saved link's display text
function copySavedLink(index) {
  const link = savedLinks[index];
  if (!link) return;
  
  // Just copy the display text
  const displayText = link.text || link.url;
  
  copyTextToClipboard(displayText);
  showNotification("Display text copied!");
}

// Copy a saved link as HTML hyperlink
async function copySavedLinkAsHtml(index) {
  const link = savedLinks[index];
  if (!link) return;
  
  const html = `<a href="${link.url}">${link.text || link.url}</a>`;
  
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([html], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' })
      })
    ]);
    showNotification("HTML hyperlink copied!");
  } catch (err) {
    // Fallback method
    copyTextToClipboard(html);
  }
}

// Copy a saved link as Markdown
function copySavedLinkAsMarkdown(index) {
  const link = savedLinks[index];
  if (!link) return;
  
  const markdown = `[${link.text || link.url}](${link.url})`;
  
  copyTextToClipboard(markdown);
  showNotification("Markdown copied!");
}

// Delete a saved link
function deleteSavedLink(index) {
  savedLinks.splice(index, 1);
  saveLinkToStorage();
  renderSavedLinks();
  showNotification('Link deleted');
}

// Save current link
function saveCurrentLink() {
  const url = document.getElementById('url').value.trim();
  const text = document.getElementById('text').value.trim();
  const format = document.getElementById('format').value;
  
  if (!url) {
    showNotification("Please enter a URL first");
    return;
  }
  
  // Check if this link already exists
  const existingIndex = savedLinks.findIndex(link => 
    link.url === url && link.text === text && link.format === format
  );
  
  if (existingIndex !== -1) {
    showNotification("This link is already saved");
    return;
  }
  
  // Add new link
  savedLinks.push({
    url,
    text,
    format,
    date: new Date().toISOString()
  });
  
  // Sort by newest first
  savedLinks.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Save to storage
  saveLinkToStorage();
  
  // Update UI
  renderSavedLinks();
  
  showNotification("Link saved");
}

// Clear all saved links
function clearAllSavedLinks() {
  if (confirm('Are you sure you want to delete all saved links?')) {
    savedLinks = [];
    saveLinkToStorage();
    renderSavedLinks();
    showNotification('All links cleared');
  }
}

// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.preview-display, .preview-code').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    button.classList.add('active');
    const tabType = button.dataset.tab;
    document.getElementById(tabType + 'Preview').classList.add('active');
  });
});

// Live preview functionality
function updatePreview() {
  const url = document.getElementById("url").value.trim();
  const text = document.getElementById("text").value.trim() || url;
  const format = document.getElementById("format").value;
  const displayPreview = document.getElementById("displayPreview");
  const codePreview = document.getElementById("codePreview");

  if (!url) {
    displayPreview.innerHTML = "";
    codePreview.textContent = "";
    return;
  }

  let link = "";
  switch (format) {
    case "markdown":
      link = `[${text}](${url})`;
      displayPreview.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      break;
    case "bbcode":
      link = `[url=${url}]${text}[/url]`;
      displayPreview.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      break;
    default: // HTML
      link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      displayPreview.innerHTML = link;
  }

  codePreview.textContent = link;
}

// Add input listeners for live preview
['url', 'text'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
});
document.getElementById('format').addEventListener('change', updatePreview);

// Copy display text functionality
document.getElementById("copyDisplayText").addEventListener("click", async () => {
  const text = document.getElementById("text").value.trim();
  const url = document.getElementById("url").value.trim();
  
  if (!text && !url) {
    showNotification("Please enter text to copy");
    return;
  }
  
  navigator.clipboard.writeText(text || url).then(() => {
    showNotification("Text copied!");
  }).catch(err => {
    showNotification("Failed to copy: " + err);
  });
});

// Copy as HTML hyperlink
document.getElementById("copyAsHyperlink").addEventListener("click", async () => {
  const url = document.getElementById("url").value.trim();
  const text = document.getElementById("text").value.trim() || url;
  
  if (!url) {
    showNotification("Please enter a URL first");
    return;
  }
  
  const html = `<a href="${url}">${text}</a>`;
  
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([html], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' })
      })
    ]);
    showNotification("HTML copied!");
  } catch (err) {
    // Fallback method
    copyTextToClipboard(html);
  }
});

// Copy as markdown
document.getElementById("copyAsMarkdown").addEventListener("click", () => {
  const url = document.getElementById("url").value.trim();
  const text = document.getElementById("text").value.trim() || url;
  
  if (!url) {
    showNotification("Please enter a URL first");
    return;
  }
  
  const markdown = `[${text}](${url})`;
  copyTextToClipboard(markdown);
});

// Save link button
document.getElementById("saveLink").addEventListener("click", saveCurrentLink);

// Clear all saved links
document.getElementById("clearSavedLinks").addEventListener("click", clearAllSavedLinks);

// Helper function for clipboard operations
function copyTextToClipboard(text) {
  // Try using newer clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification("Copied to clipboard!");
    }).catch(err => {
      showNotification("Failed to copy: " + err);
    });
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';  // Prevent scrolling to bottom
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showNotification("Copied to clipboard!");
      } else {
        showNotification("Copy failed");
      }
    } catch (err) {
      showNotification("Failed to copy: " + err);
    }
    
    document.body.removeChild(textarea);
  }
}

// Theme toggle
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// Notification system
function showNotification(message) {
  const notification = document.getElementById("copySuccess");
  notification.textContent = message;
  notification.classList.add("show");
  
  setTimeout(() => {
    notification.classList.remove("show");
  }, 2000);
}