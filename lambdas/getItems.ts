import { DynamoDBClient, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Item } from "../shared/types";

const client = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  
  // 安全地访问路径参数，使用可选链和默认值
  const partitionKey = event.pathParameters?.partitionKey;
  const sortKey = event.pathParameters?.sortKey;
  const filter = event.queryStringParameters?.filter;

  try {
    if (!partitionKey) {
      console.log("No partitionKey provided, performing scan");
      
      const scanParams: ScanCommandInput = {
        TableName: process.env.TABLE_NAME
      };
      
      if (filter) {
        scanParams.FilterExpression = "contains(description, :filter)";
        scanParams.ExpressionAttributeValues = {
          ":filter": { S: filter }
        };
      }
      
      const data = await client.send(new ScanCommand(scanParams));
      const items = data.Items?.map(item => unmarshall(item) as Item) || [];
      
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(items)
      };
    }
    
    console.log(`Querying with partitionKey: ${partitionKey}`);
    
    const params: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "partitionKey = :partitionKey",
      ExpressionAttributeValues: {
        ":partitionKey": { S: partitionKey }
      }
    };

    if (sortKey) {
      console.log(`Adding sortKey to query: ${sortKey}`);
      params.KeyConditionExpression += " AND sortKey = :sortKey";
      params.ExpressionAttributeValues![":sortKey"] = { S: sortKey };
    }

    if (filter) {
      console.log(`Adding filter to query: ${filter}`);
      params.FilterExpression = "contains(description, :filter)";
      params.ExpressionAttributeValues![":filter"] = { S: filter };
    }

    const data = await client.send(new QueryCommand(params));
    const items = data.Items?.map(item => unmarshall(item) as Item) || [];
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(items)
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ 
        error: "Failed to fetch items",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      })
    };
  }
};