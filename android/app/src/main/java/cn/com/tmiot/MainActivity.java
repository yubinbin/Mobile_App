package cn.com.tmiot;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(PlayUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
