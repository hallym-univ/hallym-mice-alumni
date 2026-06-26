-- 0013_withdrawn_profile_privacy_cleanup.sql : 기존 withdrawn 프로필의 식별정보 정리

with withdrawn_profiles as (
  select id
  from profiles
  where status = 'withdrawn'
)
delete from profile_tags
where profile_id in (select id from withdrawn_profiles);

with withdrawn_profiles as (
  select id
  from profiles
  where status = 'withdrawn'
)
delete from blocks
where blocker_profile_id in (select id from withdrawn_profiles)
   or blocked_profile_id in (select id from withdrawn_profiles);

with withdrawn_profiles as (
  select id
  from profiles
  where status = 'withdrawn'
)
delete from consents
where profile_id in (select id from withdrawn_profiles);

with withdrawn_profiles as (
  select id
  from profiles
  where status = 'withdrawn'
)
delete from admins
where profile_id in (select id from withdrawn_profiles);

with withdrawn_profiles as (
  select id
  from profiles
  where status = 'withdrawn'
)
delete from notifications
where profile_id in (select id from withdrawn_profiles);

update profiles
set
  name = '탈퇴한 회원',
  student_number = null,
  admission_year = null,
  graduation_year = null,
  department = null,
  organization = null,
  position = null,
  bio = null,
  career_summary = null,
  open_kakao_url = null,
  proposal_email_allowed = false,
  photo_path = null,
  coffeechat_status = 'private',
  is_public = false,
  deleted_at = coalesce(deleted_at, now()),
  anonymized_at = coalesce(anonymized_at, now()),
  updated_at = now(),
  field_visibility = '{}'::jsonb
where status = 'withdrawn';
