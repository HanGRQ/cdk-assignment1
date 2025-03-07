import * as AWS from 'aws-sdk';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

const items = [
  { partitionKey: 'product', sortKey: 'p1001', description: 'Wireless Headphones' },
  { partitionKey: 'product', sortKey: 'p1002', description: 'Smart Watch' }
];

export const handler = async () => {
  for (const item of items) {
    await dynamoDB.put({ TableName: TABLE_NAME, Item: item }).promise();
  }
  return { message: 'Seed data inserted' };
};
