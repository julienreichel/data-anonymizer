import { defineFunction } from '@aws-amplify/backend';

/** Amplify Gen 2 function resource for the v1 REST API Lambda. */
export const apiFunction = defineFunction({
  name: 'api',
  entry: './handler.ts',
});
