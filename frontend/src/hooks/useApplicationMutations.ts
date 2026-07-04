"use client";

import { useMutation } from "@apollo/client/react";
import {
  CREATE_APPLICATION,
  DELETE_APPLICATION,
  UPDATE_APPLICATION,
} from "@/graphql/mutations";
import { GET_APPLICATIONS, GET_APPLICATION_STATS } from "@/graphql/queries";
import {
  formToCreateInput,
  formToUpdateInput,
  gqlToApplication,
} from "@/lib/application-mapper";
import type { Application, ApplicationFormData } from "@/types";

const REFETCH = [{ query: GET_APPLICATIONS }, { query: GET_APPLICATION_STATS }];

export function useApplicationMutations() {
  const [createMut, { loading: creating }] = useMutation(CREATE_APPLICATION, {
    refetchQueries: REFETCH,
  });
  const [updateMut, { loading: updating }] = useMutation(UPDATE_APPLICATION, {
    refetchQueries: REFETCH,
  });
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_APPLICATION, {
    refetchQueries: REFETCH,
  });

  async function createApplication(
    data: ApplicationFormData,
  ): Promise<Application> {
    const { data: result } = await createMut({
      variables: { input: formToCreateInput(data) },
    });
    if (!result?.createApplication) throw new Error("Create failed");
    return gqlToApplication(result.createApplication);
  }

  async function updateApplication(
    id: number,
    data: Partial<ApplicationFormData>,
  ): Promise<Application> {
    const { data: result } = await updateMut({
      variables: { input: formToUpdateInput(id, data) },
    });
    if (!result?.updateApplication) throw new Error("Update failed");
    return gqlToApplication(result.updateApplication);
  }

  async function deleteApplication(id: number): Promise<void> {
    await deleteMut({ variables: { id: String(id) } });
  }

  return {
    createApplication,
    updateApplication,
    deleteApplication,
    loading: creating || updating || deleting,
  };
}
