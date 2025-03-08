import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaLayerConstruct } from "./constructs/lambda-layer-construct";

export class LambdaLayerStack extends cdk.Stack {
  public readonly layerConstruct: LambdaLayerConstruct;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.layerConstruct = new LambdaLayerConstruct(this, 'LambdaLayer');

    new cdk.CfnOutput(this, "LambdaLayerStackName", {
      value: this.stackName,
      description: "The name of the Lambda layer stack",
    });
  }
}