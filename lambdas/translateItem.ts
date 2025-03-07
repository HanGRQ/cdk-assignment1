import { DynamoDBClient, GetItemCommand, UpdateItemCommand, ReturnValue } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Item } from "../shared/types";

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler = async (event: any) => {
  console.log("Event received:", JSON.stringify(event, null, 2));
  
  try {
    const partitionKey = event.pathParameters?.partitionKey;
    const sortKey = event.pathParameters?.sortKey;
    const language = event.queryStringParameters?.language || "en"; // 默认为英语

    if (!partitionKey || !sortKey) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Missing partitionKey or sortKey" })
      };
    }

    console.log(`Translating item with key: ${partitionKey}/${sortKey} to language: ${language}`);

    const getParams = {
      TableName: process.env.TABLE_NAME,
      Key: {
        partitionKey: { S: partitionKey },
        sortKey: { S: sortKey }
      }
    };

    console.log("GetItem params:", JSON.stringify(getParams, null, 2));
    
    const { Item: item } = await dynamoClient.send(new GetItemCommand(getParams));
    
    if (!item) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Item not found" })
      };
    }

    const unmarshalledItem = unmarshall(item) as Item;
    console.log("Retrieved item:", JSON.stringify(unmarshalledItem, null, 2));

    // 确保 translations 属性存在
    if (!unmarshalledItem.translations) {
      unmarshalledItem.translations = {};
    }

    // 如果已有该语言的翻译，直接返回
    if (unmarshalledItem.translations[language]) {
      console.log(`Translation for ${language} already exists:`, unmarshalledItem.translations[language]);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(unmarshalledItem)
      };
    }

    // 如果没有描述可供翻译，返回错误
    if (!unmarshalledItem.description) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Item has no description to translate" })
      };
    }

    // 进行翻译
    const translationParams = {
      Text: unmarshalledItem.description,
      SourceLanguageCode: "auto",
      TargetLanguageCode: language
    };

    console.log("Translation params:", JSON.stringify(translationParams, null, 2));
    
    const translationResult = await translateClient.send(new TranslateTextCommand(translationParams));
    console.log("Translation result:", JSON.stringify(translationResult, null, 2));

    // 将翻译结果存储回DynamoDB
    const translatedText = translationResult.TranslatedText;
    
    // 准备 attributes 路径和值
    const expressionAttributeNames: { [key: string]: string } = { "#translations": "translations" };
    const expressionAttributeValues: { [key: string]: any } = {};
    
    let updateExpression: string;
    
    // 根据translations是否为空选择不同的更新表达式
    if (Object.keys(unmarshalledItem.translations).length === 0) {
      // 如果translations为空，创建一个新的map
      updateExpression = "SET #translations = :translations";
      expressionAttributeValues[":translations"] = { M: { [language]: { S: translatedText } } };
    } else {
      // 如果translations已存在，添加新的翻译
      updateExpression = "SET #translations.#language = :translatedText";
      expressionAttributeNames["#language"] = language;
      expressionAttributeValues[":translatedText"] = { S: translatedText };
    }

    const updateParams = {
      TableName: process.env.TABLE_NAME,
      Key: {
        partitionKey: { S: partitionKey },
        sortKey: { S: sortKey }
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: ReturnValue.ALL_NEW  // 修改这里，使用枚举值而不是字符串
    };

    console.log("UpdateItem params:", JSON.stringify(updateParams, null, 2));
    
    const updateResult = await dynamoClient.send(new UpdateItemCommand(updateParams));
    const updatedItem = unmarshall(updateResult.Attributes || {}) as Item;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(updatedItem)
    };
  } catch (error) {
    console.error("Error translating item:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: "Failed to translate item",
        details: String(error)
      })
    };
  }
};