import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../../layer/nodejs/shared/utils";

export interface DatabaseConstructProps {
  seedItemsPath: string;
  seedItemDetailsPath: string;
}

export class DatabaseConstruct extends Construct {
  public readonly itemsTable: dynamodb.Table;
  public readonly itemDetailsTable: dynamodb.Table;
  
  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    // Create DynamoDB tables
    this.itemsTable = new dynamodb.Table(this, "ItemsTable", {
      partitionKey: { name: "partitionKey", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sortKey", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.itemDetailsTable = new dynamodb.Table(this, "ItemDetailsTable", {
      partitionKey: { name: "itemId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "detailName", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    
    // Create seeding Lambda function
    const seedDataFn = new lambdanode.NodejsFunction(this, 'SeedDataFunction', {
      entry: props.seedItemDetailsPath,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        ITEMS_TABLE_NAME: this.itemsTable.tableName,
        DETAILS_TABLE_NAME: this.itemDetailsTable.tableName,
        REGION: cdk.Stack.of(this).region,
      },
      timeout: cdk.Duration.minutes(2),
      bundling: {
        forceDockerBundling: false,
      },
    });

    // Grant permissions
    this.itemsTable.grantReadWriteData(seedDataFn);
    this.itemDetailsTable.grantReadWriteData(seedDataFn);

    // Add custom resource to trigger the seeding Lambda
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
    
    // Output the table names
    new cdk.CfnOutput(this, "ItemsTableName", {
      value: this.itemsTable.tableName,
    });

    new cdk.CfnOutput(this, "ItemDetailsTableName", {
      value: this.itemDetailsTable.tableName,
    });
  }
}