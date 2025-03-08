import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./constructs/database-construct";

export class DatabaseStack extends cdk.Stack {
  public readonly databaseConstruct: DatabaseConstruct;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.databaseConstruct = new DatabaseConstruct(this, 'Database', {
      seedItemsPath: `${__dirname}/../seed/items.ts`,
      seedItemDetailsPath: `${__dirname}/../seed/seed-lambda.ts`,
    });

    new cdk.CfnOutput(this, "DatabaseStackName", {
      value: this.stackName,
      description: "The name of the database stack",
    });
  }
}