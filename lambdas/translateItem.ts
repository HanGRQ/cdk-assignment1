import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { apiResponses } from '../shared/util';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const translate = new AWS.Translate();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { partitionKey, sortKey } = event.pathParameters || {};
    const language = event.queryStringParameters?.language || 'en';

    if (!partitionKey || !sortKey) return apiResponses._400({ message: 'Missing path parameters' });

    const result = await dynamoDB.get({
      TableName: TABLE_NAME,
      Key: { partitionKey, sortKey }
    }).promise();

    if (!result.Item) return apiResponses._404({ message: 'Item not found' });

    const translateParams = {
      Text: result.Item.description,
      SourceLanguageCode: 'en',
      TargetLanguageCode: language
    };

    const translatedText = await translate.translateText(translateParams).promise();
    return apiResponses._200({ translatedDescription: translatedText.TranslatedText });
  } catch (error) {
    console.error('Error translating item:', error);
    return apiResponses._500({ message: 'Error translating item', error: (error as Error).message });
  }
};
