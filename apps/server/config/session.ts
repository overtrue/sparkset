import { defineConfig, stores } from '@adonisjs/session';

export default defineConfig({
  /*
  |--------------------------------------------------------------------------
  | Session Store
  |--------------------------------------------------------------------------
  |
  | The store to use for storing session data. The default is 'cookie'.
  | You can also use 'memory' for testing or 'file' for development.
  |
  */
  store: 'cookie',

  /*
  |--------------------------------------------------------------------------
  | Available Stores
  |--------------------------------------------------------------------------
  |
  | Configure all available session stores.
  |
  */
  stores: {
    cookie: stores.cookie(),
  },

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
});
