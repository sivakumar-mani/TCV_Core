export interface AppConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    APP_CONFIG?: Partial<AppConfig>;
  }
}

const localHosts = ['localhost', '127.0.0.1', '::1'];
const isLocal = localHosts.includes(window.location.hostname);

const defaultConfig: AppConfig = {
  apiUrl: isLocal ? 'http://localhost:8080/api' : 'http://timecablevision.in/api',
};

const runtimeConfig = window.APP_CONFIG ?? {};
const runtimeApiUrl = runtimeConfig.apiUrl ?? '';
const hasLocalApiOverride = /localhost|127\.0\.0\.1/.test(runtimeApiUrl);

export const appConfig: AppConfig = {
  ...defaultConfig,
  ...(!isLocal && hasLocalApiOverride ? {} : runtimeConfig),
};
