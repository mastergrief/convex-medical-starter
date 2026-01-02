import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.convex.medical',
  appName: 'Convex Medical',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : undefined,
    cleartext: process.env.NODE_ENV === 'development'
  },
  plugins: {
    Preferences: {
      group: 'ConvexMedicalData'
    },
    Network: {
      enabled: true
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
