# Serverless REST Assignment - Distributed Systems

**Name:** Sihan Ma
__Demo:__ https://youtu.be/njrHE_LBTRE

------

## Context

This application is a serverless RESTful web API designed for managing "items" in a DynamoDB database using AWS CDK, Lambda, API Gateway, and DynamoDB. The API supports CRUD operations along with a translation feature that leverages Amazon Translate.

### DynamoDB Table Item Attributes:

Each item in the DynamoDB table includes the following attributes:

- `partitionKey` (string) – The partition key
- `sortKey` (string) – The sort key
- `name` (string) – Name of the item
- `description` (string) – Description of the item
- `numericAttribute` (number) – A numeric value associated with the item
- `booleanAttribute` (boolean) – A boolean flag related to the item
- `translations` (optional, map) – Stores translated versions of the `description` in various languages

------

## App API Endpoints

- `GET /items` – Retrieve all items
- `GET /items/{partitionKey}/{sortKey}` – Retrieve a specific item by keys
- `POST /items` – Create a new item
- `PUT /items/{partitionKey}/{sortKey}` – Update an existing item
- `GET /items/{partitionKey}/{sortKey}/translation?language=fr` – Translate an item’s description into another language (e.g., French)

------

## Features

### Translation Persistence

Translated item descriptions are persisted in the `translations` map under the original item. This ensures translations are cached and reused to minimize repeated calls to Amazon Translate.

**Structure Example:**

```json
{
  "partitionKey": "1",
  "sortKey": "Item1",
  "name": "Example Item",
  "description": "This is an item.",
  "numericAttribute": 123,
  "booleanAttribute": true,
  "translations": {
    "fr": "Ceci est un article."
  }
}
```

------

### Custom L2 Construct

A custom L2 CDK construct named `ApiConstruct` was implemented to modularize API Gateway logic, allowing for clean reuse and configuration of routes, Lambda integration, and authorization setup.

#### Construct Input Props

```ts
type ApiConstructProps = {
  table: dynamodb.Table;
  layer: lambda.LayerVersion;
}
```

#### Exposed Public Properties

```ts
export class ApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.IApiKey;
  public readonly apiUrlOutput: CfnOutput;
}
```

------

### Multi-Stack App

This app is composed of multiple stacks to separate concerns and allow independent deployment:

- **DatabaseStack**: Provisions the DynamoDB table.
- **LambdaLayerStack**: Provisions the shared Lambda layer.
- **ApiStack**: Provisions Lambda functions and API Gateway.

Each stack references the necessary constructs via cross-stack references to keep the infrastructure modular and maintainable.

------

### Lambda Layers

A Lambda Layer is used to share utility functions (`utils.ts`) and TypeScript type definitions (`types.d.ts`) across multiple Lambda functions (`getItems`, `createItem`, `updateItem`, `translateItem`). This reduces code duplication and promotes reusability.

------

### API Keys

The application uses **API Key authentication** to restrict access to specific API Gateway endpoints such as `POST` and `PUT`. The API key is created and managed using AWS CDK, and is associated with a usage plan that enforces throttling and stage-level control.

#### Implementation Steps:

1. **Enabling API Key Requirement**
    The API Gateway is configured with `apiKeyRequired: true` in its `defaultMethodOptions`, making all methods require an API key by default.

   ```ts
   this.api = new apigateway.RestApi(this, 'Assignment1Api', {
     restApiName: 'Assignment1 API',
     deployOptions: { stageName: 'prod' },
     defaultMethodOptions: {
       apiKeyRequired: true
     }
   });
   ```

2. **Creating an API Key**
    An API key is generated and attached to the API:

   ```ts
   this.apiKey = this.api.addApiKey('ApiKey');
   ```

3. **Usage Plan Configuration**
    A usage plan is defined to link the API key to the deployed API stage, including rate limits for protection.

   ```ts
   const usagePlan = this.api.addUsagePlan('UsagePlan', {
     name: 'DefaultUsagePlan',
     apiStages: [{
       api: this.api,
       stage: this.api.deploymentStage
     }],
     throttle: {
       rateLimit: 10,
       burstLimit: 2
     }
   });
   usagePlan.addApiKey(this.apiKey);
   ```

4. **CloudFormation Outputs**
    The API endpoint and API key ID are output as CloudFormation stack outputs for easy retrieval:

   ```ts
   new CfnOutput(this, 'ApiEndpoint', {
     value: this.api.url
   });
   
   new CfnOutput(this, 'ApiKeyId', {
     value: this.apiKey.keyId
   });
   ```

#### Usage in Postman:

To access protected endpoints (such as `POST /items` or `PUT /items/{partitionKey}/{sortKey}`), include the following HTTP header:

```
x-api-key: <your_api_key>
```

This ensures only authorized users can modify resources via the API.

------

## Extra 

- **Seed Lambda**: A custom Lambda function (`seed-lambda.ts`) is included to populate the DynamoDB table with sample items on initial deployment.
- **Utility Functions**: Common logic such as error handling and response formatting is centralized in `utils.ts`, making handlers more concise and readable.
- **Type Safety**: Shared types ensure strong typing between all Lambda handlers, reducing bugs and improving developer experience.

