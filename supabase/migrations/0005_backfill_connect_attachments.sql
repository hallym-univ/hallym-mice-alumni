-- 0005_backfill_connect_attachments.sql : 기존 커넥트 본문 내 관련 콘텐츠 링크를 첨부 필드로 보정

update posts
set
  external_url = substring(
    body from '관련 콘텐츠:[[:space:]]*(/(content|jobs|albums)/[0-9a-fA-F-]{36})'
  ),
  body = btrim(
    regexp_replace(
      body,
      '[[:space:]]*관련 콘텐츠:[[:space:]]*/(content|jobs|albums)/[0-9a-fA-F-]{36}[[:space:]]*$',
      ''
    )
  )
where external_url is null
  and body ~ '관련 콘텐츠:[[:space:]]*/(content|jobs|albums)/[0-9a-fA-F-]{36}[[:space:]]*$';
