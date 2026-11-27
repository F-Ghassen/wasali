import appConfig from './app.json';

export default () => ({
  ...appConfig.expo,
  extra: {
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST,
  },
});
