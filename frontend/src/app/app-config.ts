export interface AppConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    APP_CONFIG?: Partial<AppConfig>;
  }
}

const defaultConfig: AppConfig = {
  apiUrl: 'http://localhost:8080/api',
};

export const appConfig: AppConfig = {
  ...defaultConfig,
  ...window.APP_CONFIG,
};
