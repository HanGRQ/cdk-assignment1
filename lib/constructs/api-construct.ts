import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface ApiConstructProps {
  itemsTable: dynamodb.Table;
  lambdaLayer: lambda.LayerVersion;
}

export class ApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.IApiKey; // 修改这里，使用 IApiKey 接口

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);
    // Create API Gateway
    this.api = new apigateway.RestApi(this, "ItemsApi", {
      restApiName: "Items Service",
      description: "This service manages items.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    // Create API Key and Usage Plan
    this.apiKey = this.api.addApiKey("ApiKey");
    const plan = this.api.addUsagePlan("UsagePlan", {
      name: "Standard",
      throttle: {
        rateLimit: 10,
        burstLimit: 20
      }
    });
    plan.addApiKey(this.apiKey);
    plan.addApiStage({
      stage: this.api.deploymentStage
    });

    // Create Lambda functions with shared layer
    const createItemFn = new lambdanode.NodejsFunction(this, "CreateItemFn", {
      entry: `${__dirname}/../../lambdas/createItem.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: props.itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      layers: [props.lambdaLayer],
    });

    const getItemsFn = new lambdanode.NodejsFunction(this, "GetItemsFn", {
      entry: `${__dirname}/../../lambdas/getItems.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: props.itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      layers: [props.lambdaLayer],
    });

    const updateItemFn = new lambdanode.NodejsFunction(this, "UpdateItemFn", {
      entry: `${__dirname}/../../lambdas/updateItem.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: props.itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      layers: [props.lambdaLayer],
    });

    const translateItemFn = new lambdanode.NodejsFunction(this, "TranslateItemFn", {
      entry: `${__dirname}/../../lambdas/translateItem.ts`,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: props.itemsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      bundling: {
        forceDockerBundling: false,
      },
      layers: [props.lambdaLayer],
    });

    // Add permissions for AWS Translate and Comprehend
    translateItemFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"]
    }));
    
    translateItemFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ["comprehend:DetectDominantLanguage"],
      resources: ["*"]
    }));

    // Grant DynamoDB permissions
    props.itemsTable.grantReadWriteData(createItemFn);
    props.itemsTable.grantReadData(getItemsFn);
    props.itemsTable.grantReadWriteData(updateItemFn);
    props.itemsTable.grantReadWriteData(translateItemFn);

    // Set up API endpoints
    const itemsResource = this.api.root.addResource("items");
    
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

    // Output API endpoint and API Key
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: this.api.url
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: this.apiKey.keyId
    });
  }
}