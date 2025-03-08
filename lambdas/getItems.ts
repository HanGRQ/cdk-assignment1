// lambdas/getItems.ts
import { DynamoDBClient, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Item } from "/opt/nodejs/shared/types";
import { createResponse, handleError } from "/opt/nodejs/shared/utils";

const client = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  
  try {
    // 安全地访问路径参数，使用可选链和默认值
    const partitionKey = event.pathParameters?.partitionKey;
    const sortKey = event.pathParameters?.sortKey;
    const filter = event.queryStringParameters?.filter;
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;

    // 如果没有提供 partitionKey，执行扫描操作
    if (!partitionKey) {
      console.log("No partitionKey provided, performing scan");
      
      const scanParams: ScanCommandInput = {
        TableName: process.env.TABLE_NAME,
        Limit: limit
      };
      
      // 如果提供了过滤参数，添加过滤表达式
      if (filter) {
        scanParams.FilterExpression = "contains(description, :filter)";
        scanParams.ExpressionAttributeValues = {
          ":filter": { S: filter }
        };
      }
      
      const data = await client.send(new ScanCommand(scanParams));
      const items = data.Items?.map(item => unmarshall(item) as Item) || [];
      
      // 返回格式化的响应
      return createResponse(200, items);
    }
    
    // 如果提供了 partitionKey，执行查询操作
    console.log(`Querying with partitionKey: ${partitionKey}`);
    
    const params: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "partitionKey = :partitionKey",
      ExpressionAttributeValues: {
        ":partitionKey": { S: partitionKey }
      },
      Limit: limit
    };

    // 如果提供了 sortKey，添加到查询条件
    if (sortKey) {
      console.log(`Adding sortKey to query: ${sortKey}`);
      params.KeyConditionExpression += " AND sortKey = :sortKey";
      params.ExpressionAttributeValues![":sortKey"] = { S: sortKey };
    }

    // 如果提供了过滤参数，添加过滤表达式
    if (filter) {
      console.log(`Adding filter to query: ${filter}`);
      params.FilterExpression = "contains(description, :filter)";
      params.ExpressionAttributeValues![":filter"] = { S: filter };
    }

    const data = await client.send(new QueryCommand(params));
    const items = data.Items?.map(item => unmarshall(item) as Item) || [];
    
    // 返回格式化的响应
    return createResponse(200, items);
  } catch (error) {
    // 使用共享的错误处理函数
    return handleError(error, "Failed to fetch items", process.env.NODE_ENV === 'development');
  }
};