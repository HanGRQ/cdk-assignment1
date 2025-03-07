import { DynamoDBClient, UpdateItemCommand, ReturnValue } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  try {
    const partitionKey = event.pathParameters?.partitionKey;
    const sortKey = event.pathParameters?.sortKey;
    
    if (!partitionKey || !sortKey) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Partition key and sort key are required in the path" })
      };
    }
    
    const requestBody = JSON.parse(event.body || "{}");
    const { name, description, numericAttribute, booleanAttribute } = requestBody;
    
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
    
    // 添加 updatedAt 时间戳
    updateExpression += " #updatedAt = :updatedAt,";
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = { S: new Date().toISOString() };
    
    // 移除最后一个逗号
    updateExpression = updateExpression.slice(0, -1);
    
    if (updateExpression === "SET") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "No fields to update" })
      };
    }

    const params = {
      TableName: process.env.TABLE_NAME,
      Key: {
        partitionKey: { S: partitionKey },
        sortKey: { S: sortKey }
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: ReturnValue.ALL_NEW // 使用枚举而不是字符串
    };

    console.log("Update params:", JSON.stringify(params, null, 2));
    
    const result = await client.send(new UpdateItemCommand(params));
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Item updated successfully",
        item: result.Attributes
      })
    };
  } catch (error) {
    console.error("Error updating item:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ 
        error: "Failed to update item", 
        details: String(error)
      })
    };
  }
};