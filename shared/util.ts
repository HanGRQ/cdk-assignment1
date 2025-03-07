import { ApiResponse } from './types';

export const apiResponses = {
  _200: (body: any): ApiResponse => ({
    statusCode: 200,
    body: JSON.stringify(body)
  }),
  _400: (body: any): ApiResponse => ({
    statusCode: 400,
    body: JSON.stringify(body)
  }),
  _404: (body: any): ApiResponse => ({
    statusCode: 404,
    body: JSON.stringify(body)
  }),
  _500: (body: any): ApiResponse => ({
    statusCode: 500,
    body: JSON.stringify(body)
  })
};

export const validateRequiredFields = (data: any, fields: string[]): string | null => {
  const missing = fields.filter(field => !data[field]);
  return missing.length ? `Missing fields: ${missing.join(', ')}` : null;
};
