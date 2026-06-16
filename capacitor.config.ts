import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.com.tmiot.hongsuyun',
  appName: '弘塑云',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    iosScheme: 'http',
    cleartext: true
  }
};

export default config;
