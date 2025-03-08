import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { ApiStack } from '../lib/api-stack';
import { LambdaLayerStack } from '../lib/lambda-layer-stack';

const app = new cdk.App();

// Create stacks with dependencies between them
const lambdaLayerStack = new LambdaLayerStack(app, 'Assignment1LambdaLayerStack', {
  stackName: 'assignment1-lambda-layer-stack',
  description: 'Lambda layers for Assignment1',
});

const databaseStack = new DatabaseStack(app, 'Assignment1DatabaseStack', {
  stackName: 'assignment1-database-stack',
  description: 'DynamoDB resources for Assignment1',
});

const apiStack = new ApiStack(app, 'Assignment1ApiStack', {
  stackName: 'assignment1-api-stack',
  description: 'API Gateway and Lambda functions for Assignment1',
  itemsTable: databaseStack.databaseConstruct.itemsTable,
  lambdaLayer: lambdaLayerStack.layerConstruct.sharedLayer,
});

// Define stack dependencies
apiStack.addDependency(databaseStack);
apiStack.addDependency(lambdaLayerStack);