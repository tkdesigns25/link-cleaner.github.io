document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const cleanBtn = document.getElementById('cleanBtn');
    const outputGroup = document.getElementById('outputGroup');
    const cleanUrlInput = document.getElementById('cleanUrl');
    const copyBtn = document.getElementById('copyBtn');
    const toast = document.getElementById('toast');

    cleanBtn.addEventListener('click', () => {
        const originalUrl = urlInput.value.trim();

        if (!originalUrl) {
            // Shake animation or error state could be added here
            urlInput.focus();
            return;
        }

        try {
            // Simple split logic as requested
            // "remove every char from the first "?" mark including the question mark"
            const cleaned = originalUrl.split('?')[0];

            cleanUrlInput.value = cleaned;
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
            console.error("Error cleaning URL", e);
        }
    });

    copyBtn.addEventListener('click', () => {
        if (!cleanUrlInput.value) return;

        navigator.clipboard.writeText(cleanUrlInput.value).then(() => {
            showToast();
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers or if permission denied
            cleanUrlInput.select();
            document.execCommand('copy');
            showToast();
        });
    });

    function showToast() {
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
