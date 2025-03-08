// lambdas/translateItem.ts
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, ReturnValue } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Item } from "/opt/nodejs/shared/types";
import { createResponse, handleError } from "/opt/nodejs/shared/utils";

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  console.log("Event received:", JSON.stringify(event, null, 2));
  
  try {
    const partitionKey = event.pathParameters?.partitionKey;
    const sortKey = event.pathParameters?.sortKey;
    const language = event.queryStringParameters?.language || "en"; // Default to English

    if (!partitionKey || !sortKey) {
      return createResponse(400, { error: "Missing partitionKey or sortKey" });
    }

    console.log(`Translating item with key: ${partitionKey}/${sortKey} to language: ${language}`);

    // Retrieve the item from DynamoDB
    const getParams = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        partitionKey,
        sortKey
      })
    };

    console.log("GetItem params:", JSON.stringify(getParams, null, 2));
    
    const { Item: item } = await dynamoClient.send(new GetItemCommand(getParams));
    
    if (!item) {
      return createResponse(404, { error: "Item not found" });
    }

    const unmarshalledItem = unmarshall(item) as Item;
    console.log("Retrieved item:", JSON.stringify(unmarshalledItem, null, 2));

    // Ensure translations property exists
    if (!unmarshalledItem.translations) {
      unmarshalledItem.translations = {};
    }

    // If translation already exists, return the item
    if (unmarshalledItem.translations[language]) {
      console.log(`Translation for ${language} already exists:`, unmarshalledItem.translations[language]);
      return createResponse(200, unmarshalledItem);
    }

    // If no description to translate, return error
    if (!unmarshalledItem.description) {
      return createResponse(400, { error: "Item has no description to translate" });
    }

    // Perform translation
    const translationParams = {
      Text: unmarshalledItem.description,
      SourceLanguageCode: "auto", // Auto-detect source language
      TargetLanguageCode: language
    };

    console.log("Translation params:", JSON.stringify(translationParams, null, 2));
    
    const translationResult = await translateClient.send(new TranslateTextCommand(translationParams));
    console.log("Translation result:", JSON.stringify(translationResult, null, 2));

    // Store translation result back in DynamoDB
    const translatedText = translationResult.TranslatedText;
    
    // Prepare attribute paths and values
    let updateExpression: string;
    const expressionAttributeNames: { [key: string]: string } = { "#translations": "translations" };
    const expressionAttributeValues: { [key: string]: any } = {};
    
    // Choose update expression based on whether translations map exists
    if (Object.keys(unmarshalledItem.translations).length === 0) {
      // If translations is empty, create a new map
      updateExpression = "SET #translations = :translations";
      expressionAttributeValues[":translations"] = { M: { [language]: { S: translatedText } } };
    } else {
      // If translations exists, add new translation
      updateExpression = "SET #translations.#language = :translatedText";
      expressionAttributeNames["#language"] = language;
      expressionAttributeValues[":translatedText"] = { S: translatedText };
    }

    // Update updatedAt timestamp
    updateExpression += ", #updatedAt = :updatedAt";
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = { S: new Date().toISOString() };

    const updateParams = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        partitionKey,
        sortKey
      }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: ReturnValue.ALL_NEW
    };

    console.log("UpdateItem params:", JSON.stringify(updateParams, null, 2));
    
    const updateResult = await dynamoClient.send(new UpdateItemCommand(updateParams));
    const updatedItem = unmarshall(updateResult.Attributes || {}) as Item;

    return createResponse(200, updatedItem);
  } catch (error) {
    return handleError(error, "Failed to translate item", process.env.NODE_ENV === 'development');
  }
};