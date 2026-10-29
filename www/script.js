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

    // Toggle Reset/Paste buttons based on input content
    function toggleInputButtons() {
        if (urlInput.value.trim().length > 0) {
            resetBtn.classList.remove('hidden');
            if (pasteBtn) pasteBtn.classList.add('hidden');
        } else {
            resetBtn.classList.add('hidden');
            if (pasteBtn) pasteBtn.classList.remove('hidden');
        }
    }

    toggleInputButtons();
    urlInput.addEventListener('input', toggleInputButtons);

    // Paste Button
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Clipboard) {
                    const { value } = await Capacitor.Plugins.Clipboard.read();
                    if (value) {
                        urlInput.value = value;
                        urlInput.dispatchEvent(new Event('input'));
                    }
                } else {
                    const text = await navigator.clipboard.readText();
                    urlInput.value = text;
                    urlInput.dispatchEvent(new Event('input'));
                }
            } catch (err) {
                console.error('Paste failed:', err);
            }
        });
    }

    // Reset Button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            urlInput.value = '';
            outputGroup.classList.add('hidden');
            urlInput.dispatchEvent(new Event('input'));
            urlInput.focus();
        });
    }

    // ─── CLEAN BUTTON ────────────────────────────────────────────────────────
    cleanBtn.addEventListener('click', () => {
        const originalUrl = urlInput.value.trim();

        if (!originalUrl) {
            urlInput.focus();
            return;
        }

        // Auto-prepend protocol if missing
        const normalised = /^https?:\/\//i.test(originalUrl)
            ? originalUrl
            : 'https://' + originalUrl;

        try {
            const url = new URL(normalised);
            const params = url.searchParams;

            // ── Universal tracking params (always removed) ──
            const always = [
                // UTM (all variants)
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
                // Google Ads
                'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
                // Facebook / Meta
                'fbclid', 'fb_ref', 'fb_source',
                // Instagram
                'igsh', 'igshid',
                // X / Twitter (new & old)
                'twclid',       // Twitter click ID (like fbclid for ads)
                'ref_src',      // reference source (e.g. twsrc^tfw)
                'ref_url',      // referral URL (from embedded tweets)
                'mx_ref',       // mobile/app referral routing
                // YouTube
                'si',           // YouTube share identifier
                // Email marketing
                'mc_cid', 'mc_eid',
                '_hsenc', '_hsmi', 'hsCtaTracking',
                'mkt_tok', 'vero_id',
                'oly_enc_id', 'oly_anon_id',
                // Affiliate / misc
                'pp', 'zanpid', 'origin',
                '__twitter_impression', '__s',
            ];

            always.forEach(p => params.delete(p));

            // ── Smart per-domain handling ──
            const host = url.hostname.replace(/^www\./, '');
            const isYouTube = host === 'youtube.com' || host === 'youtu.be';
            const isX = host === 'x.com' || host === 'twitter.com' || host === 't.co';
            const isTikTok = host === 'tiktok.com';
            const isReddit = host === 'reddit.com';

            if (isX) {
                // Status posts on X (e.g. /username/status/123456) NEVER need query parameters.
                // Any query parameter attached to a post (?a=..., ?s=..., ?t=...) is pure tracking.
                if (url.pathname.includes('/status/')) {
                    url.search = '';
                } else {
                    ['a', 's', 't', 'cn', 'ref_src', 'ref_url', 'mx_ref', 'twclid', 'context'].forEach(p => params.delete(p));
                }
            } else if (isTikTok) {
                ['_t', '_r', 'sender_device', 'sender_web_id', 'is_from_webapp'].forEach(p => params.delete(p));
            } else if (isReddit) {
                ['share_id', 'rdt', 'ref_source'].forEach(p => params.delete(p));
            } else if (!isYouTube) {
                // On non-YouTube sites, 's' is usually a tracking/referral param
                params.delete('s');
            }
            // On YouTube: 't' (timestamp), 'v', 'list' are preserved; 'si' is deleted in always list

            cleanUrlInput.value = url.toString();
            outputGroup.classList.remove('hidden');

            outputGroup.style.opacity = '0';
            outputGroup.style.transform = 'translateY(10px)';
            requestAnimationFrame(() => {
                outputGroup.style.transition = 'all 0.4s ease';
                outputGroup.style.opacity = '1';
                outputGroup.style.transform = 'translateY(0)';
            });

        } catch (e) {
            // Fallback: URL couldn't be parsed (very malformed input)
            console.warn('Could not parse URL, applying fallback strip:', e);
            cleanUrlInput.value = normalised.includes('?')
                ? normalised.split('?')[0]
                : normalised;

            outputGroup.classList.remove('hidden');
            outputGroup.style.opacity = '1';
            outputGroup.style.transform = 'translateY(0)';
        }
    });
    // ─────────────────────────────────────────────────────────────────────────

    copyBtn.addEventListener('click', () => {
        if (!cleanUrlInput.value) return;
        navigator.clipboard.writeText(cleanUrlInput.value).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
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
        }
    });

    function showToast(message) {
        toast.textContent = message || 'Copied to clipboard!';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // Enter key triggers clean
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') cleanBtn.click();
    });
});
