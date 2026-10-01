package io.github.falconperch;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemLocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
