// items.ts
import { Item, ItemDetail } from "../shared/types";

export const items: Item[] = [
  {
    partitionKey: "1",
    sortKey: "Item1",
    name: "Item 1",
    description: "This is the first item",
    numericAttribute: 100,
    booleanAttribute: true,
  },
  {
    partitionKey: "2",
    sortKey: "Item2",
    name: "Item 2",
    description: "This is the second item",
    numericAttribute: 200,
    booleanAttribute: false,
  },
];

export const itemDetails: ItemDetail[] = [
  {
    itemId: "1",
    detailName: "Detail 1",
    detailType: "Type A",
  },
  {
    itemId: "2",
    detailName: "Detail 2",
    detailType: "Type B",
  },
];