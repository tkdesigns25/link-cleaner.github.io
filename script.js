// ─── EXTRACT URL FROM INTENT / CLIPBOARD / TEXT ─────────────────────────────
function extractUrl(data) {
    if (!data) return null;
    if (data.url) {
        try {
            const decoded = decodeURIComponent(data.url);
            if (decoded.startsWith('http')) return decoded;
        } catch (e) {
            if (data.url.startsWith('http')) return data.url;
        }
    }
    const raw = data.text || data.title || '';
    try {
        const decoded = decodeURIComponent(raw);
        const match = decoded.match(/https?:\/\/[^\s"'<>]+/i);
        if (match) return match[0];
        if (decoded.trim().startsWith('http')) return decoded.trim();
    } catch (e) {
        const match = raw.match(/https?:\/\/[^\s"'<>]+/i);
        if (match) return match[0];
    }
    return null;
}

// Fill input and automatically trigger clean
function fillInput(url) {
    if (!url) return;
    const inputField = document.getElementById('urlInput');
    if (inputField) {
        inputField.value = url;
        inputField.dispatchEvent(new Event('input'));
        const cleanBtn = document.getElementById('cleanBtn');
        if (cleanBtn) {
            cleanBtn.click();
        }
    }
}

// Check for incoming share intent on cold start
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

    // Check share intent on cold start
    setTimeout(handleSharedIntent, 400);
    handleSharedIntent();

    // Listen for future share intents (warm start)
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

    // Download banner: hidden inside native app, or if dismissed
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

    // Toggle Reset / Paste action button
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

    // Paste Button: reads clipboard and auto-cleans
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                let text = '';
                if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Clipboard) {
                    const result = await Capacitor.Plugins.Clipboard.read();
                    text = result.value || '';
                } else if (navigator.clipboard && navigator.clipboard.readText) {
                    text = await navigator.clipboard.readText();
                }

                if (text) {
                    const foundUrl = extractUrl({ text: text }) || text.trim();
                    fillInput(foundUrl);
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

    // ─── DEEP CLEANING ENGINE ────────────────────────────────────────────────
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
            const host = url.hostname.toLowerCase().replace(/^www\./, '');
            const pathname = url.pathname;

            // 1. INSTAGRAM (instagram.com)
            // Posts (/p/), Reels (/reel/, /reels/), Stories (/stories/), Share (/share/), Profiles
            // Essential: keep 'img_index' (carousel slide index) if present
            // All other query params (igsh, igshid, stkn, ig_rid, click_source, mibextid, utm_*, etc.) are tracking.
            if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
                const imgIndex = params.get('img_index');
                url.search = '';
                if (imgIndex) {
                    url.searchParams.set('img_index', imgIndex);
                }
            }

            // 2. X / TWITTER (x.com, twitter.com, t.co)
            // Status posts (/status/<id>): ZERO query parameters are functional.
            // Other pages (explore, search, intent): strip tracking tokens (a, s, t, cn, twclid, ref_src, ref_url, mx_ref)
            else if (host === 'x.com' || host === 'twitter.com' || host === 't.co') {
                if (pathname.includes('/status/')) {
                    url.search = '';
                } else {
                    ['a', 's', 't', 'cn', 'ref_src', 'ref_url', 'mx_ref', 'twclid', 'context', 's_src'].forEach(p => params.delete(p));
                }
            }

            // 3. THREADS (threads.net, threads.com)
            // Posts: ZERO query parameters needed
            else if (host === 'threads.net' || host === 'threads.com') {
                if (pathname.includes('/post/')) {
                    url.search = '';
                } else {
                    ['xmt', 's', 'igshid', 'stkn', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(p => params.delete(p));
                }
            }

            // 4. YOUTUBE (youtube.com, youtu.be, m.youtube.com)
            // Essential to keep:
            //   'v' (Video ID on /watch)
            //   't' (Timecode / timestamp, e.g. t=120s or t=2m15s)
            //   'list' (Playlist ID)
            //   'index' (Playlist item index)
            //   'start', 'end' (Embed start/end timestamps)
            //   'clip', 'clipt' (YouTube Clips)
            // Strip: si, feature, pp, ab_channel, source_ve_path, embeds_referring_euri, etc.
            else if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
                const allowed = new Set(['v', 't', 'list', 'index', 'start', 'end', 'clip', 'clipt']);
                if (pathname.startsWith('/shorts/')) {
                    const t = params.get('t');
                    url.search = '';
                    if (t) url.searchParams.set('t', t);
                } else {
                    const toDelete = [];
                    for (const key of params.keys()) {
                        if (!allowed.has(key)) {
                            toDelete.push(key);
                        }
                    }
                    toDelete.forEach(k => params.delete(k));
                }
            }

            // 5. TIKTOK (tiktok.com, vm.tiktok.com)
            // Video pages: ZERO query parameters needed
            else if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
                if (pathname.includes('/video/') || host.startsWith('vm.')) {
                    url.search = '';
                } else {
                    ['_t', '_r', 'sender_device', 'sender_web_id', 'is_from_webapp', 'share_item_id', 'share_link_id', 'share_app_id', 'ug_btm', 'checksum', 'preview_pb', 'timestamp', 'user_id', 'sec_user_id', 'trackParams', 'share_region', 'social_share_type'].forEach(p => params.delete(p));
                }
            }

            // 6. SPOTIFY (spotify.com, open.spotify.com)
            // Tracks, Albums, Playlists, Artists: ZERO parameters needed
            // Podcast Episode: KEEP 't' (timecode)
            else if (host === 'spotify.com' || host.endsWith('.spotify.com')) {
                const isEpisode = pathname.includes('/episode/');
                const t = params.get('t');
                url.search = '';
                if (isEpisode && t) {
                    url.searchParams.set('t', t);
                }
            }

            // 7. REDDIT (reddit.com, redd.it)
            // Posts & comments: KEEP 'context' (comment depth), 'sort', 'depth'
            // Strip: utm_*, share_id, rdt, ref_source, ref, entry_point, impression_id, correlation_id
            else if (host === 'reddit.com' || host === 'redd.it' || host.endsWith('.reddit.com')) {
                ['share_id', 'rdt', 'ref_source', 'ref', 'entry_point', 'impression_id', 'correlation_id'].forEach(p => params.delete(p));
                Array.from(params.keys()).filter(k => k.startsWith('utm_')).forEach(k => params.delete(k));
            }

            // 8. AMAZON (amazon.com, amazon.in, amazon.co.uk, amazon.de, etc.)
            // Product pages: canonicalize to /dp/ASIN
            // Essential to keep: 'th' (color/style variant), 'psc' (variant)
            else if (/^amazon\.[a-z.]{2,}$/.test(host) || host.includes('.amazon.')) {
                const dpMatch = pathname.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
                if (dpMatch) {
                    url.pathname = '/dp/' + dpMatch[1];
                    const th = params.get('th');
                    const psc = params.get('psc');
                    url.search = '';
                    if (th) url.searchParams.set('th', th);
                    if (psc) url.searchParams.set('psc', psc);
                } else {
                    ['ref_', 'ref', 'tag', 'crid', 'sprefix', 'keywords', 'qid', 'sr', 'linkCode', 'camp', 'creative', 'creativeASIN', 'ascsubtag', 'dchild'].forEach(p => params.delete(p));
                    Array.from(params.keys()).filter(k => k.startsWith('pd_rd_') || k.startsWith('pf_rd_')).forEach(k => params.delete(k));
                }
            }

            // 9. LINKEDIN (linkedin.com)
            // Posts & feed updates: ZERO parameters needed
            else if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
                if (pathname.includes('/posts/') || pathname.includes('/feed/update/')) {
                    url.search = '';
                } else {
                    ['trackingId', 'midSig', 'midToken', 'trk', 'trkInfo', 'rcm', 'lipi', 'licu'].forEach(p => params.delete(p));
                }
            }

            // 10. FACEBOOK (facebook.com, fb.watch)
            // Strip: fbclid, mibextid, ref, ref_src, ref_component, paipv, eav, __cft__, __tn__
            else if (host === 'facebook.com' || host === 'fb.watch' || host.endsWith('.facebook.com')) {
                ['fbclid', 'mibextid', 'ref', 'ref_src', 'ref_component', 'notif_id', 'notif_t', 'paipv', 'eav', '__cft__', '__tn__', 'hrc', 'fs'].forEach(p => params.delete(p));
            }

            // 11. PINTEREST (pinterest.com, pin.it)
            // Pins: ZERO parameters needed
            else if (host === 'pinterest.com' || host === 'pin.it' || host.endsWith('.pinterest.com')) {
                if (pathname.includes('/pin/')) {
                    url.search = '';
                } else {
                    ['invite_code', 'sender', 'sfo'].forEach(p => params.delete(p));
                }
            }

            // 12. TWITCH (twitch.tv)
            // Keep: 't' (timestamp), 'filter'
            else if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) {
                ['tt_medium', 'tt_content', 'sr'].forEach(p => params.delete(p));
            }

            // 13. NETFLIX (netflix.com)
            // Keep: 'jbv', 't'
            else if (host === 'netflix.com' || host.endsWith('.netflix.com')) {
                ['trackId', 'tctx', 'trkid'].forEach(p => params.delete(p));
            }

            // 14. MEDIUM (medium.com) & SUBSTACK (*.substack.com)
            else if (host === 'medium.com' || host.endsWith('.medium.com')) {
                ['source', 'sk', 'gi'].forEach(p => params.delete(p));
            } else if (host.endsWith('substack.com')) {
                ['r', 's', 'showWelcome'].forEach(p => params.delete(p));
            }

            // ── UNIVERSAL TRACKING REMOVAL (APPLIED TO ALL WEBSITES) ──
            // 1. All UTM parameters
            Array.from(params.keys()).filter(k => k.startsWith('utm_')).forEach(k => params.delete(k));

            // 2. Comprehensive cross-platform ad, analytics, and affiliate IDs
            const universalTrackers = [
                // Google Ads & Analytics
                'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'gad_source', '_ga', '_gl', 'gac_', 'gclaw_',
                // Meta / Facebook
                'fbclid', 'fb_ref', 'fb_source', 'fbc', 'fbp', 'mibextid',
                // Microsoft Bing
                'msclkid',
                // Twitter / X
                'twclid', 'tw_source', 'tw_medium', 'tw_campaign',
                // TikTok
                'ttclid',
                // Telegram
                'tgclid',
                // Yahoo
                'yclid', 'ymclid',
                // Pinterest
                'epik',
                // Snapchat
                'ScCid',
                // Affiliate Networks & Tracking Services
                'pjclid', 'ranMID', 'ranEAID', 'ranSiteID', 'zanpid',
                'click_id', 'clickid', 'aff_id', 'affiliate_id',
                '_branch_match_id', '_b',
                'af_channel', 'af_sub1', 'af_sub2', 'af_sub3', 'af_sub4', 'af_sub5', 'af_siteid', 'af_referrer',
                '_hsenc', '_hsmi', 'hsCtaTracking',
                'mkt_tok',
                'mc_cid', 'mc_eid',
                'vero_id', 'vero_conv',
                'oly_enc_id', 'oly_anon_id',
                'klaviyo_id', '_kx',
                'wickedid',
                'matomo_campaign', 'pk_campaign', 'pk_kwd',
                's_kwcid',
                '__twitter_impression', '__s', 'origin', 'refTag', 'ldtag_cl', 'loclid',
                'x-clickref', 'x-source', 'x-a-medium'
            ];
            universalTrackers.forEach(p => params.delete(p));

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
            // Fallback for malformed URLs
            console.warn('Could not parse URL, applying fallback strip:', e);
            cleanUrlInput.value = normalised.includes('?')
                ? normalised.split('?')[0]
                : normalised;

            outputGroup.classList.remove('hidden');
            outputGroup.style.opacity = '1';
            outputGroup.style.transform = 'translateY(0)';
        }
    });

    // Copy Button
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

    // Open Button: ensures protocol before opening in new tab
    openBtn.addEventListener('click', () => {
        if (!cleanUrlInput.value) return;
        let url = cleanUrlInput.value;
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        window.open(url, '_blank');
    });

    // Share Button: native share sheet with fallback to web share
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
