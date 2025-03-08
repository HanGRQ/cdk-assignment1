// lambdas/updateItem.ts
import { DynamoDBClient, UpdateItemCommand, GetItemCommand, ReturnValue } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Item } from "/opt/nodejs/shared/types";
import { createResponse, handleError } from "/opt/nodejs/shared/utils";

const client = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  try {
    const partitionKey = event.pathParameters?.partitionKey;
    const sortKey = event.pathParameters?.sortKey;
    
    if (!partitionKey || !sortKey) {
      return createResponse(400, { error: "Partition key and sort key are required in the path" });
    }
    
    // First, check if the item exists
    const getParams = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        partitionKey,
        sortKey
      })
    };
    
    const getResult = await client.send(new GetItemCommand(getParams));
    
    if (!getResult.Item) {
      return createResponse(404, { error: "Item not found" });
    }
    
    const requestBody = JSON.parse(event.body || "{}");
    const { name, description, numericAttribute, booleanAttribute } = requestBody;
    
    // Build update expression and attribute values
    let updateExpression = "SET";
    const expressionAttributeNames: {[key: string]: string} = {};
    const expressionAttributeValues: {[key: string]: any} = {};
    
    if (name !== undefined) {
      updateExpression += " #name = :name,";
      expressionAttributeNames["#name"] = "name";
      expressionAttributeValues[":name"] = { S: name };
    }
    
    if (description !== undefined) {
      updateExpression += " #description = :description,";
      expressionAttributeNames["#description"] = "description";
      expressionAttributeValues[":description"] = { S: description };
    }
    
    if (numericAttribute !== undefined) {
      updateExpression += " #numericAttribute = :numericAttribute,";
      expressionAttributeNames["#numericAttribute"] = "numericAttribute";
      expressionAttributeValues[":numericAttribute"] = { N: numericAttribute.toString() };
    }
    
    if (booleanAttribute !== undefined) {
      updateExpression += " #booleanAttribute = :booleanAttribute,";
      expressionAttributeNames["#booleanAttribute"] = "booleanAttribute";
      expressionAttributeValues[":booleanAttribute"] = { BOOL: booleanAttribute };
    }
    
    // Always add updatedAt timestamp
    updateExpression += " #updatedAt = :updatedAt,";
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = { S: new Date().toISOString() };
    
    // Remove trailing comma
    updateExpression = updateExpression.slice(0, -1);
    
    if (updateExpression === "SET") {
      return createResponse(400, { error: "No fields to update" });
    }

    const params = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        partitionKey,
        sortKey
      }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: ReturnValue.ALL_NEW
    };

    console.log("Update params:", JSON.stringify(params, null, 2));
    
    const result = await client.send(new UpdateItemCommand(params));
    const updatedItem = unmarshall(result.Attributes || {}) as Item;
    
    return createResponse(200, {
      message: "Item updated successfully",
      item: updatedItem
    });
  } catch (error) {
    return handleError(error, "Failed to update item", process.env.NODE_ENV === 'development');
  }
};