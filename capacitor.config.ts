import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.imvault.app',
  appName: 'IM Vault',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: { allowMixedContent: false },
};

export default config;
