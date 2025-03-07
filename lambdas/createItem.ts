import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import { apiResponses, validateRequiredFields } from '../shared/util';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) return apiResponses._400({ message: 'Missing request body' });

    const body = JSON.parse(event.body);
    const validationError = validateRequiredFields(body, ['partitionKey', 'description']);
    if (validationError) return apiResponses._400({ message: validationError });

    const item = {
      partitionKey: body.partitionKey,
      sortKey: uuid.v4(),
      description: body.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoDB.put({ TableName: TABLE_NAME, Item: item }).promise();
    return apiResponses._200({ message: 'Item created successfully', item });
  } catch (error) {
    console.error('Error creating item:', error);
    return apiResponses._500({ message: 'Error creating item', error: (error as Error).message });
  }
};
