import { gql, TypedDocumentNode } from "@apollo/client";

export type ParseSearchPromptMutation = {
  parseSearchPrompt: {
    jobTitle: string | null;
    location: string | null;
    remote: boolean | null;
    rawPrompt: string | null;
  };
};

export const PARSE_SEARCH_PROMPT: TypedDocumentNode<
  ParseSearchPromptMutation,
  { prompt: string }
> = gql`
  mutation ParseSearchPrompt($prompt: String!) {
    parseSearchPrompt(prompt: $prompt) {
      jobTitle
      location
      remote
      rawPrompt
    }
  }
`;

export type RunJobSearchMutation = {
  runJobSearch: {
    searchId: string;
    offers: Array<{
      id: string;
      title: string;
      company: string;
      location: string | null;
      url: string;
    }>;
  };
};

export type JobSearchInput = {
  jobTitle?: string | null;
  location?: string | null;
  remote?: boolean | null;
};

export const RUN_JOB_SEARCH: TypedDocumentNode<
  RunJobSearchMutation,
  { input: JobSearchInput }
> = gql`
  mutation RunJobSearch($input: JobSearchInput!) {
    runJobSearch(input: $input) {
      searchId
      offers {
        id
        title
        company
        location
        url
      }
    }
  }
`;