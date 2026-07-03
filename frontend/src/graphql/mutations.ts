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

export type CreateApplicationMutation = {
  createApplication: {
    id: string;
    companyName: string;
    jobTitle: string;
    status: string;
    priority: string | null;
    location: string | null;
    jobUrl: string | null;
    createdAt: string | null;
  };
};

export type CreateApplicationInput = {
  companyName: string;
  jobTitle: string;
  jobUrl?: string | null;
  location?: string | null;
  status?: string | null;
  priority?: string | null;
};

export const CREATE_APPLICATION: TypedDocumentNode<
  CreateApplicationMutation,
  { input: CreateApplicationInput }
> = gql`
  mutation CreateApplication($input: CreateApplicationInput!) {
    createApplication(input: $input) {
      id
      companyName
      jobTitle
      status
      priority
      location
      jobUrl
      createdAt
    }
  }
`;

export type UpdateApplicationMutation = {
  updateApplication: {
    id: string;
    companyName: string;
    jobTitle: string;
    status: string;
    priority: string | null;
    location: string | null;
    jobUrl: string | null;
    createdAt: string | null;
  };
};

export type UpdateApplicationInput = {
  id: string;
  companyName?: string | null;
  jobTitle?: string | null;
  jobUrl?: string | null;
  location?: string | null;
  status?: string | null;
  priority?: string | null;
};

export const UPDATE_APPLICATION: TypedDocumentNode<
  UpdateApplicationMutation,
  { input: UpdateApplicationInput }
> = gql`
  mutation UpdateApplication($input: UpdateApplicationInput!) {
    updateApplication(input: $input) {
      id
      companyName
      jobTitle
      status
      priority
      location
      jobUrl
      createdAt
    }
  }
`;

export type DeleteApplicationMutation = {
  deleteApplication: boolean;
};

export const DELETE_APPLICATION: TypedDocumentNode<
  DeleteApplicationMutation,
  { id: string }
> = gql`
  mutation DeleteApplication($id: ID!) {
    deleteApplication(id: $id)
  }
`;
