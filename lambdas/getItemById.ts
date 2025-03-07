import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { apiResponses } from '../shared/util';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { partitionKey, sortKey } = event.pathParameters || {};
    if (!partitionKey || !sortKey) {
      return apiResponses._400({ message: 'Missing required path parameters' });
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { partitionKey, sortKey }
    };

    const result = await dynamoDB.get(params).promise();
    if (!result.Item) {
      return apiResponses._404({ message: 'Item not found' });
    }

    return apiResponses._200({ item: result.Item });
  } catch (error) {
    console.error('Error fetching item:', error);
    return apiResponses._500({ message: 'Error fetching item', error: (error as Error).message });
  }
};
