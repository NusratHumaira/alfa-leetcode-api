import * as XLSX from 'xlsx';
import { Response, Request } from 'express';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import { LeetCodeResponse } from '../types';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhW0WdhfhQkGR3eLXJog9Z8ActeZmVaYtA1Tdl7b1TxKe_daVVQxYSAcAA6q72IdR-muQveHx6EAq0/pub?output=csv';

export const fetchProblemStatusAndGenerateCSV = async (req: Request, res: Response, query: string) => {
  const { problemName } = req.query;
  if (!problemName) {
    return res.status(400).json({ error: 'Missing problemName' });
  }

  try {

    const response = await fetch(SHEET_CSV_URL);
    const csvText = await response.text();


    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    const usernames = records.map((r: any) => r.Username || r.username); // depends on your csv headers

    const results: { username: string; solved: boolean }[] = [];

    for (const username of usernames) {
      const leetResponse = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://leetcode.com',
        },
        body: JSON.stringify({
          query,
          variables: {
            username,
            limit: 50,
          },
        }),
      });

      const leetResult = await leetResponse.json() as LeetCodeResponse;

      if (leetResult.errors) {
        results.push({ username, solved: false });
        continue;
      }

      const recentSubmissions = leetResult.data?.recentAcSubmissionList || [];
      const solved = recentSubmissions.some(
        (submission: any) =>
          submission?.titleSlug?.toLowerCase() === (problemName as string).toLowerCase()
      );

      results.push({ username, solved });
    }


    const updatedRecords = records.map((row: any) => {
      const userResult = results.find((r) => r.username === row.Username || r.username === row.username);
      return {
        ...row,
        [problemName as string]: userResult?.solved ? 'Solved' : 'Not Solved',
      };
    });

    const updatedWorksheet = XLSX.utils.json_to_sheet(updatedRecords);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, updatedWorksheet, 'Sheet1');


    const excelBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });


    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('updated_sheet.xlsx');
    return res.send(excelBuffer);

  } catch (err) {
    console.error('Error: ', err);
    return res.status(500).json({ error: 'Failed to process and generate Excel' });
  }
};

export default fetchProblemStatusAndGenerateCSV;
