export function activeMembershipWhere(userId: string) {
  return {
    userId,
    revokedAt: null,
  } as const;
}

export function membershipAccessLabel(revokedAt: Date | null) {
  return revokedAt ? "Access revoked" : "Access active";
}
