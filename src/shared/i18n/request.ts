import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'en';

  const messages = (await import(`./${locale}.json`)).default;

  return {
    locale,
    messages,

    // Если в текущей локали ключа нет, next-intl автоматом возьмет его из en.json
    fallbackLocale: 'en',

    // Предотвращает падение приложения, если ключ не найден вообще нигде
    onError(error) {
      console.error(`[i18n Error]: ${error.message}`);
    },

    // Вместо падения вернет просто понятный путь ключа, например "HostelInfo.rules"
    getMessageFallback({ namespace, key }) {
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});
