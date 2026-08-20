import { setupServer } from 'msw/node';

/** Shared msw server; tests register handlers per case. */
export const mswServer = setupServer();
