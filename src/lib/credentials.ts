export type ManageCredentialsAction = 'fetch' | 'save' | 'unlock';

export type ManageCredentialsPayload = {
  action: ManageCredentialsAction;
  avatarId?: string | null;
  clientId?: string | null;
  userId?: string | null;
  credentials?: {
    accountId?: string;
    apiKey?: string;
    avatarExternalId?: string;
  };
};

export function buildManageCredentialsPayload(input: ManageCredentialsPayload) {
  const payload: ManageCredentialsPayload = {
    action: input.action,
    avatarId: input.avatarId ?? null,
  };

  if (input.clientId !== undefined) payload.clientId = input.clientId;
  if (input.userId !== undefined) payload.userId = input.userId;
  if (input.credentials !== undefined) payload.credentials = input.credentials;

  return payload;
}

export function isCredentialsConfigured(client?: { heygen_api_key?: string | null }) {
  return Boolean(client?.heygen_api_key && client.heygen_api_key.trim().length > 0);
}
