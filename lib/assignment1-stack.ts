import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class Assignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: { name: 'partitionKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sortKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const getAllItemsLambda = new lambda.Function(this, 'GetAllItemsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'getAllItems.handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    const getItemByIdLambda = new lambda.Function(this, 'GetItemByIdFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'getItemById.handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    const createItemLambda = new lambda.Function(this, 'CreateItemFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'createItem.handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    const updateItemLambda = new lambda.Function(this, 'UpdateItemFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'updateItem.handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    const translateItemLambda = new lambda.Function(this, 'TranslateItemFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambdas'),
      handler: 'translateItem.handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    table.grantReadWriteData(createItemLambda);
    table.grantReadData(getAllItemsLambda);
    table.grantReadData(getItemByIdLambda);
    table.grantReadWriteData(updateItemLambda);
    table.grantReadWriteData(translateItemLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'ItemsApi', {
      restApiName: 'Items API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    const apiKey = api.addApiKey('ApiKey');
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: 'UsagePlan',
      apiStages: [{ api, stage: api.deploymentStage }]
    });
    usagePlan.addApiKey(apiKey);

    const items = api.root.addResource('items');
    items.addMethod('POST', new apigateway.LambdaIntegration(createItemLambda), { apiKeyRequired: true });
    items.addMethod('GET', new apigateway.LambdaIntegration(getAllItemsLambda));
    
    const itemResource = items.addResource('{partitionKey}');
    const specificItem = itemResource.addResource('{sortKey}');
    specificItem.addMethod('GET', new apigateway.LambdaIntegration(getItemByIdLambda));
    specificItem.addMethod('PUT', new apigateway.LambdaIntegration(updateItemLambda), { apiKeyRequired: true });
    
    const translationResource = specificItem.addResource('translation');
    translationResource.addMethod('GET', new apigateway.LambdaIntegration(translateItemLambda));

    new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.url });
    new cdk.CfnOutput(this, 'ApiKey', { value: apiKey.keyId });
  }
}