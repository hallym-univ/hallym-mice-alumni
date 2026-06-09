-- seed.sql : 최소 시드 (분야 태그 마스터 — §6.2 분야 태그)
-- 0001_init.sql 적용 후 실행한다. 멱등하게 작성(name unique 충돌 무시).

insert into tags (name, category) values
  -- 직무/분야 (MICE = Meeting/Incentive/Convention/Exhibition + 관광)
  ('컨벤션/국제회의', 'field'),
  ('전시/박람회', 'field'),
  ('이벤트/축제', 'field'),
  ('인센티브여행', 'field'),
  ('관광/여행', 'field'),
  ('호텔/숙박', 'field'),
  ('항공/운송', 'field'),
  ('PCO', 'field'),
  ('PEO', 'field'),
  ('DMC', 'field'),
  -- 직무
  ('기획', 'role'),
  ('운영', 'role'),
  ('마케팅', 'role'),
  ('영업', 'role'),
  ('디자인', 'role'),
  ('통역/번역', 'role'),
  ('연구/교육', 'role'),
  -- 관심사
  ('스타트업', 'interest'),
  ('공공기관', 'interest'),
  ('대기업', 'interest'),
  ('해외취업', 'interest'),
  ('대학원/유학', 'interest')
on conflict (name) do nothing;
