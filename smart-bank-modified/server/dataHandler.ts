
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export const loadCSV = (filename: string) => {
  const filePath = path.join(process.cwd(), "data", filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
};

export const saveCSV = (filename: string, data: any[]) => {
  const filePath = path.join(process.cwd(), "data", filename);
  const content = stringify(data, { header: true });
  fs.writeFileSync(filePath, content);
};
