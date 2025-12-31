import { defineConfig, stores } from '@adonisjs/session';

export default defineConfig({
  /*
  |--------------------------------------------------------------------------
  | Session Driver
  |--------------------------------------------------------------------------
  |
  | The driver to use for storing session data. The default is 'cookie'.
  | You can also use 'memory' for testing or 'file' for development.
  |
  */
  // @ts-expect-error - driver property exists at runtime but not in types
  driver: stores.cookie(),

  /*
  |--------------------------------------------------------------------------
  | Cookie Name
  |--------------------------------------------------------------------------
  |
  | The name of the cookie that will be used to store the session ID.
  |
  */
  cookieName: 'adonis_session',

  /*
  |--------------------------------------------------------------------------
  | Cookie Options
  |--------------------------------------------------------------------------
  |
  | Configure the cookie options for the session cookie.
  |
  */
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // Set to true in production with HTTPS
  },

  /*
  |--------------------------------------------------------------------------
  | Store
  |--------------------------------------------------------------------------
  |
  | Configure the session store.
  |
  */
});
