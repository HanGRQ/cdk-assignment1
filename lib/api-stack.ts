import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { ApiConstruct } from "./constructs/api-construct";

export interface ApiStackProps extends cdk.StackProps {
  itemsTable: dynamodb.Table;
  lambdaLayer: lambda.LayerVersion;
}

export class ApiStack extends cdk.Stack {
  public readonly apiConstruct: ApiConstruct;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.apiConstruct = new ApiConstruct(this, 'Api', {
      itemsTable: props.itemsTable,
      lambdaLayer: props.lambdaLayer,
    });

    new cdk.CfnOutput(this, "ApiStackName", {
      value: this.stackName,
      description: "The name of the API stack",
    });
  }
}