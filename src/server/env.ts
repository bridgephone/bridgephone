const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgres://bridgephone:bridgephone@localhost:5432/bridgephone',
  appUrl,
  secureCookies: appUrl.startsWith('https://'),
  siteAdmins: (process.env.SITE_ADMINS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  devLogin: process.env.DEV_LOGIN === 'true',
}
