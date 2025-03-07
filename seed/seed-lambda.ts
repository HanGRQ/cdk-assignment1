import * as AWS from 'aws-sdk';
import { items, itemDetails } from './items';

const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION || 'us-east-1'
});

async function processBatch(tableName: string, items: any[]): Promise<void> {
  if (!items || items.length === 0) {
    console.log(`No items to process for table ${tableName}`);
    return;
  }

  const batches: any[][] = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  console.log(`Processing ${batches.length} batches for table ${tableName}`);

  for (const batch of batches) {
    const params = {
      RequestItems: {
        [tableName]: batch.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    };

    try {
      await dynamoDB.batchWrite(params).promise();
      console.log(`Successfully wrote batch to ${tableName}`);
    } catch (error) {
      console.error(`Error writing batch to ${tableName}:`, error);
      throw error;
    }
  }
}

export const handler = async (event: any): Promise<any> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    const itemsTableName = process.env.ITEMS_TABLE_NAME;
    const itemDetailsTableName = process.env.DETAILS_TABLE_NAME;
    
    if (!itemsTableName || !itemDetailsTableName) {
      throw new Error('Table names not provided in environment variables');
    }
    
    await processBatch(itemsTableName, items);
    
    await processBatch(itemDetailsTableName, itemDetails);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully seeded data' })
    };
  } catch (error) {
    console.error('Error seeding data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(error) })
    };
  }
};