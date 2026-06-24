package cn.com.tmiot;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("url required"); return; }
        call.setKeepAlive(true);

        Context ctx = getContext();
        File apkFile = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update.apk");
        if (apkFile.exists()) apkFile.delete();

        DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url))
            .setTitle("应用更新")
            .setDescription("正在下载...")
            .setDestinationUri(Uri.fromFile(apkFile))
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        long downloadId = dm.enqueue(req);

        // Listen for completion
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != downloadId) return;
                try { context.unregisterReceiver(this); } catch (Exception ignored) {}
                Cursor c = dm.query(new DownloadManager.Query().setFilterById(downloadId));
                if (c != null && c.moveToFirst()) {
                    int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    c.close();
                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        installApk(ctx, apkFile, call);
                    } else {
                        call.reject("download failed");
                    }
                } else {
                    call.reject("download failed");
                }
            }
        };
        // DownloadManager 是系统广播，必须用 RECEIVER_EXPORTED（Android 13+）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.registerReceiver(receiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
        } else {
            ctx.registerReceiver(receiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }

        // Poll progress on background thread
        new Thread(() -> {
            DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
            while (true) {
                try { Thread.sleep(500); } catch (InterruptedException e) { break; }
                Cursor c = dm.query(query);
                if (c == null || !c.moveToFirst()) { if (c != null) c.close(); break; }
                int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                long done  = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                c.close();
                if (total > 0) {
                    JSObject progress = new JSObject();
                    progress.put("percent", (int)(done * 100 / total));
                    notifyListeners("progress", progress);
                }
                if (status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED) break;
            }
        }).start();
    }

    private void installApk(Context ctx, File apkFile, PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        Uri uri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apkFile);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } else {
            uri = Uri.fromFile(apkFile);
        }
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        // 用 Activity context 规避 Android 10+ 后台启动限制
        getActivity().startActivity(intent);
        JSObject result = new JSObject();
        result.put("done", true);
        call.resolve(result);
    }
}
