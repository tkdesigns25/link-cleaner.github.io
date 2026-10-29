package com.linkcleaner.app;

import android.content.ClipData;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends BridgeActivity {

    private static final Pattern URL_PATTERN = Pattern.compile(
        "https?://[^\\s\"'<>]+",
        Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(com.capacitorjs.plugins.share.SharePlugin.class);

        // Handle cold start (app opened via share intent)
        handleIncomingIntent(getIntent(), 1500);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Handle warm start (app already running, new share intent)
        handleIncomingIntent(intent, 300);
    }

    private void handleIncomingIntent(Intent intent, long delayMs) {
        if (intent == null) return;
        String action = intent.getAction();

        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_VIEW.equals(action)) {
            String sharedUrl = extractUrlFromIntent(intent);
            if (sharedUrl != null && !sharedUrl.isEmpty()) {
                injectUrl(sharedUrl, delayMs);
            }
        }
    }

    private String extractUrlFromIntent(Intent intent) {
        // 1. Try EXTRA_TEXT (standard share text)
        if (intent.hasExtra(Intent.EXTRA_TEXT)) {
            CharSequence cs = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (cs != null) {
                String url = findUrlInString(cs.toString());
                if (url != null) return url;
            }
        }

        // 2. Try ClipData (used by Instagram, Threads, and newer Android share targets)
        ClipData clipData = intent.getClipData();
        if (clipData != null) {
            for (int i = 0; i < clipData.getItemCount(); i++) {
                ClipData.Item item = clipData.getItemAt(i);
                if (item.getText() != null) {
                    String url = findUrlInString(item.getText().toString());
                    if (url != null) return url;
                }
                if (item.getUri() != null) {
                    String uriString = item.getUri().toString();
                    if (uriString.startsWith("http://") || uriString.startsWith("https://")) {
                        return uriString;
                    }
                }
            }
        }

        // 3. Try intent.getData() (direct web links or ACTION_VIEW)
        if (intent.getData() != null) {
            String dataStr = intent.getData().toString();
            if (dataStr.startsWith("http://") || dataStr.startsWith("https://")) {
                return dataStr;
            }
        }

        // 4. Fallback: inspect all extra values for an HTTP/HTTPS link
        Bundle extras = intent.getExtras();
        if (extras != null) {
            for (String key : extras.keySet()) {
                Object val = extras.get(key);
                if (val instanceof CharSequence) {
                    String url = findUrlInString(val.toString());
                    if (url != null) return url;
                }
            }
        }

        return null;
    }

    private String findUrlInString(String text) {
        if (text == null) return null;
        Matcher matcher = URL_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        String trimmed = text.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        return null;
    }

    private void injectUrl(final String url, long delayMs) {
        final String escaped = url
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\r", "")
            .replace("\n", "\\n");

        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        getBridge().getWebView().postDelayed(new Runnable() {
            @Override
            public void run() {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    String js = "javascript:(function(){" +
                        "function fill(){" +
                        "  var el = document.getElementById('urlInput');" +
                        "  if(el){" +
                        "    el.value = '" + escaped + "';" +
                        "    el.dispatchEvent(new Event('input'));" +
                        "    var btn = document.getElementById('cleanBtn');" +
                        "    if(btn){ btn.click(); }" +
                        "    return true;" +
                        "  }" +
                        "  return false;" +
                        "}" +
                        "if(!fill()){ setTimeout(fill, 500); }" +
                        "})()";
                    webView.evaluateJavascript(js, null);
                }
            }
        }, delayMs);
    }
}
