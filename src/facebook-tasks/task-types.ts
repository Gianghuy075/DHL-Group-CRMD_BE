// The 9 Facebook cross-interaction task types. Values must match the DB CHECK
// on facebook_tasks.task_type.
export const TASK_TYPE_IDS = [
  'like_post',
  'like_high_val',
  'like_multi',
  'like_page',
  'reaction_post',
  'reaction_comment',
  'follow_profile',
  'share_post',
  'join_group',
] as const;

export type TaskTypeId = (typeof TASK_TYPE_IDS)[number];
