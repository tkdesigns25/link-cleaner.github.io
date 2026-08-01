package com.linkcleaner.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(com.capacitorjs.plugins.share.SharePlugin.class);

        // Handle cold start (app opened via share intent)
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle warm start (app already running, new share intent)
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null && "text/plain".equals(type)) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && !sharedText.isEmpty()) {
                // Extract URL from shared text (some apps include extra text around the URL)
                String url = extractUrl(sharedText);
                if (url != null) {
                    injectUrl(url);
                }
            }
        }
    }

    private String extractUrl(String text) {
        // Match http or https URLs
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("https?://[^\\s\"'<>]+", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        // If the whole text looks like a URL
        if (text.trim().startsWith("http")) {
            return text.trim();
        }
        return null;
    }

    private void injectUrl(final String url) {
        // Escape for JS string
        final String escaped = url.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");

        // Wait for the WebView to be ready, then inject
        getBridge().getWebView().postDelayed(new Runnable() {
            @Override
            public void run() {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    String js = "javascript:(function(){" +
                        "var el=document.getElementById('urlInput');" +
                        "if(el){el.value='" + escaped + "';el.dispatchEvent(new Event('input'));}" +
                        "else{setTimeout(function(){" +
                        "var el2=document.getElementById('urlInput');" +
                        "if(el2){el2.value='" + escaped + "';el2.dispatchEvent(new Event('input'));}" +
                        "},1000);}" +
                        "})()";
                    webView.evaluateJavascript(js, null);
                }
            }
        }, 1500); // 1.5s delay to let the page fully load on cold start
    }
}
