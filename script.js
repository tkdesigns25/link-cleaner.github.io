document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const cleanBtn = document.getElementById('cleanBtn');
    const outputGroup = document.getElementById('outputGroup');
    const cleanUrlInput = document.getElementById('cleanUrl');
    const copyBtn = document.getElementById('copyBtn');
    const openBtn = document.getElementById('openBtn');
    const shareBtn = document.getElementById('shareBtn');
    const toast = document.getElementById('toast');
    const clearInputBtn = document.getElementById('clearInputBtn');

    // Show/hide clear button based on input
    urlInput.addEventListener('input', () => {
        if (urlInput.value.trim().length > 0) {
            clearInputBtn.classList.remove('hidden');
        } else {
            clearInputBtn.classList.add('hidden');
        }
    });

    // Clear input functionality
    clearInputBtn.addEventListener('click', () => {
        urlInput.value = '';
        clearInputBtn.classList.add('hidden');
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
        window.open(cleanUrlInput.value, '_blank');
    });

    shareBtn.addEventListener('click', () => {
        if (!cleanUrlInput.value) return;

        if (navigator.share) {
            navigator.share({
                title: 'Cleaned Link',
                text: 'Here is a cleaned link:',
                url: cleanUrlInput.value
            }).catch(console.error);
        } else {
            showToast('Sharing not supported');
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
