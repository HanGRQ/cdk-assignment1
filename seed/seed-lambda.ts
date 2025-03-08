// seed/seed-lambda.ts
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

  // Improved batch processing with explicit error handling for each item
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
      const result = await dynamoDB.batchWrite(params).promise();
      
      // Handle unprocessed items if any
      if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
        console.warn(`Some items were not processed: ${JSON.stringify(result.UnprocessedItems)}`);
        
        // Try to process unprocessed items individually
        for (const tableName in result.UnprocessedItems) {
          // 检查表是否存在未处理的项目
          if (result.UnprocessedItems[tableName] && Array.isArray(result.UnprocessedItems[tableName])) {
            for (const request of result.UnprocessedItems[tableName]) {
              // 确保请求包含 PutRequest 和 Item
              if (request.PutRequest && request.PutRequest.Item) {
                try {
                  await dynamoDB.put({
                    TableName: tableName,
                    Item: request.PutRequest.Item
                  }).promise();
                  console.log(`Successfully processed individual item for ${tableName}`);
                } catch (itemError) {
                  console.error(`Failed to process individual item for ${tableName}:`, itemError);
                }
              } else {
                console.warn(`Skipping invalid request: ${JSON.stringify(request)}`);
              }
            }
          }
        }
      }
      
      console.log(`Successfully wrote batch to ${tableName}`);
    } catch (error) {
      console.error(`Error writing batch to ${tableName}:`, error);
      
      // Try to write items individually if batch fails
      for (const item of batch) {
        try {
          // 这里我们确实知道 item.PutRequest 存在，因为这是我们构建的
          await dynamoDB.put({
            TableName: tableName,
            Item: item.PutRequest.Item
          }).promise();
          console.log(`Successfully wrote individual item to ${tableName}`);
        } catch (itemError) {
          console.error(`Failed to write individual item to ${tableName}:`, itemError);
        }
      }
    }
  }
}

// Verify tables exist before attempting to seed data
async function verifyTableExists(tableName: string): Promise<boolean> {
  try {
    const dynamoDBClient = new AWS.DynamoDB({ region: process.env.REGION || 'us-east-1' });
    await dynamoDBClient.describeTable({ TableName: tableName }).promise();
    console.log(`Table ${tableName} exists`);
    return true;
  } catch (error) {
    console.error(`Error verifying table ${tableName}:`, error);
    return false;
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
    
    // Verify tables exist
    const itemsTableExists = await verifyTableExists(itemsTableName);
    const itemDetailsTableExists = await verifyTableExists(itemDetailsTableName);
    
    if (!itemsTableExists || !itemDetailsTableExists) {
      throw new Error('One or more tables do not exist');
    }
    
    // Add timestamps to items
    const timestampedItems = items.map(item => ({
      ...item,
      createdAt: new Date().toISOString()
    }));
    
    await processBatch(itemsTableName, timestampedItems);
    await processBatch(itemDetailsTableName, itemDetails);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Successfully seeded data',
        itemsCount: items.length,
        itemDetailsCount: itemDetails.length
      })
    };
  } catch (error) {
    console.error('Error seeding data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(error) })
    };
  }
};