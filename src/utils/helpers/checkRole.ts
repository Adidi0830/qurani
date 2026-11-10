export const checkRole = (
  userId: string | number,
  group: {
    owner_id: string | number;
    grup_members: { role: "admin" | "member" | "owner"; user_id: string }[];
  } | null
): "owner" | "admin" | "member" | "none" => {
  if (!group) return "none";

  // Use String comparison to handle type mismatch (string vs number)
  if (String(userId) === String(group.owner_id)) {
    return "owner";
  }

  const member = group.grup_members.find((m) => String(m.user_id) === String(userId));
  if (member) {
    return member.role;
  }

  return "member";
};
