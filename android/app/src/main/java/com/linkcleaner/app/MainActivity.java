package com.linkcleaner.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(com.capacitorjs.plugins.share.SharePlugin.class);
        registerPlugin(com.gustavosanjose.sendintentplugin.SendIntent.class);
    }
}
