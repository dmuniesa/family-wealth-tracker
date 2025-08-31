import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({requestLocale}) => {
  // Handle if requestLocale is a promise or object containing the locale
  let locale: string | undefined = requestLocale;
  if (requestLocale && typeof requestLocale === 'object' && 'then' in requestLocale) {
    locale = await (requestLocale as Promise<string | undefined>);
  }
  
  const validLocale = (locale && typeof locale === 'string' && ['en', 'es'].includes(locale)) ? locale : 'en';
  
  return {
    locale: validLocale,
    messages: (await import(`../locales/${validLocale}.json`)).default
  };
});