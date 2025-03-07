import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { apiResponses } from '../shared/util';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const partitionKey = queryParams.partitionKey || 'default'; 

    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'partitionKey = :partitionKey',
      ExpressionAttributeValues: { ':partitionKey': partitionKey },
    };

    const result = await dynamoDB.query(params).promise();
    return apiResponses._200({ items: result.Items || [] });
  } catch (error) {
    console.error('Error fetching items:', error);
    return apiResponses._500({ message: 'Error fetching items', error: (error as Error).message });
  }
};
