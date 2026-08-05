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

    // 代际计数：每次下载 / 取消都会 ++。旧下载的轮询线程据此判断自己已作废，不再发事件。
    private volatile long downloadEpoch = 0;
    // 当前活动下载的轮询线程，取消时 interrupt 使其立即退出
    private volatile Thread activePollThread = null;

    @PluginMethod()
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("url required"); return; }

        final long epoch = ++downloadEpoch;
        File apkFile;
        DownloadManager dm;
        long downloadId;
        try {
            Context ctx = getContext();
            // 每次下载用唯一文件名，避免与上一次（未完全清理的）下载抢同一文件
            apkFile = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update-" + epoch + ".apk");
            cleanupOldApks(ctx, apkFile);

            dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url))
                .setTitle("应用更新")
                .setDescription("正在下载...")
                .setDestinationUri(Uri.fromFile(apkFile))
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            downloadId = dm.enqueue(req);
            android.util.Log.d("ApkInstaller", "download enqueued id=" + downloadId + " epoch=" + epoch + " file=" + apkFile.getName());
        } catch (Exception e) {
            android.util.Log.e("ApkInstaller", "enqueue failed url=" + url, e);
            call.reject("enqueue failed: " + e.getMessage());
            return;
        }
        // Promise 方法：入队成功即 resolve（下载真实进度/结果由 progress / downloadComplete 事件通知）
        call.resolve(new JSObject().put("downloadId", downloadId));

        final long thisDownloadId = downloadId;
        final File thisApkFile = apkFile;
        final Context ctx = getContext();

        // Listen for completion（仅负责下载成功后拉起系统安装器，状态交给 downloadComplete 事件）
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != thisDownloadId) return;
                try { context.unregisterReceiver(this); } catch (Exception ignored) {}
                // 该下载已被取消/作废，忽略
                if (epoch != downloadEpoch) return;
                Cursor c = dm.query(new DownloadManager.Query().setFilterById(thisDownloadId));
                if (c != null && c.moveToFirst()) {
                    int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    c.close();
                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        installApk(ctx, thisApkFile);
                    } else {
                        android.util.Log.e("ApkInstaller", "receiver: download failed id=" + thisDownloadId + " status=" + status);
                    }
                } else {
                    android.util.Log.e("ApkInstaller", "receiver: no download row id=" + thisDownloadId);
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
        Thread pollThread = new Thread(() -> {
            DownloadManager.Query query = new DownloadManager.Query().setFilterById(thisDownloadId);
            while (true) {
                try { Thread.sleep(500); } catch (InterruptedException e) { break; }
                // 已被取消或新下载已开始：本线程作废，不再发事件（即使 id 被 DownloadManager 复用）
                if (epoch != downloadEpoch) break;
                Cursor c = dm.query(query);
                if (c == null || !c.moveToFirst()) { if (c != null) c.close(); break; }
                int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                long done  = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                if (status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED) {
                    if (epoch != downloadEpoch) { c.close(); break; }
                    // 通知 JS 真实下载结果（plugin.download 只代表"已入队"，完成必须以事件为准）
                    JSObject doneEvent = new JSObject();
                    boolean ok = status == DownloadManager.STATUS_SUCCESSFUL;
                    doneEvent.put("success", ok);
                    doneEvent.put("downloadId", thisDownloadId);
                    if (ok) {
                        android.util.Log.d("ApkInstaller", "download SUCCESS id=" + thisDownloadId);
                    } else {
                        int reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                        doneEvent.put("reason", reason);
                        android.util.Log.e("ApkInstaller", "download FAILED id=" + thisDownloadId + " reason=" + reason);
                    }
                    c.close();
                    notifyListeners("downloadComplete", doneEvent);
                    break;
                }
                c.close();
                if (total > 0) {
                    JSObject progress = new JSObject();
                    progress.put("percent", (int)(done * 100 / total));
                    progress.put("downloadId", thisDownloadId);
                    notifyListeners("progress", progress);
                }
            }
        });
        activePollThread = pollThread;
        pollThread.start();
    }

    /** 取消下载：作废旧下载（epoch++ 使轮询线程/接收器失效）+ 从 DownloadManager 移除任务 */
    @PluginMethod()
    public void cancelDownload(PluginCall call) {
        Long id = parseDownloadId(call);
        if (id == null) { call.reject("downloadId required"); return; }
        try {
            downloadEpoch++;
            if (activePollThread != null) {
                activePollThread.interrupt();
                activePollThread = null;
            }
            DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            dm.remove(id);
            android.util.Log.d("ApkInstaller", "cancelDownload id=" + id);
            call.resolve();
        } catch (Exception e) {
            android.util.Log.e("ApkInstaller", "cancelDownload failed id=" + id, e);
            call.reject("cancel failed: " + e.getMessage());
        }
    }

    /**
     * 解析 downloadId。Capacitor 的 PluginCall.getLong 只接受 Long 类型，
     * JS 整数会被解析成 Integer 而返回 null，故需按类型兜底。
     */
    private Long parseDownloadId(PluginCall call) {
        Long id = call.getLong("downloadId");
        if (id == null && call.getData() != null) {
            Object v = call.getData().opt("downloadId");
            if (v instanceof Number) {
                id = ((Number) v).longValue();
            } else if (v != null) {
                try { id = Long.parseLong(v.toString()); } catch (NumberFormatException ignored) {}
            }
        }
        return id;
    }

    /** 清理历史 update-*.apk 临时文件（保留当前要用的） */
    private void cleanupOldApks(Context ctx, File keepFile) {
        try {
            File dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null || !dir.isDirectory()) return;
            File[] files = dir.listFiles();
            if (files == null) return;
            for (File f : files) {
                if (f.isFile() && f.getName().startsWith("update-")
                        && !f.getAbsolutePath().equals(keepFile.getAbsolutePath())) {
                    f.delete();
                }
            }
        } catch (Exception ignored) {}
    }

    private void installApk(Context ctx, File apkFile) {
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
    }
}
