import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Response, Request } from 'express';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import { LeetCodeResponse } from '../types';
import 'dotenv/config';
//import fs from 'fs';

const SHEET_ID = '1hTW1JnpOIWWSr51bJzekJrc5wEUbh0a0y9ijrDdavjw'; // extract from the URL
const SHEET_RANGE = 'Sheet1'; // or specify a range like "Sheet1!A1:Z1000"

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL!,
  key: process.env.GOOGLE_PRIVATE_KEY!,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export const fetchProblemStatusAndGenerateCSV = async (req: Request, res: Response, query: string) => {
  const { problemName } = req.query;
  if (!problemName) {
    return res.status(400).json({ error: 'Missing problemName' });
  }

  try {
    // Step 1: Fetch original CSV
    const csvResponse = await fetch(`https://docs.google.com/spreadsheets/d/e/2PACX-1vQhW0WdhfhQkGR3eLXJog9Z8ActeZmVaYtA1Tdl7b1TxKe_daVVQxYSAcAA6q72IdR-muQveHx6EAq0/pub?output=csv`);
    const csvText = await csvResponse.text();
    const records = parse(csvText, { columns: true, skip_empty_lines: true });

    const usernames = records.map((r: any) => r.Username || r.username);

    const results: { username: string; solved: boolean }[] = [];

    for (const username of usernames) {
      const leetRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://leetcode.com',
        },
        body: JSON.stringify({
          query,
          variables: { username, limit: 50 },
        }),
      });

      const data = await leetRes.json() as LeetCodeResponse;

      const recent = data.data?.recentAcSubmissionList || [];
      const solved = recent.some(
        (s: any) => s?.titleSlug?.toLowerCase() === (problemName as string).toLowerCase()
      );

      results.push({ username, solved });
    }

    // Step 2: Update records
    const updatedRecords = records.map((row: any) => {
      const userResult = results.find((r) => r.username === row.Username || r.username === row.username);
      return {
        ...row,
        [problemName as string]: userResult?.solved ? 'Solved' : 'Not Solved',
      };
    });

    // Step 3: Convert to 2D array for Sheets API
    const headers = Object.keys(updatedRecords[0]);
    const values = [headers, ...updatedRecords.map(Object.values)];

    // Step 4: Write to Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return res.json({ success: true, updated: updatedRecords.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update sheet' });
  }
};
export default fetchProblemStatusAndGenerateCSV;