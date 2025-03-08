// layer/nodejs/shared/utils.ts
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

export function createResponse(statusCode: number, body: any, cors: boolean = true) {
  const headers = cors 
    ? {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      }
    : { "Content-Type": "application/json" };

  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

export function handleError(error: any, message: string, isDevelopment: boolean = false) {
  console.error(`${message}:`, error);
  
  return createResponse(500, {
    error: message,
    details: isDevelopment ? String(error) : undefined
  });
}