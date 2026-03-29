// lib/members/members.select.ts
export const MEMBER_WITH_PROFILE_SELECT = `
  id, family_id, profile_id, role, nickname, avatar_url, joined_at, points, kid_mode_pin,
  color:color_palette(name, hex),
  profile:profiles(id, first_name, last_name, gender, avatar_url, birth_date)
`;
