import { defineBackend } from '@aws-amplify/backend';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { apiFunction } from './functions/api/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  apiFunction,
});

const apiStack = backend.createStack('rest-api-stack');
const lambdaFn = backend.apiFunction.resources.lambda;

const httpApi = new HttpApi(apiStack, 'V1HttpApi', {
  apiName: 'data-anonymizer-v1',
});

const integration = new HttpLambdaIntegration('ApiIntegration', lambdaFn);

const v1Routes = [
  { path: '/v1/health', methods: [HttpMethod.GET] },
  { path: '/v1/pii/detect', methods: [HttpMethod.POST] },
  { path: '/v1/pii/anonymize', methods: [HttpMethod.POST] },
  { path: '/v1/pii/detect-and-anonymize', methods: [HttpMethod.POST] },
] as const;

for (const route of v1Routes) {
  httpApi.addRoutes({ path: route.path, methods: [...route.methods], integration });
}

backend.addOutput({
  custom: {
    API: {
      endpoint: httpApi.apiEndpoint,
    },
  },
});
