package cn.com.tmiot;

import android.app.Activity;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Google Play 应用内更新桥接。
 * - getUpdateInfo：查询 Play 是否有新版本
 * - startUpdate：启动 IMMEDIATE / FLEXIBLE 更新流程（用 AppUpdateOptions 重载 + 自定 requestCode）
 * - completeUpdate：FLEXIBLE 下载完成后触发安装
 * 仅对 updateChannel === 'play' 的变体被 JS 调用；其他变体/非 Play 设备会 reject，由 JS 降级。
 *
 * 注（相对 brief 的两处适配，详见 task-3-report.md）：
 * 1. play-core 2.1.0 不再有 DownloadStatus 类 / InstallState.downloadStatus()，
 *    下载子状态并入 installStatus()，故 downloadStatus 事件字段由 installStatus() 派生。
 * 2. Capacitor 8 的 @ActivityCallback 只接收经 Capacitor 自己 launcher 启动的结果，
 *    而 Play Core 的 startUpdateFlowForResult 走 Activity 原生 startActivityForResult，
 *    结果落在过时的 handleOnActivityResult。故需把请求码声明进 @CapacitorPlugin(requestCodes=...)
 *    并用 handleOnActivityResult 接结果（Bridge.onActivityResult 会按请求码路由到本插件）。
 */
// 自定 requestCode，避免与 Capacitor 内部活动请求码冲突；
// 需字面量写进注解（注解值不允许前向引用同类的 static final 字段）
@CapacitorPlugin(name = "PlayUpdate", requestCodes = { 9981 })
// 整个类刻意使用 Capacitor 过时的 saved-call API（saveCall/getSavedCall/freeSavedCall/handleOnActivityResult）：
// Play Core 直连 startActivityForResult 的结果只有过时 handleOnActivityResult 能接（见类注释），故类级别抑制 deprecation 告警
@SuppressWarnings("deprecation")
public class PlayUpdatePlugin extends Plugin {

    private static final int REQUEST_CODE_UPDATE = 9981;

    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener stateListener;

    private AppUpdateManager getManager() {
        if (appUpdateManager == null) {
            appUpdateManager = AppUpdateManagerFactory.create(getContext());
        }
        return appUpdateManager;
    }

    @PluginMethod()
    public void getUpdateInfo(PluginCall call) {
        getManager().getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                JSObject result = new JSObject();
                result.put("updateAvailable", info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE);
                result.put("isImmediateAllowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
                result.put("isFlexibleAllowed", info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE));
                result.put("availableVersionCode", info.availableVersionCode());
                result.put("updatePriority", info.updatePriority());
                result.put("packageName", getContext().getPackageName());
                call.resolve(result);
            })
            .addOnFailureListener(e -> call.reject("getAppUpdateInfo failed: " + e.getMessage()));
    }

    @PluginMethod()
    public void startUpdate(PluginCall call) {
        String typeStr = call.getString("type", "flexible");
        boolean force = call.getBoolean("force", false);
        final int type = "immediate".equals(typeStr) ? AppUpdateType.IMMEDIATE : AppUpdateType.FLEXIBLE;

        getManager().getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                boolean available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                        || info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                if (!available) {
                    call.reject("no update available", "NO_UPDATE");
                    return;
                }
                if (!info.isUpdateTypeAllowed(type)) {
                    call.reject("update type not allowed", "TYPE_NOT_ALLOWED");
                    return;
                }
                // FLEXIBLE 需监听安装状态：下载完成时由 JS 调 completeUpdate
                if (type == AppUpdateType.FLEXIBLE) {
                    registerStateListener();
                }
                saveCall(call);
                try {
                    boolean started = getManager().startUpdateFlowForResult(
                        info,
                        getActivity(),
                        AppUpdateOptions.newBuilder(type).build(),
                        REQUEST_CODE_UPDATE);
                    if (!started) {
                        call.reject("startUpdateFlow returned false");
                    }
                } catch (Exception e) {
                    call.reject("startUpdateFlow failed: " + e.getMessage());
                }
            })
            .addOnFailureListener(e -> call.reject("getAppUpdateInfo failed: " + e.getMessage()));
    }

    /**
     * 接收 Play Core 更新流程的结果。
     * Capacitor 8 的 Bridge.onActivityResult 依据 @CapacitorPlugin(requestCodes) 中的请求码
     * 路由到本插件的 handleOnActivityResult（过时但仍是 Play Core 直连 startActivityForResult 的唯一通道）。
     */
    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        // 非本插件的请求码直接忽略，避免串台
        if (requestCode != REQUEST_CODE_UPDATE) return;
        PluginCall call = getSavedCall();
        if (call == null) {
            android.util.Log.w("PlayUpdate", "handleOnActivityResult: no saved call, requestCode=" + requestCode);
            return;
        }
        boolean force = call.getBoolean("force", false);
        if (resultCode == Activity.RESULT_OK) {
            call.resolve();
        } else if (resultCode == Activity.RESULT_CANCELED) {
            if (force) {
                // 强制更新被取消：通知 JS 重新拉起，保持"不可退出"语义
                JSObject ev = new JSObject().put("cancelled", true);
                notifyListeners("updateCancelled", ev);
                call.resolve();
            } else {
                call.reject("update cancelled", "USER_CANCELLED");
            }
        } else {
            call.reject("update failed resultCode=" + resultCode);
        }
        // 释放已结算的 call，避免进程重建重复投递 onActivityResult 时重结算旧 call
        freeSavedCall();
    }

    @PluginMethod()
    public void completeUpdate(PluginCall call) {
        getManager().completeUpdate();
        call.resolve();
    }

    private void registerStateListener() {
        if (stateListener != null) return;
        stateListener = state -> {
            JSObject ev = new JSObject();
            int status = state.installStatus();
            ev.put("installStatus", installStatusName(status));
            // play-core 2.x 将下载子状态并入 installStatus()，故 downloadStatus 由其派生
            ev.put("downloadStatus", downloadStatusName(status));
            ev.put("bytesDownloaded", state.bytesDownloaded());
            ev.put("totalBytesToDownload", state.totalBytesToDownload());
            notifyListeners("stateChange", ev);
            // 终态：解绑监听，避免泄漏
            if (status == InstallStatus.INSTALLED
                    || status == InstallStatus.FAILED
                    || status == InstallStatus.CANCELED) {
                getManager().unregisterListener(stateListener);
                stateListener = null;
            }
        };
        getManager().registerListener(stateListener);
    }

    /** play-core 2.x 无独立 DownloadStatus，用 installStatus() 值映射下载子状态 */
    private static String downloadStatusName(int status) {
        switch (status) {
            case InstallStatus.PENDING: return "PENDING";
            case InstallStatus.DOWNLOADING: return "DOWNLOADING";
            case InstallStatus.DOWNLOADED: return "DOWNLOADED";
            case InstallStatus.FAILED: return "FAILED";
            case InstallStatus.CANCELED: return "CANCELED";
            // 已进入安装/确认阶段，下载视为完成
            case InstallStatus.REQUIRES_UI_INTENT:
            case InstallStatus.INSTALLING:
            case InstallStatus.INSTALLED:
                return "DOWNLOADED";
            default: return "UNKNOWN";
        }
    }

    private static String installStatusName(int status) {
        switch (status) {
            case InstallStatus.REQUIRES_UI_INTENT: return "REQUIRES_UI_INTENT";
            case InstallStatus.PENDING: return "PENDING";
            case InstallStatus.DOWNLOADING: return "DOWNLOADING";
            case InstallStatus.DOWNLOADED: return "DOWNLOADED";
            case InstallStatus.INSTALLING: return "INSTALLING";
            case InstallStatus.INSTALLED: return "INSTALLED";
            case InstallStatus.FAILED: return "FAILED";
            case InstallStatus.CANCELED: return "CANCELED";
            default: return "UNKNOWN";
        }
    }
}
