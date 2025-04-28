import { Response } from 'express';
import { ProblemStatusOptions } from '../types';

const fetchProblemStatus = async (
  options: ProblemStatusOptions,
  res: Response,
  query: string
) => {
  try {
    //console.log('Fetching user details with options:', options);
    
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: query,
        variables: {
          username: options.username,
          limit: 100, 
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      return res.send(result);
    }

    const recentSubmissions = result.data?.recentAcSubmissionList || [];
    
    const solved = recentSubmissions.some(
      (submission: any) =>
        submission?.titleSlug &&
        submission.titleSlug.toLowerCase() === options.problemName.toLowerCase()
    );

    return res.json({ solved });
  } catch (err) {
    console.error('Error: ', err);
    return res.send(err);
  }
};

export default fetchProblemStatus;
