import { gql, TypedDocumentNode } from "@apollo/client";

export type GqlApplication = {
  id: string;
  companyName: string;
  jobTitle: string;
  status: string;
  priority: string | null;
  location: string | null;
  jobUrl: string | null;
  createdAt: string | null;
};

export type GetApplicationsQuery = {
  applications: GqlApplication[];
};

export const GET_APPLICATIONS: TypedDocumentNode<GetApplicationsQuery> = gql`
  query GetApplications {
    applications {
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

export type ApplicationStatsQuery = {
  applicationStats: {
    total: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
  };
};

export const GET_APPLICATION_STATS: TypedDocumentNode<ApplicationStatsQuery> = gql`
  query GetApplicationStats {
    applicationStats {
      total
      applied
      interview
      offer
      rejected
    }
  }
`;
