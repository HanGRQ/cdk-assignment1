import * as cdk from "aws-cdk-lib";
import { Assignment1Stack } from "../lib/assignment1-stack";

const app = new cdk.App();
new Assignment1Stack(app, "Assignment1Stack");