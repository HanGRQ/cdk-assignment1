export function generateBatch(items: any[]): any[] {
  console.log(`Generating batch for ${items?.length || 0} items`);
  
  if (!items || items.length === 0) {
    console.log("No items to process in generateBatch");
    return []; 
  }
  
  const result = items.map(item => ({
    PutRequest: {
      Item: item
    }
  }));
  
  console.log(`Successfully generated batch with ${result.length} put requests`);
  return result;
}