import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Item } from "../shared/types";

const client = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  const { partitionKey, sortKey, name, description, numericAttribute, booleanAttribute } = JSON.parse(event.body);

  if (!partitionKey || !sortKey || !name || !description) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  const item: Item = {
    partitionKey,
    sortKey,
    name,
    description,
    numericAttribute,
    booleanAttribute,
  };

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(item),
  };

  try {
    await client.send(new PutItemCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Item created successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create item" }),
    };
  }
};