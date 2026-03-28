package com.parental.control;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

/**
 * Yeh service bache ke phone mein background mein chalti rahegi.
 * Filhal Firebase hata diya gaya hai. Aap ise Intent ke zariye test kar sakte hain.
 */
public class ChildMonitorService extends Service {
    private WindowManager windowManager;
    private View blockOverlay;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Testing ke liye: Agar intent mein "lock" true mile toh screen block karo
        if (intent != null && intent.hasExtra("lock")) {
            boolean shouldLock = intent.getBooleanExtra("lock", false);
            if (shouldLock) {
                showBlockScreen();
            } else {
                hideBlockScreen();
            }
        }
        return START_STICKY;
    }

    private void showBlockScreen() {
        if (blockOverlay == null) {
            // Block hone par screen layout settings
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                    PixelFormat.TRANSLUCENT);

            params.gravity = Gravity.CENTER;

            // Simple text view for simulation
            TextView text = new TextView(this);
            text.setText("PADHAI KARO! \nPhone Blocked by Parents");
            text.setGravity(Gravity.CENTER);
            text.setTextSize(30);
            text.setBackgroundColor(0xFF000000); // Pure Black
            text.setTextColor(0xFFFF0000); // Red Warning Text
            
            blockOverlay = text;
            windowManager.addView(blockOverlay, params);
        }
    }

    private void hideBlockScreen() {
        if (blockOverlay != null) {
            windowManager.removeView(blockOverlay);
            blockOverlay = null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
