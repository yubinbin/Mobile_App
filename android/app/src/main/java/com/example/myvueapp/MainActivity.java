package com.example.myvueapp;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.example.myvueapp.R;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge for proper insets handling on all versions.
        // On Android 15+ this is enforced by the system; calling it explicitly
        // ensures consistent behavior and allows us to receive WindowInsets.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Apply top padding to the root layout so WebView content sits below
        // the status bar. The CoordinatorLayout's blue background (#006dd8)
        // shows through the padded area, giving the status bar a blue appearance.
        View rootLayout = findViewById(R.id.rootLayout);
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout, (v, insets) -> {
            int statusBarHeight = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
            int navBarHeight = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            v.setPadding(0, statusBarHeight, 0, navBarHeight);
            return insets;
        });
    }
}
