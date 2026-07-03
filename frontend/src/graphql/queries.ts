import { gql, TypedDocumentNode } from "@apollo/client";

export type GetApplicationsQuery = {
  applications: Array<{
    id: string;
    companyName: string;
    jobTitle: string;
    status: string;
    priority: string | null;
    location: string | null;
    createdAt: string | null;
  }>;
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
      createdAt
    }
  }
`;
