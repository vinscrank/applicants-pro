import { gql, TypedDocumentNode } from "@apollo/client";
import { APPLICATION_FIELDS, type GqlApplication } from "@/graphql/queries";

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

export type CreateApplicationInput = {
  companyName: string;
  jobTitle: string;
  jobUrl?: string | null;
  companyWebsite?: string | null;
  companyLinkedinUrl?: string | null;
  location?: string | null;
  status?: string | null;
  priority?: string | null;
  remoteType?: string | null;
  applicationMethod?: string | null;
  applicationMethodOther?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  visaSponsorship?: boolean | null;
  taName?: string | null;
  taEmail?: string | null;
  taLinkedinUrl?: string | null;
  taPhone?: string | null;
  hiringManagerName?: string | null;
  hiringManagerLinkedinUrl?: string | null;
  linkedinConnectionSent?: boolean | null;
  linkedinMessageSent?: boolean | null;
  followUpDate?: string | null;
  lastContactDate?: string | null;
  responseReceivedAt?: string | null;
  interviewDate?: string | null;
  lastAppliedAt?: string | null;
  applicationSource?: string | null;
  linkedOfferId?: string | null;
  notes?: string | null;
};

export type CreateApplicationMutation = {
  createApplication: GqlApplication;
};

export const CREATE_APPLICATION: TypedDocumentNode<
  CreateApplicationMutation,
  { input: CreateApplicationInput }
> = gql`
  mutation CreateApplication($input: CreateApplicationInput!) {
    createApplication(input: $input) {
      ...ApplicationFields
    }
  }
  ${APPLICATION_FIELDS}
`;

export type UpdateApplicationInput = {
  id: string;
  companyName?: string | null;
  jobTitle?: string | null;
  jobUrl?: string | null;
  companyWebsite?: string | null;
  companyLinkedinUrl?: string | null;
  location?: string | null;
  status?: string | null;
  priority?: string | null;
  remoteType?: string | null;
  applicationMethod?: string | null;
  applicationMethodOther?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  visaSponsorship?: boolean | null;
  taName?: string | null;
  taEmail?: string | null;
  taLinkedinUrl?: string | null;
  taPhone?: string | null;
  hiringManagerName?: string | null;
  hiringManagerLinkedinUrl?: string | null;
  linkedinConnectionSent?: boolean | null;
  linkedinMessageSent?: boolean | null;
  followUpDate?: string | null;
  lastContactDate?: string | null;
  responseReceivedAt?: string | null;
  interviewDate?: string | null;
  lastAppliedAt?: string | null;
  applicationSource?: string | null;
  linkedOfferId?: string | null;
  notes?: string | null;
};

export type UpdateApplicationMutation = {
  updateApplication: GqlApplication;
};

export const UPDATE_APPLICATION: TypedDocumentNode<
  UpdateApplicationMutation,
  { input: UpdateApplicationInput }
> = gql`
  mutation UpdateApplication($input: UpdateApplicationInput!) {
    updateApplication(input: $input) {
      ...ApplicationFields
    }
  }
  ${APPLICATION_FIELDS}
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
