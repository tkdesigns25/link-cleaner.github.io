// Extract a URL from shared intent data (some apps put it in .url, others in .text)
function extractUrl(data) {
    if (!data) return null;
    // Prefer .url if it looks like a URL
    if (data.url) {
        const decoded = decodeURIComponent(data.url);
        if (decoded.startsWith('http')) return decoded;
    }
    // Fall back to extracting a URL from .title or .text
    const raw = data.text || data.title || '';
    const decoded = decodeURIComponent(raw);
    const match = decoded.match(/https?:\/\/[^\s"'<>]+/i);
    return match ? match[0] : (decoded.startsWith('http') ? decoded : null);
}

// Fill the input field with a shared URL
function fillInput(url) {
    if (!url) return;
    const inputField = document.getElementById('urlInput');
    if (inputField) {
        inputField.value = url;
        inputField.dispatchEvent(new Event('input'));
    }
}

// Check for a share intent on cold start
async function handleSharedIntent() {
    try {
        if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SendIntent) {
            const result = await Capacitor.Plugins.SendIntent.checkSendIntentReceived();
            fillInput(extractUrl(result));
        }
    } catch (err) {
        console.error('Error checking send intent:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }

    // Check on app load (cold start) with a small delay to ensure plugins are ready
    setTimeout(handleSharedIntent, 500);

    // Also try immediately just in case
    handleSharedIntent();

    // Listen for future intents (warm start)
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SendIntent) {
        window.Capacitor.Plugins.SendIntent.addListener('appSendActionIntent', (data) => {
            fillInput(extractUrl(data));
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const cleanBtn = document.getElementById('cleanBtn');
    const outputGroup = document.getElementById('outputGroup');
    const cleanUrlInput = document.getElementById('cleanUrl');
    const copyBtn = document.getElementById('copyBtn');
    const openBtn = document.getElementById('openBtn');
    const shareBtn = document.getElementById('shareBtn');
    const toast = document.getElementById('toast');
    const resetBtn = document.getElementById('resetBtn');
    const pasteBtn = document.getElementById('pasteBtn');

    // Download banner: hide inside native app, or if user dismissed it
    const downloadBanner = document.getElementById('downloadBanner');
    if (downloadBanner) {
        if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
            downloadBanner.classList.add('hidden');
        } else if (sessionStorage.getItem('bannerDismissed')) {
            downloadBanner.classList.add('hidden');
        }
        const closeBtn = document.getElementById('closeBanner');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                downloadBanner.classList.add('hidden');
                sessionStorage.setItem('bannerDismissed', '1');
            });
        }
    }

    // Toggle Clear/Paste buttons
    function toggleInputButtons() {
        if (urlInput.value.trim().length > 0) {
            resetBtn.classList.remove('hidden');
            if (pasteBtn) pasteBtn.classList.add('hidden');
        } else {
            resetBtn.classList.add('hidden');
            if (pasteBtn) pasteBtn.classList.remove('hidden');
        }
    }

    // Initial check
    toggleInputButtons();

    // Input event listener
    urlInput.addEventListener('input', toggleInputButtons);

    // Paste Button Click
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Clipboard) {
                    const { type, value } = await Capacitor.Plugins.Clipboard.read();
                    if (value) {
                        urlInput.value = value;
                        toggleInputButtons();
                    } else {
                        showToast('Clipboard is empty');
                    }
                } else {
                    // Fallback for browser testing
                    const text = await navigator.clipboard.readText();
                    urlInput.value = text;
                    toggleInputButtons();
                }
            } catch (err) {
                console.error('Paste failed:', err);
                showToast('Failed to paste');
            }
        });
    }

    // Reset Button Click
    resetBtn.addEventListener('click', () => {
        urlInput.value = '';
        outputGroup.classList.add('hidden'); // Hide results
        toggleInputButtons();
        urlInput.focus();
    });

    cleanBtn.addEventListener('click', () => {
        const originalUrl = urlInput.value.trim();

        if (!originalUrl) {
            // Shake animation or error state could be added here
            urlInput.focus();
            return;
        }

        try {
            const url = new URL(originalUrl);
            const params = url.searchParams;

            // List of tracking parameters to remove
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'fbclid', 'gclid', 'gclsrc', 'dclid', 'gra', 'grb', 'grc', 'grd',
                'si', 'pp', 's', 't', 'igsh' // 't' is tricky, sometimes timestamp, sometimes tracking. 
                // YouTube uses 't' for timestamp, so we should probably KEEP 't' generally, 
                // or handle it specifically. The user mentioned "timed link from youtube", 
                // so we MUST preserve 't' for YouTube. 
                // 'si' is YouTube share identifier.
            ];

            // Refined list based on user request to keep timestamps
            const paramsToRemove = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'fbclid', 'gclid', 'gclsrc', 'dclid',
                'si', 'pp', 'igsh'
            ];

            // Iterate and delete tracking params
            paramsToRemove.forEach(param => {
                if (params.has(param)) {
                    params.delete(param);
                }
            });

            // Special handling for YouTube 'si' if not caught above (it is caught)
            // but 't' should be preserved.

            cleanUrlInput.value = url.toString();
            outputGroup.classList.remove('hidden');

            // Animate result appearance
            outputGroup.style.opacity = '0';
            outputGroup.style.transform = 'translateY(10px)';
            requestAnimationFrame(() => {
                outputGroup.style.transition = 'all 0.5s ease';
                outputGroup.style.opacity = '1';
                outputGroup.style.transform = 'translateY(0)';
            });

        } catch (e) {
            // Fallback for non-standard URLs or text that isn't a full URL
            console.warn("Invalid URL, attempting simple cleanup or returning original", e);
            // If it's not a valid URL object, maybe it's just a string? 
            // But the user input placeholder suggests full URLs. 
            // Let's try to handle cases where protocol might be missing?
            // For now, if it fails URL parsing, we might just return the original 
            // or try the simple split as fallback if it looks like a URL.

            // Simple fallback: if it contains '?', try split, otherwise return original
            if (originalUrl.includes('?')) {
                // Check if it looks like a URL
                if (originalUrl.match(/^(http|https):\/\//)) {
                    // If it failed new URL() but has http, it's really broken.
                    cleanUrlInput.value = originalUrl;
                } else {
                    // Maybe missing protocol?
                    try {
                        const fixedUrl = new URL('https://' + originalUrl);
                        // Recurse or just apply logic here? Let's just apply logic.
                        const params = fixedUrl.searchParams;
                        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'si', 'pp', 'igsh'];
                        paramsToRemove.forEach(p => params.delete(p));
                        cleanUrlInput.value = fixedUrl.toString().replace('https://', ''); // Return as entered? 
                        // Actually, better to just return cleaned full URL or simple split if complex parsing fails.
                        // Let's stick to the simple split as a safe fallback for "text" inputs
                        cleanUrlInput.value = originalUrl.split('?')[0];
                    } catch (err) {
                        cleanUrlInput.value = originalUrl.split('?')[0];
                    }
                }
            } else {
                cleanUrlInput.value = originalUrl;
            }

            outputGroup.classList.remove('hidden');
            outputGroup.style.opacity = '1';
            outputGroup.style.transform = 'translateY(0)';
        }
    });

    copyBtn.addEventListener('click', () => {
        if (!cleanUrlInput.value) return;

        navigator.clipboard.writeText(cleanUrlInput.value).then(() => {
            showToast('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers or if permission denied
            cleanUrlInput.select();
            document.execCommand('copy');
            showToast('Copied to clipboard!');
        });
    });

    openBtn.addEventListener('click', () => {
        if (!cleanUrlInput.value) return;
        let url = cleanUrlInput.value;
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        window.open(url, '_blank');
    });

    shareBtn.addEventListener('click', async () => {
        if (!cleanUrlInput.value) return;

        try {
            if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share) {
                await Capacitor.Plugins.Share.share({
                    title: 'Cleaned Link',
                    url: cleanUrlInput.value,
                    dialogTitle: 'Share',
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: 'Cleaned Link',
                    url: cleanUrlInput.value
                });
            } else {
                showToast('Sharing not supported');
            }
        } catch (err) {
            console.error('Share failed:', err);
            // Suppress errors for user cancellation or other share failures
            // The user specifically requested not to see error popups on exit
        }
    });

    function showToast(message) {
        toast.textContent = message || 'Copied to clipboard!';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // Allow "Enter" key to trigger clean
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            cleanBtn.click();
        }
    });


});
