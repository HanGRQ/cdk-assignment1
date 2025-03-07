import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { apiResponses } from '../shared/util';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { partitionKey, sortKey } = event.pathParameters || {};
    if (!partitionKey || !sortKey) return apiResponses._400({ message: 'Missing path parameters' });

    if (!event.body) return apiResponses._400({ message: 'Missing request body' });

    const body = JSON.parse(event.body);
    body.updatedAt = new Date().toISOString();

    await dynamoDB.update({
      TableName: TABLE_NAME,
      Key: { partitionKey, sortKey },
      UpdateExpression: 'SET updatedAt = :updatedAt',
      ExpressionAttributeValues: { ':updatedAt': body.updatedAt }
    }).promise();

    return apiResponses._200({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating item:', error);
    return apiResponses._500({ message: 'Error updating item', error: (error as Error).message });
  }
};
