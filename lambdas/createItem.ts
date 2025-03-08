import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Item } from "/opt/nodejs/shared/types";
import { createResponse, handleError } from "/opt/nodejs/shared/utils";

const client = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  try {
    const { partitionKey, sortKey, name, description, numericAttribute, booleanAttribute } = JSON.parse(event.body);

    // Validate required fields
    if (!partitionKey || !sortKey || !name || !description) {
      return createResponse(400, { error: "Missing required fields" });
    }

    const item: Item = {
      partitionKey,
      sortKey,
      name,
      description,
      numericAttribute,
      booleanAttribute,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: process.env.TABLE_NAME,
      Item: marshall(item),
      // Add condition to prevent overwriting existing items
      ConditionExpression: "attribute_not_exists(partitionKey) AND attribute_not_exists(sortKey)"
    };

    await client.send(new PutItemCommand(params));
    return createResponse(201, { 
      message: "Item created successfully",
      item: {
        partitionKey: item.partitionKey,
        sortKey: item.sortKey
      }
    });
  } catch (error: any) {
    // Check for condition failure (item already exists)
    if (error.name === 'ConditionalCheckFailedException') {
      return createResponse(409, { error: "Item already exists" });
    }
    
    return handleError(error, "Failed to create item");
  }
};