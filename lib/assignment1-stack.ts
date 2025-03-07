// assignment1-stack.ts
import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { generateBatch } from "../shared/utils";
import { Construct } from "constructs";
import { items as seedItems, itemDetails as seedItemDetails } from "../seed/items";

export class Assignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const itemsTable = new dynamodb.Table(this, "ItemsTable", {
      partitionKey: { name: "partitionKey", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sortKey", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const itemDetailsTable = new dynamodb.Table(this, "ItemDetailsTable", {
      partitionKey: { name: "itemId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "detailName", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const itemsTableBatch = generateBatch(seedItems as any[]);
    const itemDetailsTableBatch = generateBatch(seedItemDetails as any[]);

    const requestItems: { [tableName: string]: any[] } = {};
    
    if (itemsTableBatch.length > 0) {
      requestItems[itemsTable.tableName] = itemsTableBatch;
    }
    
    if (itemDetailsTableBatch.length > 0) {
      requestItems[itemDetailsTable.tableName] = itemDetailsTableBatch;
    }

    const seedDataFn = new lambda.Function(this, 'SeedDataFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'seed-lambda.handler',
      code: lambda.Code.fromAsset('seed'),
      environment: {
        ITEMS_TABLE_NAME: itemsTable.tableName,
        DETAILS_TABLE_NAME: itemDetailsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      timeout: cdk.Duration.minutes(2),
    });

    itemsTable.grantReadWriteData(seedDataFn);
    itemDetailsTable.grantReadWriteData(seedDataFn);

    new custom.AwsCustomResource(this, 'TriggerSeedFunction', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: seedDataFn.functionName,
          InvocationType: 'Event'
        },
        physicalResourceId: custom.PhysicalResourceId.of('SeedDataInvocation')
      },
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: seedDataFn.functionName,
          InvocationType: 'Event'
        },
        physicalResourceId: custom.PhysicalResourceId.of('SeedDataInvocation')
      },
      policy: custom.AwsCustomResourcePolicy.fromStatements([
        new cdk.aws_iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [seedDataFn.functionArn]
        })
      ])
    });

    const createItemFn = new lambdanode.NodejsFunction(this, "CreateItemFn", {
      entry: `${__dirname}/../lambdas/createItem.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
    });

    const getItemsFn = new lambdanode.NodejsFunction(this, "GetItemsFn", {
      entry: `${__dirname}/../lambdas/getItems.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
    });

    const updateItemFn = new lambdanode.NodejsFunction(this, "UpdateItemFn", {
      entry: `${__dirname}/../lambdas/updateItem.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
    });

    const translateItemFn = new lambdanode.NodejsFunction(this, "TranslateItemFn", {
      entry: `${__dirname}/../lambdas/translateItem.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      bundling: {
        forceDockerBundling: false, // 禁用Docker打包
      },
    });

    translateItemFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"]
    }));
    
    translateItemFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ["comprehend:DetectDominantLanguage"],
      resources: ["*"]
    }));

    itemsTable.grantReadWriteData(createItemFn);
    itemsTable.grantReadData(getItemsFn);
    itemsTable.grantReadWriteData(updateItemFn);
    itemsTable.grantReadWriteData(translateItemFn);

    const api = new apigateway.RestApi(this, "ItemsApi", {
      restApiName: "Items Service",
      description: "This service manages items.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    const apiKey = api.addApiKey("ApiKey");
    const plan = api.addUsagePlan("UsagePlan", {
      name: "Standard",
      throttle: {
        rateLimit: 10,
        burstLimit: 20
      }
    });
    plan.addApiKey(apiKey);
    plan.addApiStage({
      stage: api.deploymentStage
    });

    const itemsResource = api.root.addResource("items");
    
    itemsResource.addMethod("POST", new apigateway.LambdaIntegration(createItemFn), {
      apiKeyRequired: true
    });
    
    itemsResource.addMethod("GET", new apigateway.LambdaIntegration(getItemsFn));

    const itemByPartition = itemsResource.addResource("{partitionKey}");
    
    itemByPartition.addMethod("GET", new apigateway.LambdaIntegration(getItemsFn));

    const itemByKeys = itemByPartition.addResource("{sortKey}");
    
    itemByKeys.addMethod("GET", new apigateway.LambdaIntegration(getItemsFn));
    
    itemByKeys.addMethod("PUT", new apigateway.LambdaIntegration(updateItemFn), {
      apiKeyRequired: true
    });

    const translationResource = itemByKeys.addResource("translation");
    
    translationResource.addMethod("GET", new apigateway.LambdaIntegration(translateItemFn));

    new cdk.CfnOutput(this, "ItemsTableName", {
      value: itemsTable.tableName,
    });

    new cdk.CfnOutput(this, "ItemDetailsTableName", {
      value: itemDetailsTable.tableName,
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: apiKey.keyId
    });
  }
}