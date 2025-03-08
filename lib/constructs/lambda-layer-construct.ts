import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { Construct } from "constructs";

export class LambdaLayerConstruct extends Construct {
  public readonly sharedLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a Lambda layer for shared code
    this.sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common utilities and types for Lambda functions',
    });

    // Output the layer ARN
    new cdk.CfnOutput(this, "LambdaLayerArn", {
      value: this.sharedLayer.layerVersionArn,
    });
  }
}