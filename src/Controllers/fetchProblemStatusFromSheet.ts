import { Response, Request } from 'express';
import { fetchUsernamesFromSheet } from '../FormatUtils/userData';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhW0WdhfhQkGR3eLXJog9Z8ActeZmVaYtA1Tdl7b1TxKe_daVVQxYSAcAA6q72IdR-muQveHx6EAq0/pub?output=csv';

export const fetchProblemStatusFromSheet = async (
  req: Request,
  res: Response,
  query: string
) => {

  const { problemName } = req.query;

  if (!problemName) {
    return res.status(400).json({ error: 'Missing problemName' });
  }

  try {
    const usernames = await fetchUsernamesFromSheet(SHEET_URL);
    //console.log('Fetching user names:', usernames);
    const results: { username: string; solved: boolean }[] = [];

    for (const username of usernames) {
      const response = await fetch('https://leetcode.com/graphql', {
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

      const result = await response.json();

      if (result.errors) {
        results.push({ username, solved: false });
        continue;
      }

      const recentSubmissions = result.data?.recentAcSubmissionList || [];
      const solved = recentSubmissions.some(
        (submission: any) =>
          submission?.titleSlug &&
          submission.titleSlug.toLowerCase() === (problemName as string).toLowerCase()
      );

      results.push({ username, solved });
    }

    return res.json({ results });
  } catch (err) {
    console.error('Error: ', err);
    return res.status(500).json({ error: 'Failed to fetch problem statuses' });
  }
};
export default fetchProblemStatusFromSheet;