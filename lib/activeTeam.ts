/** The dashboard shows this team when the account belongs to several.
 * Stored as a plain cookie; the server always validates it against the
 * user's actual memberships, so a stale or forged value falls back
 * harmlessly to the first team. */

export const ACTIVE_TEAM_COOKIE = "active_team";

export function setActiveTeam(teamId: string) {
  document.cookie = `${ACTIVE_TEAM_COOKIE}=${teamId}; path=/; max-age=31536000; SameSite=Lax`;
}
