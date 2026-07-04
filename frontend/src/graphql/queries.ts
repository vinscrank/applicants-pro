import { gql, TypedDocumentNode } from "@apollo/client";

export const APPLICATION_FIELDS = gql`
  fragment ApplicationFields on Application {
    id
    companyName
    jobTitle
    jobUrl
    companyWebsite
    companyLinkedinUrl
    location
    status
    priority
    remoteType
    applicationMethod
    applicationMethodOther
    salaryMin
    salaryMax
    salaryCurrency
    visaSponsorship
    taName
    taEmail
    taLinkedinUrl
    taPhone
    hiringManagerName
    hiringManagerLinkedinUrl
    linkedinConnectionSent
    linkedinMessageSent
    followUpDate
    lastContactDate
    responseReceivedAt
    interviewDate
    createdAt
    lastAppliedAt
    applicationSource
    linkedOfferId
    notes
    updatedAt
  }
`;

export type GqlApplication = {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  companyWebsite: string | null;
  companyLinkedinUrl: string | null;
  location: string | null;
  status: string;
  priority: string;
  remoteType: string | null;
  applicationMethod: string | null;
  applicationMethodOther: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  visaSponsorship: boolean | null;
  taName: string | null;
  taEmail: string | null;
  taLinkedinUrl: string | null;
  taPhone: string | null;
  hiringManagerName: string | null;
  hiringManagerLinkedinUrl: string | null;
  linkedinConnectionSent: boolean;
  linkedinMessageSent: boolean;
  followUpDate: string | null;
  lastContactDate: string | null;
  responseReceivedAt: string | null;
  interviewDate: string | null;
  createdAt: string;
  lastAppliedAt: string | null;
  applicationSource: string;
  linkedOfferId: string | null;
  notes: string | null;
  updatedAt: string;
};

export type GetApplicationsQuery = {
  applications: GqlApplication[];
};

export const GET_APPLICATIONS: TypedDocumentNode<GetApplicationsQuery> = gql`
  query GetApplications {
    applications {
      ...ApplicationFields
    }
  }
  ${APPLICATION_FIELDS}
`;

export type GetApplicationQuery = {
  application: GqlApplication | null;
};

export const GET_APPLICATION: TypedDocumentNode<
  GetApplicationQuery,
  { id: string }
> = gql`
  query GetApplication($id: ID!) {
    application(id: $id) {
      ...ApplicationFields
    }
  }
  ${APPLICATION_FIELDS}
`;

export type ApplicationStatsQuery = {
  applicationStats: {
    total: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
    followUpDue: number;
    linkedinPending: number;
    appliedToday: number;
    dailyAverage: number;
    byStatus: Array<{ status: string; count: number }>;
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
      followUpDue
      linkedinPending
      appliedToday
      dailyAverage
      byStatus {
        status
        count
      }
    }
  }
`;
