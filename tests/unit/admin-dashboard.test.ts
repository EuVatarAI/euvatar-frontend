import { describe, expect, it } from "vitest";

type AdminClient = { id: string; user_id: string | null; heygen_api_key: string | null };
type AvatarRow = { id: string; user_id: string | null };

// Mirrors AdminDashboard fetchClients logic after fix:
function mapClientsWithAvatars(clients: AdminClient[], avatars: AvatarRow[]) {
  return clients.map((client) => {
    const avatarCount = avatars.filter((row) => row.user_id === client.user_id).length;
    const hasCredentials = Boolean(client.heygen_api_key);
    return { ...client, avatar_count: avatarCount, has_credentials: hasCredentials };
  });
}

describe("AdminDashboard - credentials source", () => {
  it("flags has_credentials based only on admin_clients.heygen_api_key", () => {
    const clients: AdminClient[] = [
      { id: "c1", user_id: "u1", heygen_api_key: "key-123" },
      { id: "c2", user_id: "u2", heygen_api_key: null },
    ];
    const avatars: AvatarRow[] = [
      { id: "a1", user_id: "u1" },
      { id: "a2", user_id: "u2" },
    ];

    const result = mapClientsWithAvatars(clients, avatars);

    expect(result[0].has_credentials).toBe(true);
    expect(result[1].has_credentials).toBe(false);
    expect(result[0].avatar_count).toBe(1);
    expect(result[1].avatar_count).toBe(1);
  });
});
