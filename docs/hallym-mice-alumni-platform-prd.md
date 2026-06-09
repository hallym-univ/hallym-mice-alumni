# 한림대 MICE 동문 플랫폼 구현 기획서

문서 버전: v2.4  
작성일: 2026-06-08 (PM 결정 반영 누적 개정)  
작성 관점: 시니어 PM / 테크리드 — "비개발 학생팀이 실제로 6주 안에 구현하고, 매 학기 교체되는 운영진에게 인수인계 가능한가"를 모든 결정의 최종 판정 기준으로 삼는다.

---

## 0. 변경 요약 (v1 → v2 핵심 결정)

이전 버전(v1)을 다음과 같이 개정했다. 방향 자체는 좋았으나, 보안 모델·범위·인증·법무 준비에서 실제로 구현/운영/인수인계가 막히는 지점이 있어 다섯 가지를 못 박는다.

1. **보안 모델 전환(심층 방어).** v1의 "RLS 끄고 서버에서만 통제"를 폐기한다. v2는 **"모든 테이블 RLS ENABLE + 정책 없음(deny-all) 기본 + 서버 service_role 단일 접근 경로 + 핸들러 첫 줄 requireXxx 2차 검증"**을 유일한 기본값으로 확정한다. RLS는 사람이 핸들러 권한 검사를 빠뜨려도 PII가 새지 않게 하는 공짜 안전망으로만 쓴다.
2. **단계 출시.** v1의 "6주 6도메인 일괄 빌드"를 폐기한다. **Phase 1(Core: 로그인/가입 + 프로필 디렉토리/검색 + 커피챗/제안 + 관리자 최소셋)**을 먼저 완결하고, 구인구직(Phase 2)·콘텐츠(Phase 3)는 사용량 신호를 본 뒤 진행한다. **갤러리(운영자 큐레이션 앨범)는 Phase 1.5로 복원**하고, 자동 통계 대시보드·뉴스레터 아카이브 페이지는 v1 범위에서 컷하고 외부 도구로 대체한다.
3. **개방형 회원제 — 검증 게이트 폐지.** "메모 + 관리자 직감"도, "점진적 신뢰 2단계"도 폐기한다. **가입 = 회원 = 즉시 풀 사용**이며, 추천·시드·승인·심사 큐 같은 검증 관문이 없다. 가입(Google OAuth) + 가입정보 + 동의를 마치면 누구나 `status='active'`인 회원이 되어 디렉토리 풀 열람·커피챗·프로필 작성이 가능하다. **안전은 사후 모더레이션(신고 → 검토 → 숨김/정지/차단) + 오픈카톡 URL은 본인이 등록·공개 여부를 정하며, 공개 시 회원에게 바로 표시(커피챗=직접 링크). 제안 이메일만 서버 중계로 보호**한다. **"인증 배지"(`is_verified`)는 학교 명부를 확보하면 일치 가입자에게 자동 부여하는 선택적·비차단 정보 표식**일 뿐, 접근 제어에 쓰지 않는다(v1에선 사용 안 함).
4. **PIPA를 기능으로 구현.** "문서 4종 작성"이라는 추상 요구를 가입 동의 UI + `consents` 기록 + 탈퇴/파기 기능 + 처리방침 빈칸-채우기 템플릿으로 구체화한다.
5. **운영 가능성 보강(무료 전제).** 트랜잭션 메일(Resend) + 앱 내 상태 배너 1차/이메일 보조, **예산 0원 확정 → 무료 티어 출시를 기본**으로 하되 무료의 두 지뢰를 설계로 해결한다(Vercel은 호스트 이식성, Supabase는 pause 방지 핑 — §9.2). 환경 분리·백업/복구 리허설·시크릿 로테이션·소유권 매트릭스·런북을 추가한다.

> v1에서 칭찬받은 강점은 그대로 살린다: 외부 도구 위임 원칙, 프로필 중심 정보구조, service_role 서버 격리, 관리자 화면 + admin_logs, soft delete, 개인정보 최소 수집, 의존성 기반 티켓 백로그, 프롬프트 템플릿, 인수인계 체크리스트.

**추가 확정(2026-06-08, PM 결정 반영 — v2.4):**
- **오픈카톡 직접 공개 + 커피챗 단순화(v2.4):** 오픈카톡 URL은 등록자가 (a)등록 여부와 (b)공개 여부를 직접 정하므로, 커피챗 수락 게이트 없이 공개 시 회원에게 바로 노출한다(오픈카톡은 언제든 닫을 수 있는 오픈채팅 링크라 위험이 낮다). 이에 따라 구조화된 커피챗 요청/수락/거절 플로우는 제거하고 "오픈카톡 직접 링크" 모델로 단순화한다. 커피챗 = 공개된 오픈카톡 직접 클릭(요청/수락/거절 단계 없음). 제안 이메일만 서버 중계로 보호(§6.3, §8.2). 외부 파트너는 여전히 오픈카톡 비열람(차등 유지).
- **개방형 회원제:** 가입 = 회원(`status='active'`) = 즉시 풀 사용. 검증 게이트(추천/시드/2단계/심사 큐) 없음. 안전은 사후 모더레이션 + 오픈카톡 본인 공개 설정(§6.1b). 검증을 추천 기반으로 깔았기 때문에 필요했던 추천·시드·2단계·수동 심사·teaser는 게이트 폐지와 함께 사라진다.
- **갤러리 복원:** 사용자 자유 업로드 없이 운영자 큐레이션 앨범으로 Phase 1.5에 복원(§6.5, 행사 사진 게시 동의/삭제 절차 포함).
- **이미지 스토리지 = Cloudflare R2(처음부터):** 무료 10GB·egress 0, 모든 이미지 I/O는 `lib/storage` 어댑터 경유(§9.2). Supabase는 DB/Auth 전용.

---

## 1. 결론

이 프로젝트는 기능별 실험 서비스가 아니라, 처음부터 **하나의 통합 코드베이스·통합 데이터베이스·통합 관리자 시스템**으로 만든다. 단, **빌드와 출시는 단계적으로** 한다. 통합 철학(코드 1개)과 단계 출시(출시 순서만 분리)는 충돌하지 않는다.

"전부 직접 개발"은 하지 않는다. 동문 데이터와 권한이 필요한 핵심 기능은 직접 만들고, 채팅·뉴스레터 발송·영상 호스팅·결제처럼 유지보수 비용이 큰 기능은 외부 도구로 연결한다. 이것이 비개발 학생팀이 AI로 구현하고 다음 기수에게 인수인계할 수 있는 가장 현실적인 방식이다. 외부 도구 위임은 후퇴가 아니라 **유지 가능한 제품을 만들기 위한 전략**이다.

제품의 중심은 커뮤니티 게시판이 아니라 **실명 기반 동문 프로필**이다.

> 한림대 MICE 동문 플랫폼은 단톡방·교수 추천으로 알음알음 모인 동문을 찾고, 커피챗·제안·채용·콘텐츠로 연결되는 실명 기반 동문 커뮤니티 운영 시스템이다(가입=회원, 안전은 사후 모더레이션).

v2가 v1에 더하는 두 가지 못은 다음이다.
- **보안은 사람의 규율(40개 핸들러 누락 0건)이 아니라 DB가 강제하는 안전망(RLS deny-all)에 둔다.** 학생팀이 실수해도 실명·직장·학번이 새지 않는 것이 기본값이다.
- **6주에 6도메인을 동시에 만들지 않는다.** Core를 먼저 완결해 핵심 가치(동문 디렉토리 → 커피챗 연결)를 끝까지 닫고, 나머지는 실제 사용 신호를 보고 붙인다.

---

## 2. 제품 목표

### 2.1 비즈니스 목표

1. 한림대 MICE(컨벤션/전시/이벤트/관광) 계열 재학생, 졸업생, 동문 기업을 하나의 신뢰 네트워크로 묶는다.
2. 재학생에게는 진로·취업·실무 조언을 얻는 연결 통로를 제공한다.
3. 현직 동문에게는 업계 네트워크, 사업 제안, 채용 후보 탐색, 후배 지원의 접점을 제공한다.
4. 기업 대표·채용 담당자에게는 검증된 인재와 동문 기반 협업 기회를 제공한다.
5. 학교·동문회 운영진에게는 동문 DB·콘텐츠·채용 정보·행사 기록을 유지할 수 있는 운영 인프라를 제공한다.

### 2.2 제품 성공 기준 (비율·리텐션·연결 성사)

v1의 "분모 없는 절대치"를 비율·리텐션·연결 성사 지표로 교체한다. 절대 클릭 수만으로는 서비스 건강도를 판단할 수 없다.

**프로필 완성의 정의(전 문서 동일 적용):** 사진 + 회사 + 직무 + 분야 태그 + 커피챗 상태가 모두 채워진 상태. 단, 커피챗 상태가 "가능/월 1회 가능/제안만 가능" 중 하나면 오픈카톡 URL이 추가로 필수다(연락 경로 없는 "가능"은 완성으로 보지 않는다).

| 구분 | 지표 | 목표(초기 3개월) | 측정 방법 |
| --- | --- | --- | --- |
| 규모 | 활성 회원 수 | 80명 이상(무료 한도·유료 전환 검토 트리거 겸용) | `profiles.status='active'` count |
| 활성 | WAU(주간 활성 사용자) | 30명 이상 | 주간 고유 로그인 사용자(events 기반) |
| 리텐션 | 7일 재방문율 | 35% 이상 | 가입 후 7일 내 재로그인 코호트 비율 |
| 리텐션 | 28일 재방문율 | 20% 이상 | 가입 후 28일 내 재로그인 코호트 비율 |
| 핵심 가치 | 프로필 완성률 | 활성 회원의 60% 이상 | 위 "완성 정의" 충족 비율 |
| 연결(비율) | WAU 대비 커피챗 클릭률 | 주간 15% 이상 | `coffeechat_click` 고유 사용자 / WAU |
| 연결 성사 | 커피챗 실제 성사 | 월 5건 이상(정성) | 클릭 후 1탭 설문 "연락했나요?" 셀프 카운터 |
| 운영 | 관리자 주간 운영 시간 | 주 3시간 이하 | 운영 로그 기록 |

> 북극성 지표는 "실제 연결 성사"다. 자동 측정이 불가능하므로, 커피챗 버튼 클릭 직후 가벼운 1탭 설문(예/아니오/나중에)으로 정성 회수한다. 강제하지 않고 건너뛸 수 있게 한다.

### 2.3 핵심 문제와 해법

| 문제 | 제품적 해법 |
| --- | --- |
| 동문이 어디서 무엇을 하는지 모른다 | 실명 기반 프로필 디렉토리와 검색 |
| 모르는 선후배에게 연락하기 부담스럽다 | 커피챗 가능 상태 + 오픈카톡 직접 연결(본인 공개 설정) + 제안 이메일(서버 중계) |
| 비동문 사칭·악성 사용자가 섞일 수 있다 | 커뮤니티 초대 경로(단톡방·교수 추천) + 사후 모더레이션(신고/숨김/정지/차단) + (선택)인증 배지 |
| MICE 업계 채용이 추천·상시 채용 중심이다 | 동문 기반 구인구직/기회 게시판(Phase 2) |
| 기존 카톡방 정보가 흘러가고 검색되지 않는다 | 플랫폼 내 구조화된 공고·콘텐츠 |
| 운영 주체가 불명확하면 플랫폼이 방치된다 | 관리자 화면, 운영 로그, 주간 루틴, 인수인계 매트릭스 |
| 비개발 학생들이 유지보수해야 한다 | 단일 스택, RLS 안전망, 외부 도구 위임, 빈칸-채우기 문서 |
| 학생이 실수해도 PII가 새면 안 된다 | RLS deny-all 안전망 + 서버 service_role 단일 경로 |

---

## 3. 제품 원칙

### 3.1 반드시 지킬 원칙

1. 모바일 우선으로 만든다(기준 폭 375px).
2. 프로필을 모든 기능의 중심 데이터로 둔다. 부가 기능은 프로필에 연결한다.
3. 내부 채팅은 만들지 않고 오픈카톡 링크로 연결한다.
4. 영상 직접 업로드는 만들지 않고 YouTube 링크 임베드로 처리한다.
5. 뉴스레터 발송 시스템은 만들지 않고 Stibee/Maily/Google Form 외부 도구로 연결한다.
6. 결제 시스템은 만들지 않고 계좌 안내 또는 외부 결제 링크로 처리한다.
7. **개인정보가 결합되므로(실명+직장+학번/졸업연도) 모든 테이블에 RLS를 ENABLE하고(정책 없음 = deny-all 안전망), 데이터 접근은 서버 service_role 단일 경로로만 하며, 핸들러 첫 줄에서 requireXxx로 2차 검증한다.** (v1의 "RLS 대신 서버"를 "RLS와 함께 서버"로 교체. §7.4 참조)
8. Supabase 콘솔을 운영자가 직접 만지지 않도록 관리자 화면을 만든다.
9. AI가 코드를 생성하더라도 모든 기능은 명확한 완료 기준을 통과해야 한다.
10. 다음 기수가 이어받도록 README, 운영 매뉴얼, 환경변수 목록, 확정 DB 스키마, 보안 1페이지(security.md), 소유권/시크릿 매트릭스를 남긴다.
11. 외부 URL은 https만 허용하고, 오픈카톡은 `open.kakao.com` 화이트리스트, 영상은 YouTube videoId만 저장한다.

### 3.2 만들지 않을 것 (v1 컷 포함)

| 제외 기능 | 제외 이유 | 대체 방식 |
| --- | --- | --- |
| 자체 1:1 채팅 | 알림·신고·보관·개인정보 부담 | 오픈카톡 링크 |
| 자체 푸시 알림 | 앱/토큰/권한 관리 필요 | 이메일(Resend) + 앱 내 상태 배너 + 카톡방 공지 |
| 네이티브 앱 | 심사·버전·OS 대응 부담 | 모바일 웹 |
| 영상 직접 업로드 | 스토리지/트랜스코딩 비용 | YouTube 임베드(videoId만 저장) |
| 추천 알고리즘 | 초기 데이터 부족, 복잡도 큼 | 검색/필터/운영자 큐레이션 핀 |
| 전자결제 | 법무/정산/환불/보안 부담 | 계좌 안내 또는 외부 결제 링크 |
| LMS/과제 제출 | 핵심 행동과 거리 멂 | 필요 시 외부 LMS 링크 |
| **사용자 자유 이미지 업로드(갤러리)** | **사용자 자유 업로드는 검수·초상권·악성 콘텐츠 부담이 큼** | **갤러리는 운영자 큐레이션(앨범)으로만 운영(§6.5). 회원 자유 업로드는 안 함** |
| **자동 통계 대시보드** | **v1에 만들 여력 없음** | **Supabase 콘솔 저장 쿼리 또는 주1회 수기 집계** |
| **뉴스레터 아카이브 페이지** | **외부 도구가 이미 제공** | **Stibee 공개 아카이브 링크** |

> **갤러리 원칙:** 갤러리/아카이브 기능 자체는 만든다(Phase 1.5, §6.5). 단 **사용자 자유 업로드는 하지 않고 운영자(admin/콘텐츠 담당)가 큐레이션한 앨범만** 게시한다. 이미지는 Cloudflare R2(§9.2)에 저장한다.

---

## 4. 사용자 정의

### 4.1 재학생
- 목표: 선배 직무 경험 파악, 인턴/취업/프로젝트 기회 탐색, 부담 없는 선배 연락.
- 필요 기능: 동문 검색, 프로필 상세, 오픈카톡 직접 연결(공개 시)·제안 이메일, 구인구직(Phase 2), 콘텐츠(Phase 3).

### 4.2 일반 현직 동문
- 목표: 소속·전문성 노출, 업계 동문 연결, 후배 지원, 이직/협업 정보.
- 필요 기능: 내 프로필 관리, 필드별 공개 토글, 커피챗 상태 설정, 공고 제보(Phase 2), 동문 검색.

### 4.3 기업 대표/채용 담당자/시니어 동문
- 목표: 검증된 후배·인재 탐색, 회사·프로젝트 홍보, 산학 협업 탐색.
- 필요 기능: 동문/학생 검색, 공고 등록(Phase 2), 태그 필터, 제안 보내기.

### 4.4 외부 파트너 (역할: partner)
- 동문은 아니나 협업 관계인 사용자. **디렉토리 열람 범위를 제한한다.** 외부 파트너는 동문 연락처(오픈카톡 URL)를 열람할 수 없고, 검색·프로필 요약까지만 본다. 오픈카톡 비열람, 연락은 제안 서버 중계 폼만 가능.

### 4.5 학교/동문회 운영진
- 목표: 동문 DB 유지, 회원 정보 보호, 채용·콘텐츠 관리, 운영자 교체에도 플랫폼 유지.
- 필요 기능: 신고 처리, 프로필 숨김/정지(suspend)/차단, 공고 관리(Phase 2), 콘텐츠 관리(Phase 3), 기본 통계(콘솔 쿼리), 관리자 로그.

---

## 5. 정보 구조

### 5.1 하단 탭 (3탭으로 단순화)

Phase 1 출시 시 하단 탭은 3개로 시작한다. 구인구직/콘텐츠는 해당 Phase에서 탭으로 승격한다.

1. 홈 (추천 동문 + 본인 관련 신호)
2. 동문 (디렉토리/검색 — 핵심)
3. 내 정보 (프로필/계정/공개 범위/탈퇴)

> 하단 탭은 3개를 유지한다. 커피챗은 별도 탭 없이 프로필 상세에서 오픈카톡 직접 연결(공개 시) 또는 제안 이메일(서버 중계)로 처리한다. **갤러리(Phase 1.5)는 별도 하단 탭을 만들지 않고 홈의 "행사 기록" 진입점으로 연다**(Phase 3에 콘텐츠 탭이 생기면 그 하위로 승격 가능). Phase 2 진입 시 "기회" 탭 추가, Phase 3 진입 시 "콘텐츠" 탭 추가. 관리자는 "내 정보"에서 관리자 화면으로 진입한다.

### 5.2 페이지 구조

| 영역 | 페이지 | Phase |
| --- | --- | --- |
| 공개 | 랜딩, 로그인, 이용약관, 개인정보 처리방침 | 1 |
| 인증 | Google 로그인, 가입 정보 입력(+동의) → 바로 홈 | 1 |
| 홈 | 추천 동문, 본인 관련 신호(내 프로필 조회수/우리 기수 신규) | 1 |
| 동문 | 프로필 목록, 검색/필터, 프로필 상세, 내 프로필 수정 | 1 |
| 내 정보 | 내 프로필, 계정 설정, 필드별 공개 범위, **계정 비공개/탈퇴** | 1 |
| 관리자 | 신고/회원 관리, (공고/콘텐츠는 Phase 추가) | 1 |
| 갤러리 | 앨범 목록, 앨범 상세(이미지 그리드 + YouTube 임베드) — 회원 열람 | 1.5 |
| 기회 | 구인구직 목록, 상세, 공고 등록, 북마크 | 2 |
| 콘텐츠 | 인터뷰 목록, 상세, 뉴스레터 구독 링크 | 3 |

---

## 6. 기능 요구사항

### 6.1 인증 (OAuth)

목표: 로그인 수단을 단순화한다. 가입을 마치면 곧바로 회원이 된다(별도 검증 게이트 없음 — §6.1b).

요구사항:
1. Google OAuth 로그인만 제공한다. 이메일/비밀번호 가입은 제공하지 않는다.
2. 최초 로그인 후 가입 정보 입력 화면(§6.1c 동의 포함)으로 보낸다.
3. 로그인은 Supabase Auth가 처리하고, 세션은 쿠키(ssr) 기반으로 유지한다.

완료 기준:
- 비로그인 사용자가 내부 페이지 접근 시 로그인 화면으로 이동한다.
- 로그인 직후 프로필 미생성 사용자는 가입 정보 입력 화면으로 이동한다.
- **프로필 생성(필수 필드+동의) 직후 즉시 회원(status='active')이 되어 디렉토리 풀 열람·커피챗·프로필 작성이 가능하다(별도 승인/대기/심사 없음).**

### 6.1b 동문 정체성과 신뢰 (검증 게이트 없음)

목표: "실명 기반 동문 커뮤니티"라는 정체성을 지키되, **v1은 검증 게이트를 두지 않는다.** 가입 = 회원 = 즉시 풀 사용이다. 추천·시드·2단계·수동 심사 큐는 "검증을 추천 기반으로 깔았기 때문"에 필요했던 장치이므로, 검증 게이트를 폐지하면 함께 사라진다.

신뢰는 세 가지로 확보한다.
- **커뮤니티 초대 경로:** 출시 시 단톡방·교수 추천 등으로 초대 링크를 배포해 알음알음 가입을 유도한다(§17).
- **사후 모더레이션:** 신고 → 운영자 검토 → 숨김/정지(suspend)/차단(block)(§6.7). 비동문 사칭이 의심되면 이 경로로 대응한다.
- **오픈카톡 본인 공개 설정:** 오픈카톡 URL은 본인이 등록·공개 여부를 정하며, **공개 시 회원에게 직접 표시**(제안 이메일만 서버 중계 — §6.3).

**접근 등급(개방형 회원제):**

| 등급 | 판정 | 가능 |
| --- | --- | --- |
| **비로그인(guest)** | 미로그인 | 랜딩·로그인만 |
| **회원(member)** | Google 로그인 + 가입정보 + 동의 완료 "즉시"(status='active', not suspended) | 디렉토리 풀 열람(각 프로필 `field_visibility` 존중), 프로필 작성/수정, 콘텐츠·갤러리 열람, 신고 접수. 오픈카톡 URL은 등록자 공개 설정 시 직접 표시(커피챗=직접 링크), 그 외엔 제안 이메일 서버 중계 |
| **외부 파트너(role='partner')** | status='active', 기존 차등 유지 | 이름·회사·직무 요약, 제안 서버 중계 폼. 연락처(오픈카톡) 불가 |
| **관리자(admin)** | admins/부트스트랩 | 전체 |
| **suspended / withdrawn** | 정지 / 탈퇴 | 차단 / 탈퇴·익명화 |

**인증 배지(`is_verified`, 선택적·비차단):** 학교 명부(학번+이름)를 확보하면, 일치하는 가입자에게 `is_verified=true` 배지를 **자동 부여**할 수 있는 선택적 기능이다. **접근 제어에 사용하지 않으며**(배지가 없어도 평범한 회원으로 풀 사용 가능), 프로필 카드에 정보용 표식으로만 노출한다. v1에선 `verification_roster` 테이블이 비어 있고 사용하지 않는다(기본 `is_verified=false`).

- **학교 이메일(@hallym.ac.kr)은 재학생 보조 식별만.** 졸업생은 메일이 만료되므로 주 식별 수단으로 쓰지 않는다.
- 오픈카톡 URL은 본인이 등록·공개 여부를 정하며, 공개 시 회원에게 직접 표시한다(파트너 제외 — §8.2).

완료 기준:
- 가입 완료 즉시 회원(status='active')이 되어 디렉토리 풀 열람·커피챗·프로필 작성이 가능하다(승인/대기/심사 없음).
- 오픈카톡 URL은 본인 공개 설정 시 회원에게 직접 표시되고, 비공개거나 없으면 제안 이메일(서버 중계)로 연락한다(파트너는 오픈카톡 비열람).
- 신고 → 검토 → 숨김/정지/차단의 사후 모더레이션이 동작한다(§6.7).

### 6.1c 가입 동의 수집 (PIPA)

목표: PIPA가 강제하는 동의 입증·열람·삭제·파기를 **제품 기능**으로 구현한다. footer의 처리방침 링크만으로는 동의 입증이 불가능하다.

가입 정보 입력 화면(T-101)에서 **회원가입 트랜잭션과 동일하게** 동의를 수집·기록한다. 분리 체크박스 3개:

| 체크박스 | 필수 | 고지 내용 |
| --- | --- | --- |
| 이용약관 동의 | 필수 | 스크롤 노출 |
| 개인정보 수집·이용 동의 | 필수 | 항목(이름·이메일·소속·직무·학번/졸업연도), 목적(동문 디렉토리·매칭), 보유기간(탈퇴 시까지), 거부 시 불이익(서비스 이용 제한) 명시 |
| 프로필을 회원에게 공개 동의 | 필수 | 공개 대상(다른 회원)·범위 명시 |

- 약관·처리방침을 동의 화면에서 **읽을 수 있게 스크롤 노출**한다.
- `consents` 테이블에 (profile_id, doc_type, doc_version, agreed_at)을 기록해 동의 시점·버전을 입증한다.
- **만 14세 미만 정책 1줄:** 본 서비스는 만 14세 이상만 가입 가능(대학 동문 특성상 사실상 전원 충족). 가입 동의 화면에 1줄 명시.

완료 기준:
- 3개 필수 체크 없이는 가입 완료 불가.
- 동의 시점·문서 버전이 `consents`에 저장된다.
- 처리방침 버전 변경 시 새 버전으로 재동의를 받을 수 있는 구조다(doc_version 분리).

### 6.2 프로필/디렉토리

목표: 관심 회사·직무·분야·졸업연도 기준으로 동문을 찾고 연락한다.

**2단계 가입 퍼널(이탈 방어):**
- **1단계(가입 최소 필드):** 이름 / 역할 / 졸업연도(또는 학번) / 학과. → 제출 + 동의 즉시 회원(active)이 되어 디렉토리 풀 열람.
- **2단계(프로필 완성, 진행률 바):** 회사·직무·분야 태그·사진·소개·커피챗 상태·오픈카톡 URL. **회사 필수를 완화**한다(재학생/구직중 상태 허용 → 빈 회사 대신 "재학생"/"구직중" 선택).

프로필 필드:

| 필드 | 1단계/2단계 | 필수 | 공개 범위(기본) | 필드별 공개 토글 |
| --- | --- | --- | --- | --- |
| 이름 | 1 | 필수 | 회원 | 불가(항상 공개) |
| 역할 | 1 | 필수 | 회원 | 불가 |
| 입학/졸업연도 | 1 | 필수 | 회원 | 가능 |
| 학과/전공 | 1 | 필수 | 회원 | 가능 |
| 프로필 사진 | 2 | 선택 | 회원 | 가능 |
| 회사/기관 | 2 | 선택(재학/구직 허용) | 회원 | 가능 |
| 직무 | 2 | 선택 | 회원 | 가능 |
| 분야 태그 | 2 | 선택(권장) | 회원 | 불가 |
| 한 줄 소개 | 2 | 선택 | 회원 | 가능 |
| 경력 요약 | 2 | 선택 | 회원 | 가능 |
| 커피챗 상태 | 2 | 필수 | 회원 | 불가 |
| 오픈카톡 URL | 2 | 조건부 필수 | 본인 공개 설정 시 회원에게 직접 표시(파트너 제외) | 가능(공개/비공개) |
| 제안 수신 허용 | 2 | 선택 | 본인 | — |
| 공개 여부(is_public) | — | 필수 | 관리자/본인 | — |

커피챗 상태 옵션: 가능 / 월 1회 가능 / 채용·업무 제안만 가능 / 지금은 어려움 / 비공개.

**신뢰 시각화(프로필 카드):** 익명 명단처럼 보이지 않게 신뢰 신호를 노출한다.
- 기수 배지(예: "12기"), (선택)인증 배지(is_verified 아이콘 — 명부 확보 시), 이름 이니셜 아바타 폴백, 프로필 신선도(최근 업데이트일).

목록 화면 필터: 검색창 / 회사·기관 / 직무 / 분야 태그 / 졸업연도·기수 / 커피챗 가능.

프로필 상세 액션: 오픈카톡으로 연결(공개 시)(§6.3) / 이메일 제안(서버 중계 폼) / 프로필 링크 복사 / 신고하기 / 차단하기.

완료 기준:
- 본인이 프로필을 생성/수정할 수 있고, 필수값 누락 시 저장되지 않는다.
- 회원이 디렉토리를 풀 열람하고 검색·필터링할 수 있다(각 프로필 `field_visibility` 존중).
- 오픈카톡 URL은 본인 공개 설정 시 프로필 상세에 "오픈카톡으로 연결" 버튼으로 표시되고, 클릭 이벤트가 기록된다. 비공개거나 없으면 제안 이메일(서버 중계)로 연락한다.
- 본인 또는 관리자만 프로필을 수정할 수 있다. **role/status/is_admin은 사용자 수정 경로에서 화이트리스트로 제거**(자기 권한 상승 차단).
- 오픈카톡/제안 클릭 이벤트가 기록된다.

### 6.3 커피챗/제안 연결 (Phase 1 핵심)

목표: 모르는 선후배에게 부담 없이 연락한다. 내부 채팅을 만들지 않고 **공개된 오픈카톡 직접 링크 + 제안 이메일 서버 중계**로 구현한다. 구조화된 요청/수락/거절 단계는 두지 않는다(단순화 — v2.4).

요구사항:
1. **커피챗 = 공개된 오픈카톡 직접 클릭.** 오픈카톡 URL을 등록·공개한 회원은 프로필 상세에서 "오픈카톡으로 연결" 버튼으로 바로 열린다(요청/수락/거절 단계 없음). 외부 URL은 https + `open.kakao.com` 화이트리스트만 허용한다.
2. `coffeechat_status`(가능 / 월 1회 가능 / 채용·업무 제안만 가능 / 지금 어려움 / 비공개)는 연락 가능 여부를 알리는 **"신호"로만** 유지한다(요청 상태머신 아님).
3. **제안 이메일은 폴백.** 오픈카톡이 없거나 비공개인 회원에게 도달하는 경로로, **원문 비노출 서버 중계 폼**으로 보낸다(발신자·실제 개인 이메일 미노출) + rate limit(1일 5건). (오픈카톡과 달리 실제 개인 이메일은 노출하지 않으므로 서버 중계를 유지한다.)
4. **차단(block):** 사용자가 특정 사용자를 차단하면 자신의 프로필이 그 사용자에게 숨겨지고, 그 사용자의 제안 이메일 중계도 차단한다.
5. 클릭 로깅: 오픈카톡 클릭은 `coffeechat_click`, 제안 이메일 클릭은 `proposal_email_click`으로 기록한다(§6.8).

완료 기준:
- 오픈카톡을 공개한 회원의 프로필 상세에서 "오픈카톡으로 연결" 버튼이 직접 열리고, `coffeechat_click`이 기록된다.
- 오픈카톡이 없거나 비공개인 회원에게는 제안 이메일(서버 중계 폼)이 노출되고, 발신자·실제 이메일이 노출되지 않는다.
- 차단한 사용자에게 자신의 프로필이 노출되지 않고, 제안 중계도 차단된다.
- 외부 URL은 https + `open.kakao.com` 화이트리스트만 허용한다.

### 6.4 구인구직/기회 (Phase 2)

목표: MICE 업계의 상시 채용·인턴·단기 프로젝트·공모전·협업 기회를 구조화한다.

공고 유형: 정규직 / 인턴 / 파트타임 / 단기 프로젝트 / 산학 프로젝트 / 공모전·대외활동 / 기타.

공고 필드: 제목(필수) / 회사·기관(필수) / 유형(필수) / 근무지 / 마감일 / 급여·보상 / 상세(필수) / 자격요건 / 외부 지원 URL / 담당자 연락처 / 작성자(자동) / 태그 / 상태(draft/pending/published/closed/hidden).

목록: 검색 / 유형 필터 / 마감임박·최신순 / 북마크 / 모집중·마감 표시.  
상세: 공고 상세 / 작성자 프로필 연결 / 외부 지원 링크 / 링크 복사 / 북마크 / 신고.  
등록 권한: 회원 제보 → 관리자 승인 후 공개(특정 회원 즉시 공개 옵션).

완료 기준:
- 회원이 공고를 pending으로 제보, 관리자가 승인/수정/마감/숨김 처리.
- 외부 지원 링크 클릭이 `job_apply_click`으로 기록.
- 마감일 지난 공고는 목록에서 마감 상태로 표시.

### 6.5 갤러리/아카이브 (Phase 1.5 — 운영자 큐레이션)

목표: 행사·동문 활동의 시각 기록을 남겨 재방문 이유와 소속감을 제공한다. **사용자 자유 업로드는 만들지 않는다.** 운영자(admin/콘텐츠 담당)가 큐레이션한 앨범만 게시한다.

요구사항:
1. **앨범 생성·관리:** 운영자가 앨범을 만들고(제목·행사일·설명·대표이미지·공개여부), 이미지를 업로드하고, 필요 시 YouTube URL을 임베드한다.
2. **이미지 저장 = Cloudflare R2(§9.2).** 업로드는 서버(withAuth)에서 presigned PUT URL을 발급받아 클라가 R2에 직접 올린다(서버 대역폭 0). 모든 이미지 I/O는 `lib/storage` 어댑터를 경유한다.
3. **사용자 자유 업로드 없음.** 회원이 행사 사진을 제보하려면, 운영자가 **피사체 동문의 게시 동의를 확인한 뒤** 직접 앨범에 등록한다(자유 업로드 경로 자체를 만들지 않음).
4. **YouTube 임베드:** 영상은 직접 호스팅하지 않고 YouTube videoId만 저장한다(§3.1-4). **잘못된/비 YouTube URL은 저장을 거부**한다(앱 레벨 검증).
5. **열람 권한 = 회원.** 행사 사진에는 동문 얼굴(개인정보·영상정보)이 담기므로 갤러리 열람은 로그인 회원으로 제한한다(비로그인 guest는 불가). 게시 동의·삭제 절차는 아래 PIPA 항목으로 보장한다.

**PIPA(초상권·영상정보, 중요):** 행사 사진에는 동문 얼굴이 담기므로, 운영자는 게시 전 **피사체 동문의 게시 동의**를 받거나, 게시 후 본인이 요청하면 즉시 내리는 **삭제 요청 절차**(앨범별 신고/삭제 요청 경로)를 보장한다. 동의 없는 식별 가능한 사진은 게시하지 않는 것을 기본으로 한다(§8.2/§8.3 연계).

앨범 필드: 제목(필수) / 행사일 / 설명 / 대표이미지 / 공개여부(is_public).  
이미지 필드: R2 객체 키(필수, `lib/storage` 경유) / 정렬 순서 / 캡션(선택).

완료 기준:
- 운영자만 앨범/이미지를 생성·수정·삭제할 수 있다(일반 회원 자유 업로드 경로 없음).
- 이미지 업로드가 R2 presigned PUT으로 동작하고, 키가 `album_images`에 저장된다.
- 잘못된 YouTube URL은 저장이 거부된다.
- 로그인 회원만 갤러리를 열람한다(비로그인 guest는 불가).
- 게시 동의 확인 체크 없이는 운영자가 앨범을 공개(is_public=true)할 수 없다.

### 6.6 인터뷰/콘텐츠 (Phase 3)

목표: 빈 화면 문제 완화 + 재방문 이유 제공. 단, 재방문 후크는 콘텐츠가 아니라 **본인 관련 신호**(§6.2 홈)를 1차로 둔다.

콘텐츠 유형: 동문 인터뷰 / 회사·기관 소개 / 직무 소개 / 행사 후기.

콘텐츠 필드: 제목(필수) / 요약(필수) / 본문(필수) / 대표 이미지 / 관련 동문 프로필 / 태그 / 발행 상태(draft/published/hidden) / 작성자(자동).

상세 액션: 관련 동문 프로필 보기 / 뉴스레터 구독 링크(외부) / 공유 링크 복사.

완료 기준:
- 운영자가 글 작성/수정/숨김.
- published 글은 회원이 열람.
- 관련 동문 프로필이 있으면 연결.
- 뉴스레터 구독 클릭이 기록.

> 뉴스레터 아카이브 페이지는 만들지 않는다(Stibee 공개 아카이브 링크로 대체).

### 6.7 관리자

목표: 비개발 운영자가 Supabase 콘솔 없이 운영한다.

관리자 기능:

| 기능 | 설명 | Phase |
| --- | --- | --- |
| 회원 관리 | 검색, 역할 변경, 숨김 | 1 |
| 프로필 관리 | 부적절 프로필 숨김 | 1 |
| 신고 관리 | 신고 상태머신 처리 | 1 |
| 차단/제재 | 사용자 정지(suspended) | 1 |
| 갤러리 관리 | 앨범 생성/수정/삭제 + 이미지 업로드(R2) + YouTube 임베드 + 게시 동의 확인 | 1.5 |
| 공고 관리 | 승인/수정/마감/숨김 | 2 |
| 콘텐츠 관리 | 작성/수정/발행/숨김 | 3 |
| 관리자 로그 | 모든 관리 작업 기록 | 1 |

**신고 상태머신 + SLA + 남용 방지:**
- 상태: open → reviewing → resolved / dismissed.
- **자동 hidden:** 동일 대상에 대한 신고가 임계치(3건) 누적되면 운영자 확인 전까지 자동 숨김.
- SLA: 신고는 주간 루틴에서 7일 내 처리. 처리 결과를 신고자에게 앱 내 상태로 통지.
- 남용 방지: 신고 1일 10건 rate limit(동일 대상은 1일 1건), 동일 대상 중복 신고 합산.

관리자 부트스트랩: 최초 관리자만 `ADMIN_EMAILS` 환경변수로 지정. 이후 관리자 추가는 `admins` 테이블 + admin_logs로 관리(코드 배포 없이 운영).

완료 기준:
- `admins` 테이블 또는 부트스트랩 이메일에 포함된 사용자만 관리자 페이지 접근.
- 일반 사용자가 관리자 URL 직접 입력 시 차단(서버에서도 검사).
- 모든 관리자 작업이 `admin_logs`에 기록.

### 6.8 이벤트 로깅/통계

목표: 운영진이 실제 사용 여부를 판단한다. 단, 자동 대시보드는 v1 컷 → 콘솔 저장 쿼리/주1회 수기 집계.

기록 이벤트: profile_view / coffeechat_click / proposal_email_click / job_view(P2) / job_apply_click(P2) / job_bookmark(P2) / article_view(P3) / newsletter_click(P3) / report_submit / login.

**events 보존정책·롤업:**
- `events`는 90일 보존 후 `event_daily`(일자×이벤트타입 집계)로 롤업하고 원본은 파기. 개인 과추적 방지 + 테이블 비대화 방지.
- **리텐션/탈퇴 정합:** 코호트 리텐션 계산을 위해 식별자 대신 **salted hash 코호트 키**(`actor_cohort_hash`)를 events에 병기한다. 탈퇴 시 `events.profile_id`를 null로 만들되(스키마상 on delete set null로 자동 처리) salted hash는 유지 → 탈퇴자 포함 코호트 리텐션이 깨지지 않으면서 개인 식별은 불가.
- **코호트 키 필수:** `actor_cohort_hash`는 모든 events 기록 시 반드시 채운다(누락 시 탈퇴 후 코호트가 깨짐). 스키마상 `not null`로 DB가 강제하며(부록 A), 기록 경로(`/api/events`)에서도 hash를 채워 보낸다 — DB 강제가 1차 안전망, 서버가 2차다.

완료 기준:
- 핵심 버튼 클릭이 `events`에 저장.
- 모든 events 기록 시 `actor_cohort_hash`가 채워진다(hash 없는 이벤트는 기록 거부).
- 콘솔 저장 쿼리로 주요 수치 확인 가능.
- 90일 경과 events가 롤업·파기되는 절차가 문서화.

---

## 7. 데이터 모델

### 7.1 테이블 목록

| 테이블 | 목적 | Phase |
| --- | --- | --- |
| `profiles` | 사용자 공개/반공개 프로필 | 1 |
| `verification_roster` | (미래/선택) 명부(학번+이름) — 인증 배지 자동 부여용, v1 미사용 | 1 |
| `consents` | PIPA 동의 기록(시점·버전) | 1 |
| `tags` | 분야 태그 마스터 | 1 |
| `profile_tags` | 프로필×태그 연결 | 1 |
| `blocks` | 사용자 차단 | 1 |
| `reports` | 신고(상태머신) | 1 |
| `admins` | 관리자 명단 | 1 |
| `admin_logs` | 관리자 작업 로그 | 1 |
| `events` | 행동 이벤트(90일 보존) | 1 |
| `event_daily` | 이벤트 일별 롤업 | 1 |
| `notifications` | 앱 내 알림/이메일 발송 로그 | 1 |
| `albums` | 갤러리 앨범(운영자 큐레이션) | 1.5 |
| `album_images` | 앨범×이미지(R2 객체 키) | 1.5 |
| `jobs` | 구인구직/기회 공고 | 2 |
| `job_tags` | 공고×태그 연결 | 2 |
| `job_bookmarks` | 관심 공고 | 2 |
| `articles` | 인터뷰/콘텐츠 | 3 |

> `albums`/`album_images`는 운영자 큐레이션 갤러리(§6.5)를 위해 Phase 1.5에 추가한다. 이미지 바이너리는 DB가 아니라 Cloudflare R2에 저장하고, `album_images`에는 **R2 객체 키만** 보관한다(§9.2, `lib/storage` 경유).

### 7.2 확정 스키마 부록 (요약) — 전체 SQL은 부록 A

원칙: 모든 테이블에 `id uuid PK default gen_random_uuid()`, `created_at`/`updated_at timestamptz default now()`. FK는 명시적 `on delete` 지정. 상태값은 enum 대신 `text + CHECK`. 검색 컬럼에 pg_trgm GIN 인덱스, 목록 정렬에 복합 인덱스.

`profiles`

| 컬럼 | 타입 | 제약/설명 |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK auth.users(id) on delete cascade, unique |
| name | text | not null |
| role | text | CHECK in (student, alumni, faculty, partner, admin) |
| status | text | CHECK in (active, suspended, withdrawn) default 'active' |
| is_verified | boolean | not null default false — (선택)동문 인증 배지. 접근 제어에 사용 안 함(정보용) |
| student_number | text | 본인·관리자만 열람(서버에서 마스킹) |
| admission_year | int | |
| graduation_year | int | |
| department | text | |
| organization | text | nullable(재학/구직 허용) |
| employment_status | text | CHECK in (employed, student, seeking) |
| position | text | nullable |
| bio | text | |
| career_summary | text | |
| coffeechat_status | text | CHECK in (open, monthly, offer_only, busy, private) |
| open_kakao_url | text | https + open.kakao.com만 허용(앱 레벨 검증) |
| proposal_email_allowed | boolean | default false |
| photo_path | text | R2 객체 키(lib/storage 경유) |
| is_public | boolean | default true |
| field_visibility | jsonb | 필드별 공개 토글 |
| deleted_at | timestamptz | soft delete |
| anonymized_at | timestamptz | 탈퇴 익명화 시각 |
| created_at / updated_at | timestamptz | |

인덱스: `gin (name gin_trgm_ops)`, `gin (organization gin_trgm_ops)`, `gin (position gin_trgm_ops)`, `btree (status, is_public)`, `btree (graduation_year)`.

`verification_roster`(미래/선택, v1 미사용): id, student_number(text), name(text), used(boolean), 복합 unique(student_number, name). 학교 명부 확보 시 적재하면 일치 가입자에게 `is_verified=true` 배지를 자동 부여하는 선택적 기능. v1에선 테이블이 비어 있고 사용하지 않는다(배지는 비차단·정보용).

`consents`: id, profile_id(FK on delete cascade), doc_type(CHECK in terms/privacy/profile_public), doc_version(text), agreed_at(timestamptz). 복합 인덱스(profile_id, doc_type).

`tags`: id, name(text unique), category(text). `profile_tags`: profile_id(FK), tag_id(FK), 복합 PK.

`blocks`: id, blocker_profile_id(FK), blocked_profile_id(FK), 복합 unique.

`reports`: id, reporter_profile_id(FK on delete set null — 탈퇴 시 신고자 연결 해제 = 익명 처리), target_type(CHECK in profile/job/article), target_id(uuid), reason(text), status(CHECK in open/reviewing/resolved/dismissed) default 'open', handled_by(FK profiles on delete set null), created_at.

`admins`: id, profile_id(FK unique), granted_by(FK profiles), created_at.

`admin_logs`: id, admin_profile_id(FK on delete set null — 탈퇴 시 관리자 연결 해제 = 익명 처리), action(text), target_type(text), target_id(uuid), detail(jsonb), created_at.

`events`: id, event_type(text), actor_cohort_hash(text, salted), profile_id(FK nullable), target_id(uuid nullable), created_at. 인덱스(event_type, created_at).

`event_daily`: id, day(date), event_type(text), count(int), 복합 unique(day, event_type).

`notifications`: id, profile_id(FK), type(text), channel(CHECK in in_app/email), payload(jsonb), read_at(timestamptz), email_status(CHECK in queued/sent/failed/skipped), created_at.

`albums`(P1.5): id, title(not null), event_date(date nullable), description(text), cover_image_key(text — R2 객체 키, lib/storage 경유), youtube_video_id(text nullable — videoId만 저장), consent_confirmed(boolean default false — 게시 동의 확인), is_public(boolean default false), created_by(FK profiles on delete set null), created_at/updated_at. 인덱스(is_public, event_date).

`album_images`(P1.5): id, album_id(FK albums on delete cascade), image_key(text not null — R2 객체 키, lib/storage 경유), caption(text nullable), sort_order(int default 0), created_at. 인덱스(album_id, sort_order).

`jobs`(P2): id, author_id(FK profiles on delete set null — 탈퇴 시 작성자 연결 해제 = 익명 처리), title, organization, job_type(CHECK), location, deadline(date), compensation, description, requirements, apply_url(https만), contact, status(CHECK in draft/pending/published/closed/hidden) default 'pending', created_at/updated_at. 인덱스(status, deadline). `job_tags`, `job_bookmarks` 연결.

`articles`(P3): id, author_id(FK profiles on delete set null — 탈퇴 시 작성자 연결 해제 = 익명 처리), title, summary, body, cover_path, related_profile_id(FK nullable), tags(text[]), status(CHECK in draft/published/hidden), created_at/updated_at.

### 7.3 검색/인덱스 설계

- `create extension if not exists pg_trgm;`
- 이름·회사·직무 부분일치 검색은 trigram GIN 인덱스 사용(ILIKE '%키워드%' 가속).
- 목록 정렬·필터 결합은 복합 인덱스로 처리: `profiles(status, is_public)`, `jobs(status, deadline)`.
- `supabase gen types typescript > types/database.ts` 재생성을 T-002/T-005 완료 기준에 포함(스키마 변경 시 타입 동기화).

### 7.4 권한/보안 모델 — RLS 심층 방어 (핵심)

**v1의 "RLS 운영 제외형"을 폐기한다.** v2는 다음을 **유일한 기본값**으로 확정한다.

> 모든 테이블 `ENABLE ROW LEVEL SECURITY` + **정책 없음(deny-all)** + 데이터 접근은 **서버 service_role 단일 경로** + 핸들러 첫 줄 **requireXxx 2차 검증**.

#### 왜 RLS를 끄지 않는가 (다음 기수가 다시 끄지 않도록 박아두는 문단)

Supabase의 public 스키마는 테이블 생성 시 anon/authenticated 역할에 자동으로 권한을 부여한다. **RLS를 끄면 브라우저에 항상 노출되는 anon 키만으로 `/rest/v1/profiles`를 호출해 실명+직장+학번 전체가 읽힌다.** v1은 "RLS 끄기"와 "브라우저 직접 접근 막기"를 혼동했다. RLS를 켜고 정책을 만들지 않으면 anon/authenticated는 **0행**만 보게 되어, 사람이 서버 핸들러 권한 검사를 빠뜨려도 PII가 새지 않는다. 즉 RLS는 비용 0의 안전망이다. **절대 다시 끄지 말 것.**

#### 단일 접근 경로 원칙(인지부하 최소화)

데이터 접근 경로를 **하나로 통일**한다. 공개 읽기(랜딩 등)조차 anon이 DB를 직접 읽지 않고 서버 API를 경유한다. 이렇게 하면 "이건 왜 서버, 저건 왜 직접?"이라는 혼란과 "왜 0행이 나오지?"라는 RLS 디버깅이 사라진다. (부록 B의 `is_member()` 정책 예시는 **선택적 최적화**로 격하한다 — 기본은 정책 0개다.)

#### 비개발팀이 따라 할 수 있는 RLS 정책 표

| 단계 | 무엇을 | 어떻게(한 줄) |
| --- | --- | --- |
| 1 | 전 테이블 RLS 켜기 | `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;` (각 테이블 1줄) |
| 2 | 정책은 만들지 않음 | (정책 0개 = anon/authenticated 0행 = 안전망) |
| 3 | 서버만 우회 | service_role 클라이언트는 RLS를 우회한다(서버 전용 키) |
| 4 | (선택) 공개 읽기 최적화 | 정말 필요할 때만 `is_member()` 기반 5~6줄 정책 추가 — 기본 아님 |

> 결과적으로 운영 난이도는 v1보다 **낮다**. 정교한 역할별 정책을 짜지 않고 "전체 차단 1줄 × 테이블 수"만 적용하기 때문이다.

#### 서버 권한 헬퍼(공통 wrapper — "감싸지 않으면 동작 안 함")

핸들러 본문에 권한 검사를 흩뿌리지 않고 공통 wrapper로 강제한다.

```ts
// lib/guards/withAuth.ts (개념 예시)
// member = 로그인 + status='active' + not suspended (가입자 = 풀 사용)
type Role = 'any' | 'member' | 'admin';
export function withAuth(handler, opts: { role: Role }) {
  return async (req) => {
    const session = await getSession();           // 1차: 로그인
    if (!session) return unauthorized();
    const me = await getMyProfile(session.user.id);
    if (opts.role !== 'any' && me.status !== 'active') return forbidden(); // suspended/withdrawn 차단
    if (opts.role === 'admin' && !(await isAdmin(me.id))) return forbidden();
    return handler(req, { me });                  // 검증 통과한 컨텍스트만 전달
  };
}
```

- 모든 Server Action / Route Handler는 `withAuth(...)`로 감싼다. 감싸지 않으면 데이터에 접근할 수 없다.
- service_role 클라이언트는 `lib/supabase/admin.ts` **한 곳에만** 둔다. `'use server'` 또는 `app/api/**`에서만 import.
- ESLint `no-restricted-imports`로 `components/**`에서 `lib/supabase/admin` import를 **차단**한다.
- 사용자 update 경로에서 `role`/`status`/`is_admin`/`is_verified`는 화이트리스트로 제거한다(자기 권한 상승·배지 자가부여 차단).

#### 코드 레벨 권한 기준표

| 테이블 | READ | CREATE | UPDATE | DELETE/HIDE |
| --- | --- | --- | --- | --- |
| profiles | 회원은 디렉토리 풀 열람(각 프로필 field_visibility 존중), 본인은 전체 | 로그인 본인 1개 | 본인 또는 admin | admin(soft) |
| consents | 본인 또는 admin | 가입 트랜잭션 | 불가 | 파기 시만 |
| reports | 본인 신고 또는 admin | 회원(누구나 신고) | admin | admin |
| albums / album_images | 회원은 is_public 앨범 열람 | 운영자/admin만(자유 업로드 없음) | 운영자/admin | 운영자/admin |
| jobs | 회원은 published | 회원(P2) | 작성자 draft/pending, admin 전체 | admin |
| articles | 회원은 published | 운영자/admin | 작성자/admin | admin |
| events | admin 집계만 | 서버에서만 | 불가 | 롤업 시 파기 |
| admin_logs | admin만 | 서버에서만 | 불가 | 불가 |

#### 출시 게이트(보안)

1. anon 키로 `curl /rest/v1/profiles` → **0행 또는 401** 확인.
2. `.next/` 빌드 산출물에 service_role 문자열 부재 확인.
3. ESLint가 `components/**`의 admin import를 차단하는지 CI에서 확인.
4. service_role 키는 Prod 환경변수에만 존재하고 Preview/클라이언트에 없음.

#### service_role과 PIPA "최소 권한"의 정합

service_role은 모든 행을 본다. PIPA의 접근권한 최소화와 정합하려면 **운영 통제**가 필요하다(코드가 아니라 사람의 접근).
- Supabase 콘솔/DB 접근은 **프로젝트 공용 계정 1개**로만 한다(개인 계정 콘솔 접근 금지, 부록 E).
- 공용 계정에 **MFA 강제**(복구코드 안전 보관).
- service_role 키 보관 위치를 명시하고, 기수 교체 시 **재발급**.
- 운영자는 콘솔에서 RLS를 우회한 수기 조회를 하지 않는다(관리자 화면 사용).

---

## 8. 권한과 개인정보

### 8.1 개인정보 최소 수집

필수: 이름 / 이메일 / 역할 / 학과·졸업연도(또는 학번) / 회사·직무 등 프로필.  
선택: 프로필 사진 / 오픈카톡 URL / 제안 수신 이메일 / 경력 요약.  
**수집하지 않음:** 주민등록번호 / 생년월일 / 개인 전화번호 / 상세 주소 / 민감정보.

### 8.2 공개 범위 (필드별 토글 + 외부 파트너 차등)

| 정보 | 비로그인 | 외부 파트너 | 회원 | 관리자 |
| --- | --- | --- | --- | --- |
| 이름·기수·분야 태그·직무 카테고리 | 불가 | 가능 | 가능 | 가능 |
| 회사명·직책 | 불가 | 가능 | 가능(field_visibility 존중) | 가능 |
| 오픈카톡 URL | 불가 | **불가** | **본인 공개 설정 시 회원에게 직접 표시(파트너 제외)** | 가능 |
| 학번 | 불가 | 불가 | 본인 | 가능 |
| 이메일 | 불가 | 불가 | 본인/제안 허용 시 중계 | 가능 |
| 신고 내역 | 불가 | 본인 | 본인 신고 | 가능 |
| 갤러리(행사 사진·동문 얼굴) | 불가 | 불가 | 가능 | 가능 |

> 필드별 공개 토글(field_visibility): 사용자가 회사/직무/연도/소개 등을 개별로 비공개할 수 있다(이름·역할·커피챗 상태·분야 태그는 항상 공개).
> **오픈카톡=본인 공개 설정 직접 표시 / 제안 이메일=서버 중계(§6.3):** 오픈카톡 URL은 본인이 등록·공개 여부(field_visibility)를 정하며 공개 시 프로필 상세에서 회원에게 직접 표시한다(파트너 제외). 실제 개인 이메일은 노출하지 않고 제안은 서버 중계 폼으로만 도달한다.
> **갤러리 초상권(§6.5):** 행사 사진은 동문 얼굴(개인정보·영상정보)을 포함하므로 로그인 회원만 열람한다. 운영자는 게시 전 **피사체 게시 동의**를 확인하고, 게시 후 본인 요청 시 즉시 내리는 **삭제 요청 절차**를 보장한다.

### 8.3 PIPA 컴플라이언스 부록 (빈칸-채우기 템플릿 → 부록 C)

처리방침 필수 기재 체크리스트(부록 C에 빈칸 템플릿 제공):

- [ ] 처리하는 개인정보 항목(이름·이메일·소속·직무·학번/졸업연도)
- [ ] 수집·이용 목적(동문 디렉토리·매칭)
- [ ] 보유·이용 기간(탈퇴 시까지, 탈퇴 후 30일 내 파기)
- [ ] 제3자 제공 여부(없음 — 회원 간 공개는 동의 기반)
- [ ] 처리위탁·국외이전(Supabase·Vercel·Resend·Cloudflare(R2 이미지 저장)의 리전 명시)
- [ ] 파기 절차·방법
- [ ] 정보주체 권리(열람·정정·삭제·처리정지·동의철회)와 행사 방법
- [ ] 개인정보 보호책임자 성명·연락처
- [ ] 만 14세 미만 처리 정책 1줄
- [ ] 갤러리 행사 사진(초상권·영상정보): 피사체 게시 동의 또는 게시 후 삭제 요청 절차(§6.5)

**탈퇴/동의철회(self-serve):**
- "프로필 비공개"(데이터 유지, is_public=false)와 "탈퇴/파기"(식별정보 30일 내 파기 또는 즉시 익명화)를 **분리**한다.
- 탈퇴 시 `profiles.anonymized_at` 기록, events는 `events.profile_id`를 null로 만들고(스키마상 on delete set null로 자동 처리) salted hash 코호트 키만 남겨 비식별 통계 유지.
- **탈퇴 시 본인이 작성한 신고/공고/관리자로그의 작성자·신고자 표기는 익명(null)으로 바뀐다**(reports/admin_logs/jobs/articles 모두 on delete set null). 따라서 §6.7 신고 SLA의 "신고자에게 통지"는 탈퇴 전까지만 유효하며, 탈퇴 후에는 통지 대상이 사라진다(모순 아님 — 탈퇴자 익명화로 설계).
- 개인정보처리자 = 동문회/학과 공식 단위로 고정. 보호책임자 1명 지정(§14.1).

---

## 9. 기술 스택

### 9.1 권장 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Frontend | Next.js App Router | 파일 기반 라우팅, Server Actions, Vercel 궁합 |
| Language | TypeScript | AI 코드의 타입 오류 감소 |
| Styling | Tailwind CSS | 빠른 UI 수정 |
| UI Kit | shadcn/ui | 접근성·일관성 |
| Backend | Supabase(Auth/Postgres) | DB·Auth 전용(이미지는 R2). 한곳에서 처리 |
| Deployment | Vercel(Hobby 무료) | Phase 1 비영리 → 비상업 사용. 호스트 종속 금지로 이식성 유지(§9.2) |
| **트랜잭션 메일** | **Resend(무료 월 3,000통 + 일 100통 한도)** | 제안 이메일 중계·신고 처리 통지·탈퇴확인 발송 |
| Image Storage | Cloudflare R2(S3 호환, 무료 10GB·egress 0) | 처음부터 R2. lib/storage 어댑터 단일 경로, presigned 업로드(서버 대역폭 0), CDN 서빙 |
| Video | YouTube 임베드(videoId만 저장) | 직접 호스팅 회피 |
| Newsletter | Stibee/Maily/Google Form 링크 | 발송 시스템 회피 |
| Analytics | 자체 events + event_daily 롤업 | 과수집 없이 핵심 행동 확인 |

### 9.2 비용·약관·한도 (무료 운영 전제 — 예산 0원 확정)

**예산 0원이 확정 제약이다.** v2는 유료 전제를 폐기하고 **무료 티어로 출시·운영하되, 무료의 두 지뢰(Vercel 약관·Supabase pause)를 "리스크 수용"이 아니라 "설계"로 정면 해결**한다. 유료 전환은 출시 조건이 아니라 "예산이 생기거나 한도에 부딪힐 때의 업그레이드 경로"로만 남긴다.

**Vercel(호스팅):** Hobby는 상업·조직 사용에 제한이 있다. 단 **Phase 1 출시 시점에는 결제도 채용 공고도 없는 순수 비영리 동문 디렉토리**이므로 비상업 사용으로 보는 것이 합리적이다. 두 가지를 못 박는다.
- **호스트 종속 금지:** Vercel 전용 기능(Vercel KV/Postgres/Cron 등)을 쓰지 않는다. 데이터는 Supabase, 코드는 Git에 둔다 → 이 둘이 이식 가능하므로 Hobby가 막혀도 **반나절 만에 다른 호스트로 재배포**(서비스 데이터 손실 0).
- **이전 경로 사전 문서화:** `docs/troubleshooting.md`에 **Cloudflare Pages / Netlify**(둘 다 무료 + 상업 사용 허용 + Next.js 지원)로의 이전 절차를 미리 적어둔다. **채용 공고가 생기는 Phase 2 진입 = 호스트 재평가 트리거**(무료 대안 이전 또는 예산 확보).

**Supabase(DB/Auth):** 이미지는 Supabase Storage를 쓰지 않고 **Cloudflare R2로 처리**하므로(아래 별도 항목), Supabase는 **DB/Auth 전용**이다. 진짜 지뢰는 **7일 비활성 시 자동 pause**다(방학·주말 트래픽 0 → "월요일 로그인 불가"). 이건 무료에서도 **공짜로 막는다** — 아래를 Phase 1 기본 설정으로 못 박는다.
- **pause 방지 핑(필수):** cron-job.org 또는 UptimeRobot로 5~10분마다 `/api/health`(DB 1행 select) 호출. 무료·설정 5분. 핑 계정은 소유권 매트릭스(부록 E)에 기록.
- **무료 한도가 충분한 이유:** 이미지는 R2(10GB·egress 0)로 분리했으므로 Supabase는 **DB 0.5GB·MAU 5만의 텍스트 위주 데이터**만 담으면 된다 — 회원 수백 명·프로필/공고/콘텐츠 텍스트에 여유롭다.
- **무료 프로젝트 2개 = Prod + Preview에 정확히 맞음.** 세 번째(스테이징)는 무료로 못 만드니 Preview를 스테이징 겸용으로 쓴다.
- **한도 모니터:** DB 60% 또는 MAU 3만 도달 시 "유료 전환 검토" 트리거(차단선 아님).

**Cloudflare R2(이미지 스토리지 — 처음부터):** 프로필 사진·갤러리 이미지 등 **모든 이미지 I/O는 Phase 1부터 R2(S3 호환)**로 처리한다. Supabase Storage 1GB 의존을 제거한다.
- **무료 한도:** 저장 **10GB/월** + Class A(쓰기/목록) **100만 ops/월** + Class B(읽기) **1000만 ops/월** + **인터넷 egress 0원**. 회원 수백 명·운영자 큐레이션 갤러리에 충분하다.
- **lib/storage 어댑터(단일 경로):** 모든 이미지 I/O를 얇은 어댑터(`upload` / `getSignedUploadUrl` / `getPublicUrl` / `delete`) 뒤에 둔다. Phase 1부터 구현체 = Cloudflare R2. 나중에 다른 스토리지로 바꿔도 어댑터 한 곳만 교체한다.
- **업로드 경로(서버 대역폭 0):** 서버(withAuth)에서 **presigned PUT URL**을 발급 → 클라가 R2에 **직접 업로드**(서버를 거치지 않음). 이미지는 리사이즈·압축(최대 변 1024px, WebP) 후 올린다.
- **서빙:** 공개 읽기는 `r2.dev` 기본 도메인 또는 **커스텀 도메인(Cloudflare CDN)**으로. 브라우저 직접 업로드를 위해 **버킷 CORS 설정**(허용 origin = 배포 도메인, 메서드 PUT/GET)이 필요하다.
- **시크릿:** R2 access key / secret access key는 **서버 전용 env**(절대 `NEXT_PUBLIC` 금지). `lib/storage` **한 곳에서만** 사용한다(`components/**`에서 import 금지). 키 보관·로테이션은 소유권 매트릭스(부록 E)·env.md·학기말 로테이션(§14.4)에 포함한다.
- **비용:** 위 무료 한도 내에서 **$0**. 10GB의 60% 도달 시 "R2 유료 전환 검토" 트리거(유료도 저렴: 저장 ~$0.015/GB·월, egress 여전히 0원). 차단선이 아니다.

**Resend(메일):** 무료 월 3,000통 + **일 100통**. 출시일 대량 알림(제안 이메일 중계·신고 처리 통지 등)은 ① 앱 내 상태 배너를 1차 통지로(메일 의존 낮춤), ② 메일을 며칠에 나눠 발송해 일 100통 캡을 피한다.

**연간 운영비(현재 계획 = 무료):**

| 항목 | 현재 계획(무료) | 나중에 유료(예산 확보 시) |
| --- | --- | --- |
| 호스팅 | $0 (Vercel Hobby; Phase 2엔 Cloudflare/Netlify 무료 또는 Vercel Pro) | ~$240/년(Pro) |
| Supabase | $0 (무료 + pause 방지 핑) | ~$300/년(Pro) |
| 이미지 스토리지(R2) | $0 (Cloudflare R2 무료 10GB·egress 0) | 10GB 초과 시 ~$0.015/GB·월(여전히 저렴, egress 0) |
| 도메인 | ~$15/년(선택; 없으면 `*.vercel.app` 무료 서브도메인) | ~$15/년 |
| Resend | $0 (월3,000·일100) | $0 |
| **합계** | **$0~15/년** | **~$555/년** |

> 무료 출시가 v2의 기본 계획이다. 두 지뢰는 설계로 해결했다 — Vercel은 호스트 이식성으로, Supabase는 pause 방지 핑으로. 유료는 한도 초과·예산 확보 시의 업그레이드일 뿐 출시 조건이 아니다.

### 9.3 환경 분리

- Supabase **Prod / Preview 프로젝트 분리.** Preview는 별도 프로젝트(실명 DB 노출/오염 방지). **service_role 키는 Prod 전용.**
- Vercel 환경변수는 Production / Preview / Development로 분리.
- Preview가 운영 DB를 가리키지 않게 한다(PR마다 실명 DB 접근 차단).

### 9.4 Supabase ssr 표준 패턴

`lib/supabase/`에 3개 클라이언트를 고정한다. (deprecated `auth-helpers` 사용 금지, `@supabase/ssr` 사용)

- `server.ts`: 쿠키 기반 서버 클라이언트(읽기). 쿠키 쓰기는 Action/Handler/미들웨어에서만.
- `client.ts`: 브라우저 클라이언트 — **Auth 전용**(DB 직접 query 금지).
- `admin.ts`: service_role 클라이언트 — 서버 전용, RLS 우회, 단일 import 지점.
- `middleware.ts`: 세션 갱신(토큰 리프레시) + 보호 경로 가드.

**단일 규칙:**
- mutation = Server Action.
- 외부 호출/브라우저 fetch = Route Handler.
- events 기록은 `/api/events` 1개로 통일.
- 모든 Action/Handler 첫 줄은 `withAuth`(requireXxx).

### 9.5 공식 문서 기준

- Next.js App Router: https://nextjs.org/docs/app
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Google Login: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase RLS(ENABLE 기준): https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase ssr: https://supabase.com/docs/guides/auth/server-side/nextjs
- Vercel 환경변수: https://vercel.com/docs/environment-variables
- Resend: https://resend.com/docs
- Cloudflare R2(S3 호환/presigned URL/CORS): https://developers.cloudflare.com/r2/
- 개인정보 보호법: https://law.go.kr/LSW/lsInfoP.do?lsiSeq=270351

---

## 10. 프로젝트 구조

```text
app/
  (public)/ page.tsx  login/page.tsx  terms/page.tsx  privacy/page.tsx
  (app)/
    home/page.tsx
    alumni/page.tsx  alumni/[id]/page.tsx   # 프로필 상세에서 오픈카톡 직접 연결(공개 시) + 제안
    me/page.tsx  me/edit/page.tsx  me/account/page.tsx
    onboarding/page.tsx   # 가입 정보 입력 + 동의 → 바로 홈(검증 게이트 없음)
    albums/page.tsx  albums/[id]/page.tsx  # Phase 1.5 갤러리(회원 열람)
    jobs/...        # Phase 2
    articles/...    # Phase 3
  admin/
    page.tsx  users/page.tsx  reports/page.tsx
    albums/page.tsx      # Phase 1.5 (운영자 앨범 CRUD)
    jobs/page.tsx        # Phase 2
    articles/page.tsx    # Phase 3
  api/
    events/route.ts  proposal/route.ts
    uploads/route.ts   # Phase 1.5 R2 presigned PUT URL 발급(withAuth)
components/
  common/  (EmptyState, ErrorState, LoadingSkeleton, ...)
  alumni/  admin/  albums/   # albums = Phase 1.5 갤러리. 연락은 프로필 상세 + proposal route
lib/
  supabase/ (server.ts, client.ts, admin.ts)
  storage/  (index.ts — R2 어댑터: upload/getSignedUploadUrl/getPublicUrl/delete. R2 시크릿 단일 사용처)
  guards/   (withAuth.ts, requireMember.ts, requireAdmin.ts)   # v1 lib/rls → lib/guards
  messages/ (lib/messages.ts — UX 라이팅 상수)
  validators/  analytics/
types/ (database.ts)
supabase/ migrations/ (0001_init.sql)  seed.sql
docs/
  README.md env.md operations.md qa-checklist.md
  schema.md troubleshooting.md security.md ownership.md
```

> v1의 `lib/rls`는 `lib/guards`로 개명(RLS는 DB 안전망, 권한 판단은 가드). `lib/messages` 신설(UX 문구 상수화). `lib/storage` 신설 — 모든 이미지 I/O를 Cloudflare R2 어댑터 한 곳으로 통일하고, R2 시크릿은 여기서만 사용한다(`components/**`에서 import 금지, §9.2).

---

## 11. 화면별 요구사항 (4블록 고정 템플릿)

모든 화면은 아래 **4블록**으로 명세한다. 각 블록을 해당 티켓의 완료 기준으로 복사한다. 공통 컴포넌트: `EmptyState`(4변형 props), `ErrorState`, `LoadingSkeleton`.

**4블록 구조:**
1. **레이아웃 골격(375px):** 상단 고정 / 스크롤 영역 / 하단 고정.
2. **요소 우선순위:** 가장 중요한 행동을 첫 화면에.
3. **4상태:** 로딩(스켈레톤) / 정상 / 에러(재시도) / 빈 상태.
4. **치수 토큰 + shadcn 매핑:** 간격·폰트·컴포넌트.

**빈 상태 3종(각기 다른 문구+CTA):** 데이터 없음 / 검색 0건 / 필터 0건. (lib/messages.ts에서 상수로 관리)

### 11.1 랜딩
1. 상단: 서비스명 + 한 줄 설명 / 스크롤: 가치 3개(동문 찾기·커피챗·실명 기반 커뮤니티) / 하단 고정: 로그인 버튼.
2. 우선순위: 로그인 버튼 > 가치 설명.
3. 로딩 없음(정적) / 에러 없음 / 빈 상태 없음.
4. shadcn Button(lg), 처리방침·약관 링크.

### 11.2 가입 정보 입력 + 동의 (온보딩)
1. 상단: 진행 표시(1/2) / 스크롤: 최소 필드 + 동의 3체크박스(약관/방침 스크롤 노출) / 하단 고정: "가입" 버튼.
2. 우선순위: 필드 → 동의 → 제출 → 바로 홈.
3. 로딩(제출 중) / 정상 / 에러(필드별 검증 메시지) / 빈 상태 없음.
4. shadcn Input/Select/Checkbox/Button. 동의 미체크 시 제출 비활성.

### 11.3 동문 목록
1. 상단 고정: 검색창 + 필터 칩 / 스크롤: 프로필 카드 리스트(신뢰 신호) / 하단 고정: 탭바.
2. 우선순위: 검색 > 필터 > 카드.
3. 로딩(스켈레톤 카드) / 정상 / 에러(재시도) / 빈 상태 3종 분리(데이터 없음/검색 0건/필터 0건).
4. shadcn Input/Badge/Card. 카드: 이름·기수 배지·(선택)인증 배지·회사·직무·태그·커피챗 상태. **회원이면 디렉토리를 풀 열람한다(각 프로필 field_visibility 존중). 카드에는 커피챗 상태 신호만 표시하고, 오픈카톡 직접 링크는 프로필 상세에서 연다.**

### 11.4 프로필 상세
1. 상단: 사진·이름·기수·(선택)인증 배지 / 스크롤: 소개·경력·태그·커피챗 상태 / 하단 고정: 오픈카톡 버튼(공개 시 직접)·제안·신고·차단.
2. 우선순위: 오픈카톡으로 연결 버튼(공개 시) > 제안 버튼 > 정보.
3. 로딩 / 정상 / 에러(없는 프로필) / 빈 상태(비공개 프로필 안내).
4. **오픈카톡 URL을 공개한 회원이면 "오픈카톡으로 연결" 버튼이 바로 열린다**(클릭 시 coffeechat_click 기록). 비공개거나 없으면 제안 이메일(서버 중계) 버튼으로 폴백한다. 파트너는 오픈카톡 비열람.

### 11.5 내 정보 / 계정 (탈퇴 포함)
1. 상단: 내 프로필 요약 / 스크롤: 공개 범위 토글·계정 설정 / 하단: 위험 영역(프로필 비공개·탈퇴).
2. 우선순위: 프로필 수정 > 공개 범위 > 탈퇴.
3. 로딩 / 정상 / 에러 / 빈 상태 없음.
4. 탈퇴는 2단계 확인(비공개 vs 파기 분리).

### 11.6 관리자 대시보드
1. 상단: 오늘 할 일(신고 N·최근 가입) / 스크롤: 최근 가입·최근 신고 / 하단: 빠른 링크.
2. 우선순위: 신고 > 회원 관리 > 통계.
3. 로딩 / 정상 / 에러 / 빈 상태("처리할 항목 없음").
4. shadcn Table + Badge. 모바일/데스크톱 모두 사용 가능.

**온보딩 퍼널 다이어그램:**
```
[가입] Google 로그인 → 가입 정보 입력 + 동의 3체크
   → 즉시 회원(status='active') = 풀 사용
   → 바로 홈/디렉토리(풀 열람) + 프로필 완성(2단계, 진행률 바)

[연락] 오픈카톡(본인 공개 시) 직접 연결 → 프로필 상세 "오픈카톡으로 연결" / 없으면 제안 이메일 서버 중계

[안전] 신고 → 운영자 검토 → 숨김/정지(suspend)/차단(block)  ※ 검증 게이트 없음
[배지] (선택) 학교 명부 확보 시 일치 가입자에게 is_verified=true 자동 부여(비차단·정보용)
```

---

## 12. 단계 출시 계획 (Phase 1 Core / Phase 2 / Phase 3)

v1의 "주차별 6도메인 일괄 빌드"를 폐기하고 Phase 구조로 교체한다. 단일 코드베이스 유지, 빌드·출시만 단계화한다.

> **범위 vs 난이도 주의:** 범위는 줄었지만 단위 기능당 난이도(보안·법무)는 올랐다. 따라서 Phase 1에서 "있으면 좋은 것"을 **Phase 1.5**로 분리한다.

### Phase 1 (Core, 3~4주, 비공개 베타)
필수: 로그인(OAuth) / 동의 수집 / 가입=회원(개방형) / 프로필 디렉토리·검색 / 오픈카톡 직접 연결·제안(서버 중계)·차단 / 관리자 최소셋(신고·숨김·정지) / RLS 안전망 + 가드 / 환경 분리 + 백업.
- 완료 시 핵심 가치(동문 디렉토리 → 커피챗 연결)가 완결된다.

### Phase 1.5 (Core 안정화 후, "있으면 좋은 것")
신뢰 시각화 고도화 / 필드별 공개 토글 전체 / 홈 "본인 관련 신호"(프로필 조회수·우리 기수 신규) / 1탭 연결 성사 설문 / **갤러리(운영자 큐레이션 앨범 + R2 이미지 + YouTube 임베드, §6.5)**.
- Phase 1을 늦추지 않도록 분리. Phase 1 출시 후 1~2주 내 부착.

### Phase 2 (2~3주, 사용량 게이트 통과 후)
구인구직/기회 게시판 + 북마크 + "기회" 탭 승격.

### Phase 3 (이후)
인터뷰/콘텐츠 + 뉴스레터 구독 링크 + "콘텐츠" 탭 승격.

### Phase 진입 게이트 (금지선이 아니라 재평가 트리거)

게이트를 "기능 완성"이 아니라 "사용량 신호"로 둔다. 단, **치킨-에그 교착을 막기 위해 게이트는 차단선이 아니라 재평가 트리거**로 운용한다.

| 게이트 | 신호(예시) | 미달 시 행동 |
| --- | --- | --- |
| Phase 2 착수 | 활성 회원 50명 + 프로필 완성 30명 + 커피챗 클릭 누적 40건(§2.2 목표의 약 60% 도달 — 수치 단일 출처는 §2.2) | **차단 대신 재평가:** 왜 안 모이는지 진단 → 필요 시 Phase 2 일부 기능(예: 공고 "열람만")을 미끼로 조기 투입 |
| Phase 3 착수 | Phase 2 사용 신호 충족 | 동일 — 진단 + 부분 조기 투입 옵션 |

> 게이트가 콜드스타트 방지 장치에서 고착 장치로 뒤집히지 않게, "미달 = 다음 Phase 금지"가 아니라 "미달 = 원인 진단 + 미끼 기능 조기 투입 허용"으로 운용한다.

---

## 13. 바이브코딩 작업 방식

### 13.1 절대 금지 프롬프트
```text
한림대 동문 플랫폼 전체를 만들어줘.
```
권한·DB·화면·관리자·보안이 뒤섞여 불안정한 코드가 나온다.

### 13.2 권장 프롬프트 구조 (컬럼명/제약/상태 명시 보강)
```text
[목표] 무엇을 만들지 한 문장.
[사용자] 누가 쓰는지.
[데이터] 정확한 테이블·컬럼명·타입·CHECK 제약·상태값을 명시(예: profiles.status는 text, CHECK in active/suspended/withdrawn default 'active'; is_verified는 boolean default false — 선택적 배지, 접근 제어에 사용 안 함).
[권한] 누가 READ/CREATE/UPDATE/DELETE. withAuth({role:'member'|'admin'})로 감쌀 것(member=로그인+active+not suspended).
[UI] 375px 모바일. 4블록(레이아웃/우선순위/4상태/치수)을 따를 것.
[완료 기준] 통과 조건.
[주의사항] service_role 클라이언트 노출 금지, 브라우저 DB 직접 query 금지, role/status/is_admin/is_verified는 update 화이트리스트에서 제거, 에러/빈 상태 처리.
```

### 13.3 예시 프롬프트: 프로필 디렉토리
```text
[목표] Next.js App Router + Supabase로 동문 프로필 디렉토리 화면을 구현해줘.
[사용자] 로그인 회원이 회사/직무/태그로 동문을 검색·열람한다(가입=회원=풀 열람).
[데이터] profiles 테이블. 컬럼: name(text), organization(text,null 허용), position(text,null), bio(text), coffeechat_status(text CHECK open/monthly/offer_only/busy/private), is_public(boolean), status(text CHECK active/suspended/withdrawn default 'active'), is_verified(boolean default false — 선택적 배지). 태그는 profile_tags×tags 조인. 검색은 name/organization/position에 pg_trgm ILIKE. field_visibility(jsonb)로 필드별 공개 토글 존중.
[권한] 로그인 회원(status='active')은 디렉토리를 풀 열람(각 프로필 field_visibility 존중). 비로그인은 /login으로. 본인·admin만 수정. 데이터 접근은 서버 API에서 withAuth({role:'member'})로 감싸고 service_role로 조회하되, 오픈카톡 URL은 등록자의 공개 설정(field_visibility)에 따라 노출하고 파트너에게는 노출하지 마(목록 카드에는 포함하지 말고 프로필 상세에서만 직접 링크). 브라우저에서 supabase.from('profiles')를 직접 호출하지 마.
[UI] 375px. 상단 고정 검색창+필터칩, 스크롤 카드 리스트(이름/기수 배지/(선택)인증 배지/회사/직무/태그/커피챗 상태), 하단 탭바. 카드에는 커피챗 상태 신호만, 오픈카톡 직접 링크는 프로필 상세에서. 빈 상태 3종(데이터 없음/검색 0건/필터 0건) 분리.
[완료 기준] 이름·회사·직무 부분일치 검색, 커피챗 가능 필터, 카드 클릭→상세, 빈 결과 안내, 로딩 스켈레톤, 에러 재시도. 회원이면 풀 열람, 오픈카톡은 공개 설정 시 프로필 상세에서 직접 연결.
[주의사항] service_role 키 클라이언트 금지. role/status/is_verified는 어떤 update에도 노출 금지. EmptyState/ErrorState/LoadingSkeleton 공통 컴포넌트 사용.
```

### 13.4 예시 프롬프트: 프로필 상세 연락 (오픈카톡 직접 + 제안 이메일 서버 중계 + 차단)
```text
[목표] Next.js App Router + Supabase로 프로필 상세의 연락 영역을 구현해줘. 핵심은 "오픈카톡은 등록자가 공개 설정한 경우 회원에게 직접 표시(직접 클릭=커피챗), 없거나 비공개면 제안 이메일(서버 중계)로 폴백"하는 것이다.
[사용자] 회원(status='active')이 다른 회원의 프로필 상세에서 오픈카톡으로 바로 연결하거나, 오픈카톡이 없으면 제안 이메일을 서버 중계로 보낸다. (요청/수락/거절 단계 없음)
[데이터] profiles(open_kakao_url, coffeechat_status, field_visibility, proposal_email_allowed), blocks(차단 관계). coffeechat_requests 테이블은 사용하지 않는다.
[권한] 모든 로직은 서버 Action/Handler에서 withAuth({role:'member'}). 파트너에게는 오픈카톡을 노출하지 않는다. 차단 관계면 자신의 프로필이 상대에게 숨겨지고 제안 중계도 차단된다.
[로직] 1) 대상의 open_kakao_url이 존재하고 field_visibility상 공개면 "오픈카톡으로 연결" 버튼을 렌더(클릭 시 /api/events에 coffeechat_click 기록 후 새 탭으로 https open.kakao.com 링크 열기). 2) 오픈카톡이 없거나 비공개면 "이메일 제안" 버튼만 노출 → proposal 서버 중계 폼(원문/실제 이메일 비노출, 1일 5건 rate limit, proposal_email_click 기록). 3) 파트너 역할은 1)을 건너뛰고 2)만. 4) 차단 관계 검사.
[완료 기준] 오픈카톡 공개 회원은 직접 버튼으로 새 탭 연결 + coffeechat_click 기록. 비공개/없음이면 제안 폼만 노출되고 실제 이메일이 노출되지 않음. 파트너는 오픈카톡 비열람. 차단 사용자에게 프로필·제안 모두 막힘.
[주의사항] service_role 키 클라이언트 금지. open_kakao_url은 파트너 응답·목록 카드에 포함 금지(공개 설정한 회원의 프로필 상세에서만). 외부 URL은 https + open.kakao.com 화이트리스트만 허용. coffeechat_requests/요청·수락·거절 플로우를 만들지 마.
```

---

## 14. 운영 체계

### 14.1 운영 역할

| 역할 | 담당 업무 |
| --- | --- |
| 총괄 PM | 우선순위·일정·정책 |
| 기술 담당(1~2명 고정) | 코드·배포·환경변수·장애 |
| 회원 운영 담당 | 신고 처리·프로필 품질·정지/차단 |
| **개인정보 보호책임자** | **동의·처리방침·열람/삭제 요청·파기 관리(1명 지정)** |
| 콘텐츠 담당(P1.5 갤러리·P3) | 갤러리 앨범 큐레이션·게시 동의 확인(P1.5)·인터뷰·뉴스레터(P3) |
| 기회/공고 담당(P2) | 공고 수집·승인·마감 |
| QA 담당 | 모바일 테스트·버그 재현 |

> 초기엔 한 사람이 여러 역할을 겸한다 — 특히 **기술 담당 1명이 모든 외부 서비스를 프로젝트 공용 계정 1개로 셋업**한다(부록 E). **"시드 담당"은 별도로 두지 않는다** — 콜드스타트는 커뮤니티 초대 링크 배포로 충족한다(§14.5, §17). 단 개인정보 **보호책임자 1명만은 법적 책임상 명확히 지정**한다.

### 14.2 주간 루틴 (플랫폼 유지, 주 3시간)
1. 신고 처리(SLA 7일) — 숨김/정지/차단.
2. (P2) 마감 지난 공고 닫기.
3. (P3) 콘텐츠 진행 확인.
4. 인기 프로필/커피챗 신호 확인(콘솔 쿼리).
5. 버그 목록 업데이트.

### 14.3 월간 루틴
1. 프로필 업데이트 요청.
2. 관리자 계정 점검.
3. **Supabase DB/MAU % + R2 저장 % 점검**(무료 한도 대비 — Supabase DB 60%/MAU 3만, R2 10GB 60% 도달 시 유료 전환 검토) + **pause 방지 핑 동작 확인**.
4. **파기 대상 처리**(탈퇴 30일 경과자 식별정보 파기, 90일 events 롤업 확인).
5. 외부 링크 점검.
6. 운영 리포트 작성.

### 14.4 학기 인수인계 (시크릿 로테이션 + 소유권 매트릭스)
1. GitHub/Supabase/Vercel/Cloudflare(R2) 접근 권한 정리.
2. `admins` 테이블 갱신(졸업자 제거).
3. **모든 외부 서비스 시크릿 재발급**(service_role·OAuth client secret·Resend API·R2 access key/secret 등).
4. env.md 최신화.
5. **프로젝트 공용 계정 1개 인계** — 비밀번호 + MFA 복구코드 전달 + 모든 시크릿 로테이션(부록 E). (개인 계정 사용 금지 재확인)
6. **백업 복구 리허설 1회**(다음 §14.6).
7. 운영 매뉴얼·security.md 업데이트.
8. 다음 기수에게 1시간 인수인계 + security.md 5계명 필독.

### 14.5 초기 부트스트랩 (별도 담당 없음 — 운영진 본인) — §17 연계
**별도 "시드 담당"은 두지 않는다.** 가입은 누구나 즉시 회원(풀 사용)이 되므로 별도 검증 뿌리가 필요 없다. 콜드스타트는 **출시 시 단톡방·교수 추천 경로로 초대 링크를 배포 → 자발 가입으로 디렉토리를 채우는 것**으로 충족한다(§17). 운영진 본인도 그냥 회원으로 가입해 첫 프로필을 채우면 된다 — 역할이 아니라 출시 체크리스트다.

### 14.6 백업/복구
- 주 1회 자동 `pg_dump`(Supabase 백업 또는 cron).
- **출시 전 복구 리허설 1회**(백업을 Preview 프로젝트에 복원해 실제로 살아나는지 확인). "확인" 한 줄 = 복구 미검증 = 없는 것과 같다.

---

## 15. QA/접근성 체크리스트

### 15.1 모바일 QA
- 375px에서 텍스트 미잘림.
- Android Chrome 버튼·입력 정상.
- 하단 탭이 화면 가리지 않음.
- 검색/필터 후 목록 자연스럽게 갱신.
- 긴 회사명/직무명이 카드 레이아웃 안 깨짐.
- 외부 링크 새 탭 + rel="noopener".

### 15.2 권한 QA (보안 게이트)
- 비로그인 내부 페이지 접근 불가.
- 가입 완료 회원(active)은 디렉토리 풀 열람·프로필 작성 가능, 오픈카톡은 본인 공개 설정 시 프로필 상세에서 직접 표시(목록 카드·파트너 응답에 노출 0).
- 일반 사용자 관리자 접근 불가(서버에서도).
- 본인만 자기 프로필 수정, role/status/is_verified 수정 불가.
- **anon 키 `curl /rest/v1/profiles` → 0행/401 스모크 통과.**
- **ESLint가 components의 admin import 차단(CI 게이트).**
- `.next/`에 service_role 문자열 부재.

### 15.3 기능 QA
- Google 로그인 / 가입 즉시 회원(풀 사용) / 프로필 생성·수정·검색 / 디렉토리 풀 열람 / 오픈카톡 직접 연결(공개 시)·제안 중계·차단 / 오픈카톡·제안 이벤트 기록 / 신고 접수·처리·정지 / (P2)공고 / (P3)콘텐츠.

### 15.4 운영 QA
- 운영자가 관리자 화면만 보고 신고/숨김/정지/차단 처리 가능.
- README로 로컬 실행 가능.
- env.md 환경변수 목록 존재.
- 알려진 버그 목록 존재.
- 처리방침·약관 초안 존재 + 동의 수집 동작.

### 15.5 접근성 QA
- 텍스트 대비 4.5:1 이상.
- 터치 타깃 44px 이상.
- 입력에 라벨 연결.
- 상태 표시는 색만이 아니라 색+아이콘+텍스트.
- 이미지 alt 제공.

---

## 16. 위험과 대응

| 위험 | 영향 | 대응 |
| --- | --- | --- |
| 비동문 사칭 가입 | 실명 커뮤니티 신뢰 저하 | 사후 모더레이션(신고/숨김/정지/차단) + 커뮤니티 초대 경로 + (선택)인증 배지(§6.1b, §6.7) |
| 핸들러 권한 누락 | PII 노출 | RLS deny-all 안전망 + withAuth 강제 |
| 콜드스타트 게이트 교착 | 성장 고착 | 게이트=재평가 트리거 + 미끼 기능 조기 투입(§12) |
| 이메일 단일 채널 실패 | 알림 누락 | 앱 내 상태 배너 1차, 이메일 보조(§6.3, H1) |
| 출시일 대량 알림 시 Resend 일 100통 초과 | 메일 조용히 막힘 | 앱 내 배너 1차로 두고 메일은 분산 발송(§9.2) |
| Vercel Hobby 차단 | 서비스 중단 | 데이터=Supabase·코드=Git 이식성 유지 → 반나절 내 Cloudflare/Netlify 재배포. Phase 2(공고) 진입 시 호스트 재평가(§9.2) |
| Supabase pause/한도 | 월요일 로그인 불가 | pause 방지 핑 기본 설정(cron-job.org) + 이미지 압축 + 한도 모니터(§9.2) |
| R2 CORS 미설정·시크릿 노출 | 이미지 업로드 실패 / 키 유출 | 버킷 CORS(배포 origin·PUT/GET) 설정 + R2 키는 서버 전용(NEXT_PUBLIC 금지)·lib/storage 단일 사용처·학기말 로테이션(§9.2, §14.4) |
| Preview가 운영 DB 접근 | 실명 DB 노출/오염 | Prod/Preview 분리, service_role Prod 전용(§9.3) |
| 백업 미검증 | 복구 불가 | 출시 전 복구 리허설 1회(§14.6) |
| 키가 졸업생 개인 계정에 묶임 | 연락 두절 시 인질 | 프로젝트 공용 계정 1개로 통일 + 학기말 로테이션(§14.4) |
| 탈퇴 시 리텐션 지표 깨짐 | 측정 불가 | salted hash 코호트 키(§6.8) |
| 콘솔 직접 수정 | 데이터 사고 | 관리자 화면만 사용 + 공용 계정 MFA |

---

## 17. 콜드스타트/시드 확보 워크스트림

v1의 "오픈 전 30명" 한 줄을 **개발과 동등한 워크스트림**으로 승격한다. **본인 동의 없는 대리 입력은 PIPA 위반**이므로, "대리 입력 30개"를 "초대 + 본인 등록"으로 교체한다.

| 시드 소스 | 담당(겸직 — 별도 인원 없음) | 목표 | 마감 |
| --- | --- | --- | --- |
| **운영진 본인 가입(첫 프로필)** | 운영진 전원 | 본인 가입 + 직접 아는 동문에게 초대 링크 배포 | Phase 1 출시 전 |
| 졸업 단톡방 초대 링크 | 회원 운영(겸직) | 본인 등록 20명 | Phase 1 1주차부터 병렬 |
| 교수·지인 추천(초대 링크) | 총괄 PM(겸직) | 본인 등록 10명 | Phase 1 2주차 |
| 행사 사진 아카이브(갤러리) | 콘텐츠(겸직) | 행사 앨범 2개 + 사진(게시 동의) | Phase 1.5 |

운영 방식:
- 가입은 누구나 즉시 회원(풀 사용) — 별도 검증 뿌리·시드 없음. 출시 시 단톡방·교수 경로로 **초대 링크를 배포 → 자발 가입으로 디렉토리를 채운다.**
- 빈 상태를 "운영자 큐레이션 핀(추천 동문 고정)" + "의도된 빈 상태 CTA"로 설계.
- **출시 게이트를 "더미 30개"가 아니라 "실제 동문 자발 등록 신호"로 의미 전환.**

런칭 전 최소 데이터(전부 본인 등록·동의 기반):

| 데이터 | 최소 수량 |
| --- | --- |
| 본인 등록 동문 프로필 | 30개 |
| 커피챗 가능 프로필 | 10개 |
| 관리자 계정 | 2개 |
| 테스트 일반 계정 | 2개 |
| (선택, Phase 1.5) 갤러리 행사 앨범 | 2개(게시 동의 확인 사진) |

---

## 18. 최종 출시 기준

Production 공개 전 아래를 모두 만족한다.

**인증/권한**
1. 로그인·가입(즉시 회원)·권한 흐름 정상(검증 게이트 없음).
2. 회원은 디렉토리 풀 열람·프로필 작성 가능, 오픈카톡은 본인 공개 설정 시 프로필 상세에서 직접 표시, 제안 이메일은 서버 중계.
3. 신고 → 검토 → 숨김/정지/차단의 사후 모더레이션 동작.

**보안 5게이트**
4. anon 키 `/rest/v1/profiles` → 0행/401.
5. `.next/`에 service_role 문자열 부재.
6. ESLint admin import 차단 CI 통과.
7. service_role 키 Prod 전용(Preview/클라이언트 부재).
8. 모든 Action/Handler가 withAuth로 감싸짐(코드 리뷰 확인).

**PIPA**
9. 가입 동의 3체크 수집·`consents` 기록.
10. 탈퇴/파기·프로필 비공개 분리 동작.
11. 처리방침·약관(처리위탁/국외이전 포함) 게시.

**운영/인프라**
12. Supabase pause 방지 핑 설정·동작 확인 + 무료 한도 모니터(유료 전환은 예산 확보 시).
13. Prod/Preview 환경 분리.
14. **백업 복구 리허설 1회 완료.**
15. 본인 등록 동문 프로필 30개 이상.

**품질**
16. 모바일 QA(375px) 통과.
17. 접근성 QA 통과.
18. 핵심 이벤트 로깅 동작.
19. README·operations·env·schema·security·ownership·troubleshooting 문서 존재.

---

## 19. 유지보수 문서 목록

| 문서 | 내용 |
| --- | --- |
| `README.md` | 설치·실행·배포 |
| `docs/env.md` | 환경변수 목록·설명(부록 E 키 목록) |
| `docs/operations.md` | 운영자 매뉴얼(주/월/학기 루틴, 이메일 폴백 절차) |
| `docs/qa-checklist.md` | 배포 전 확인(§15 전체) |
| `docs/schema.md` | 확정 스키마·RLS 안전망·권한 기준표 |
| `docs/troubleshooting.md` | 4대 장애 런북(Supabase pause/한도초과/이미지 업로드(R2 presigned·CORS)/OAuth 리다이렉트) |
| **`docs/security.md`** | **신임 운영진 5분 필독 5계명(부록 F)** |
| **`docs/ownership.md`** | **소유권/시크릿 매트릭스(부록 E)** |

---

## 20. 바이브코딩 티켓 백로그 (Phase 재정렬)

각 티켓은 독립 리뷰 가능하고, 끝날 때마다 Vercel Preview에서 모바일 확인한다.

### 20.0 기반 (Phase 1)
| 티켓 | 작업 | 완료 기준 |
| --- | --- | --- |
| T-001 | Next.js + TS + Tailwind + shadcn 생성 | 로컬 실행·Preview 배포 |
| T-002 | Supabase server/client/admin 3분리 + ssr middleware | Auth만 브라우저, service_role 서버 전용, types/database.ts 생성 |
| T-003 | Google OAuth | 로그인/로그아웃, 리다이렉트 작동 |
| T-004 | 3탭 레이아웃 + 공통 컴포넌트(EmptyState/ErrorState/LoadingSkeleton) | 375px 탭 이동, 4상태 컴포넌트 존재 |
| T-005 | `0001_init.sql` 전체 + RLS ENABLE(deny-all) | 전 테이블 생성·RLS 켜짐·types 재생성·seed 입력 |
| T-006 | `withAuth` 가드 + ESLint no-restricted-imports | 가드 미적용 핸들러 데이터 접근 불가, admin import 차단 |
| T-007 | Resend 연동 + notifications 발송 로직 + 앱 내 상태 배너 공통 컴포넌트 | 메일 발송 시 `notifications.email_status`(queued/sent/failed/skipped) 기록, 배너 컴포넌트 재사용 가능, 일 100통 한도 대비 분산 발송 훅 |

### 20.1 가입/동의 (Phase 1)
| 티켓 | 작업 | 완료 기준 |
| --- | --- | --- |
| T-101 | 가입 정보 입력 + 동의 3체크 → 바로 회원 | consents 기록, 미체크 시 제출 불가, 제출 즉시 status='active' 회원(검증 게이트 없음) |
| T-108 | 탈퇴/동의철회(비공개 vs 파기 분리, 탈퇴확인 메일은 T-007 재사용) | anonymized_at 기록, 식별정보 30일 파기 절차 |

### 20.2 프로필/디렉토리/연락 (Phase 1)
| 티켓 | 작업 | 완료 기준 |
| --- | --- | --- |
| T-201 | 내 프로필 작성/수정(2단계·진행률) | 본인만 수정, role/status/is_verified 제외. 가입 즉시 디렉토리/검색에 노출(등재 잠금 없음) |
| T-202 | 동문 목록/검색(pg_trgm) | 회사/직무/태그 검색, 빈 상태 3종. 회원 풀 열람(각 프로필 field_visibility 존중), 목록 카드에 오픈카톡 비노출(상태 신호만) |
| T-203 | 프로필 상세(신뢰 시각화) | 4상태, 회원 풀 열람. 오픈카톡은 본인 공개 설정 시 "오픈카톡으로 연결" 버튼 표시(파트너 제외) |
| T-204 | 프로필 상세 연락: 오픈카톡 직접 버튼(공개 시) + 제안 이메일 서버 중계 | 오픈카톡 공개 회원은 직접 클릭 연결(coffeechat_click 기록), 없거나 비공개면 제안 폼(proposal_email_click 기록), 파트너 오픈카톡 비열람. 요청/수락/거절 단계 없음 |
| T-205 | 차단(block) | 차단 사용자에게 프로필 숨김·제안 중계 차단 |
| T-206 | 제안 이메일 서버 중계 폼 + rate limit | 원문 비노출, 1일 5건 |
| T-207 | events 기록(`/api/events`) + salted hash 코호트 | 핵심 클릭 저장 |

### 20.3 관리자/운영 (Phase 1)
| 티켓 | 작업 | 완료 기준 |
| --- | --- | --- |
| T-301 | 관리자 대시보드(신고/회원 큐) | 오늘 할 일 표시(신고 N·최근 가입) |
| T-302 | 신고 상태머신 + 자동 hidden + 정지(suspend) | open→reviewing→resolved/dismissed, 임계치 3건 자동 숨김, 정지/차단 처리, 신고 1일 10건/동일대상 1건 rate limit |
| T-303 | admins 테이블 + admin_logs | 부트스트랩 후 콘솔 없이 관리자 추가, 작업 기록 |
| T-304 | 운영 문서(README/env/operations/schema/security/ownership/troubleshooting) | 문서 존재·필독 5계명 |
| T-305 | 백업 cron + 복구 리허설 절차 문서 | 주1회 덤프, 복구 1회 검증 |
| T-306 | `/api/health`(DB 1행 select) + pause 방지 핑 | 무인증 200 응답, cron-job.org 5~10분 핑 설정, 핑 계정을 소유권 매트릭스에 기록 |

### 20.1.5 (Phase 1.5)
| 티켓 | 작업 | 완료 기준 |
| --- | --- | --- |
| T-151 | 필드별 공개 토글 전체 | field_visibility 반영 |
| T-152 | 홈 본인 관련 신호 | 프로필 조회수·우리 기수 신규 |
| T-153 | 1탭 연결 성사 설문 | 커피챗 클릭 후 정성 회수 |
| T-154 | lib/storage R2 어댑터 + presigned 업로드(`/api/uploads`) | upload/getSignedUploadUrl/getPublicUrl/delete 구현, withAuth로 presigned PUT 발급, R2 시크릿 서버 전용(NEXT_PUBLIC 부재), 버킷 CORS 설정, 클라 직접 업로드 동작 |
| T-155 | 갤러리 — 운영자 앨범 CRUD + 이미지 업로드(R2) + YouTube 임베드 + 게시동의 체크 | 운영자만 앨범/이미지 CRUD(albums/album_images), T-154 어댑터 재사용, 잘못된 YouTube URL 저장 거부, consent_confirmed 없이는 공개 불가, admin_logs 기록 |
| T-156 | 갤러리 열람(앨범 목록/상세 그리드 뷰) | 로그인 회원만 열람(비로그인 guest 불가), 이미지 그리드 + YouTube 임베드 + 4상태 |

### 20.4 구인구직 (Phase 2)
| 티켓 | 작업 | 완료 기준 |
| --- | --- | --- |
| T-401 | 공고 목록/검색/필터 | published만, 마감 표시 |
| T-402 | 공고 상세 + 외부 지원 링크 | https만, job_apply_click 기록 |
| T-403 | 공고 제보(pending) | 회원 제보 |
| T-404 | 관리자 공고 승인/마감/숨김 | 상태 전환·admin_logs |
| T-405 | 북마크 | 저장/해제 |

### 20.5 콘텐츠 (Phase 3)
| 티켓 | 작업 | 완료 기준 |
| --- | --- | --- |
| T-501 | 콘텐츠 목록/상세 | published 열람 |
| T-502 | 콘텐츠 관리자(작성/수정/숨김) | 운영자 발행 |
| T-503 | 관련 프로필 연결 | 상세에서 프로필 이동 |
| T-504 | 뉴스레터 구독 링크 + 이벤트 | newsletter_click 기록 |

---

## 21. AI 코드 리뷰 체크포인트

### 21.1 보안
- `service_role` 키가 클라이언트 코드에 없다.
- `NEXT_PUBLIC_`에 비밀값이 없다.
- 모든 Action/Handler가 `withAuth(...)` wrapper로 감싸졌다.
- service_role 클라이언트는 `lib/supabase/admin.ts`에서만 import(`components/**` 금지).
- 브라우저에서 Supabase table query 직접 호출 없음.
- 사용자 update 경로에서 role/status/is_admin/is_verified가 화이트리스트로 제거됨.
- 전 테이블 RLS ENABLE(마이그레이션 확인).

### 21.2 UX
- 로딩/에러/빈(4종) 상태가 있다.
- 모바일에서 버튼이 잘리지 않는다.
- 외부 링크 클릭 전 대상이 명확하다.
- 빈 상태 문구가 lib/messages.ts 상수로 관리된다.

### 21.3 운영
- 관리자가 콘솔 없이 주요 작업 처리 가능.
- 상태값 명확: profiles.status(active/suspended/withdrawn) / profiles.is_verified(boolean — 선택적 배지, 접근 제어 미사용) / profiles.coffeechat_status(open/monthly/offer_only/busy/private — 연락 가능 신호) / jobs(draft/pending/published/closed/hidden) / articles(draft/published/hidden) / reports(open/reviewing/resolved/dismissed).
- 삭제보다 숨김(soft delete) 우선.
- 관리자 작업 admin_logs 기록.
- README만으로 새 운영자가 실행 흐름 이해 가능.

---

## 22. PM 최종 판단

이 플랫폼의 성패는 "기능을 많이 만들었는가"가 아니라 "**동문 데이터가 신뢰 가능하고, 실제 연결과 기회가 발생하는가**"에 달려 있다. v2는 이를 위해 세 가지를 생사 요인으로 재선언한다.

1. **신뢰(개방형 회원제 + 사후 모더레이션)** — 검증 게이트로 입구를 막는 대신, 가입은 열고(가입=회원) 사후 모더레이션(신고/정지/차단)과 오픈카톡 본인 공개 설정·제안 이메일 서버 중계로 안전을 확보한다.
2. **데이터/실연결** — Core(디렉토리→커피챗)를 먼저 완결하고, 콜드스타트는 커뮤니티 초대 링크 배포로 채운다.
3. **인수인계 가능성** — RLS 안전망·시크릿 로테이션·소유권 매트릭스·런북·security.md로 매 학기 교체에도 구조가 작동하게 한다.

구현 우선순위:
1. 권한·인증·동의(보안/PIPA 기반)
2. 프로필 디렉토리
3. 커피챗/제안 연결
4. 관리자 최소셋
5. (Phase 2) 구인구직
6. (Phase 3) 콘텐츠

제품의 중심은 끝까지 **프로필**이어야 한다. 구인구직·콘텐츠는 모두 프로필과 연결되어야 게시판 모음이 아니라 동문 네트워크가 된다.

v2의 핵심 전환은 세 가지다. **(a) 보안을 사람의 규율에서 DB가 강제하는 안전망으로 옮겼다** — 학생팀이 실수해도 PII가 새지 않는다. **(b) 불가능한 6주 6도메인 범위를 Core 3~4주로 줄였다** — 단위 난이도(보안·법무)는 올랐으므로 Phase 1.5로 "있으면 좋은 것"을 분리해 완주 가능성을 지켰다. **(c) 검증 게이트를 폐지하고 연락을 단순화했다(v2.3~v2.4)** — 추천·시드·2단계·심사 큐를 없애 개방형 회원제로 옮겼고(v2.3), 구조화된 커피챗 요청/수락/거절 플로우를 제거해 오픈카톡 직접 연결(본인 공개 설정) + 제안 이메일 서버 중계로 단순화했다(v2.4). 안전은 사후 모더레이션이 맡는다. 이 세 전환과 비용·인수인계 보강으로, 이 기획서는 "구현·운영·인수인계 가능한가" 기준을 통과한다.

---

## 부록 A. `0001_init.sql` 확정 스키마

```sql
-- 0001_init.sql : 한림대 MICE 동문 플랫폼 초기 스키마
create extension if not exists pg_trgm;

-- 1. profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('student','alumni','faculty','partner','admin')),
  status text not null default 'active' check (status in ('active','suspended','withdrawn')),
  is_verified boolean not null default false, -- (선택)동문 인증 배지. 접근 제어에 사용하지 않음(정보용, 명부 확보 시 자동 부여)
  student_number text,
  admission_year int,
  graduation_year int,
  department text,
  organization text,
  employment_status text check (employment_status in ('employed','student','seeking')),
  position text,
  bio text,
  career_summary text,
  coffeechat_status text check (coffeechat_status in ('open','monthly','offer_only','busy','private')),
  open_kakao_url text,
  proposal_email_allowed boolean not null default false,
  photo_path text,
  is_public boolean not null default true,
  field_visibility jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_name_trgm on profiles using gin (name gin_trgm_ops);
create index profiles_org_trgm on profiles using gin (organization gin_trgm_ops);
create index profiles_pos_trgm on profiles using gin (position gin_trgm_ops);
create index profiles_status_public on profiles (status, is_public);
create index profiles_grad_year on profiles (graduation_year);

-- 2. verification_roster (미래/선택 — v1 미사용. 명부 확보 시 적재하면 일치 가입자에게 is_verified 배지 자동 부여. 접근 제어 미사용)
create table verification_roster (
  id uuid primary key default gen_random_uuid(),
  student_number text not null,
  name text not null,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_number, name)
);

-- 3. consents
create table consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('terms','privacy','profile_public')),
  doc_version text not null,
  agreed_at timestamptz not null default now()
);
create index consents_profile_doc on consents (profile_id, doc_type);

-- 4. tags / profile_tags
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text
);
create table profile_tags (
  profile_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (profile_id, tag_id)
);

-- 5. blocks
create table blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_profile_id uuid not null references profiles(id) on delete cascade,
  blocked_profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_profile_id, blocked_profile_id)
);

-- 6. reports
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references profiles(id) on delete set null,
  target_type text not null check (target_type in ('profile','job','article')),
  target_id uuid not null,
  reason text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  handled_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 7. admins
create table admins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 8. admin_logs
create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- 9. events / event_daily
create table events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_cohort_hash text not null, -- 탈퇴자 포함 코호트 리텐션 유지용. DB가 누락을 강제 차단(심층 방어)
  profile_id uuid references profiles(id) on delete set null,
  target_id uuid,
  created_at timestamptz not null default now()
);
create index events_type_time on events (event_type, created_at);
create table event_daily (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  event_type text not null,
  count int not null default 0,
  unique (day, event_type)
);

-- 10. notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  channel text not null check (channel in ('in_app','email')),
  payload jsonb,
  read_at timestamptz,
  email_status text check (email_status in ('queued','sent','failed','skipped')),
  created_at timestamptz not null default now()
);

-- 11. albums / album_images (Phase 1.5 — 운영자 큐레이션 갤러리, 이미지는 R2)
create table albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  description text,
  cover_image_key text,           -- R2 객체 키(lib/storage 경유)
  youtube_video_id text,          -- videoId만 저장(잘못된 URL은 앱 레벨에서 거부)
  consent_confirmed boolean not null default false, -- 피사체 게시 동의 확인(미확인 시 공개 금지)
  is_public boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index albums_public_date on albums (is_public, event_date);
create table album_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  image_key text not null,        -- R2 객체 키(lib/storage 경유)
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index album_images_album_sort on album_images (album_id, sort_order);

-- 12. jobs (Phase 2)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete set null,
  title text not null,
  organization text not null,
  job_type text not null check (job_type in ('fulltime','intern','parttime','project','industry','contest','etc')),
  location text,
  deadline date,
  compensation text,
  description text not null,
  requirements text,
  apply_url text,
  contact text,
  status text not null default 'pending' check (status in ('draft','pending','published','closed','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_status_deadline on jobs (status, deadline);
create table job_tags (
  job_id uuid not null references jobs(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (job_id, tag_id)
);
create table job_bookmarks (
  profile_id uuid not null references profiles(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, job_id)
);

-- 13. articles (Phase 3)
create table articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete set null,
  title text not null,
  summary text not null,
  body text not null,
  cover_path text,
  related_profile_id uuid references profiles(id) on delete set null,
  tags text[],
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: 전 테이블 ENABLE (정책 없음 = deny-all 안전망)
alter table profiles enable row level security;
alter table verification_roster enable row level security;
alter table consents enable row level security;
alter table tags enable row level security;
alter table profile_tags enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table admins enable row level security;
alter table admin_logs enable row level security;
alter table events enable row level security;
alter table event_daily enable row level security;
alter table notifications enable row level security;
alter table albums enable row level security;
alter table album_images enable row level security;
alter table jobs enable row level security;
alter table job_tags enable row level security;
alter table job_bookmarks enable row level security;
alter table articles enable row level security;
```

---

## 부록 B. RLS 정책 SQL 예시 (선택적 최적화 — 기본 아님)

> 기본값은 **정책 0개(deny-all)**다. 아래는 anon 직접 읽기가 정말 필요할 때만 쓰는 선택적 최적화다. 적용하면 데이터 접근 경로가 둘로 늘어나니 신중히 한다. **개방형 회원제(v2.3)에는 "인증 회원" 접근 게이트가 없으므로**, 별도 trust 헬퍼 정책은 두지 않는다(배지 `is_verified`는 접근 제어에 쓰지 않는다).

```sql
-- 활성 회원 여부를 판단하는 helper (예시): status='active' + not suspended
create or replace function is_member()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p
    where p.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

-- 예: 공개 콘텐츠를 로그인 회원에게 직접 읽기 허용 (선택)
-- create policy "member read published articles"
--   on articles for select
--   using (status = 'published' and is_member());
```

기본 운영에서는 위 정책을 **주석 상태로 두고**, 모든 읽기를 서버 service_role 경유로 처리한다.

---

## 부록 C. PIPA 동의/처리방침 빈칸-채우기 템플릿

**개인정보 수집·이용 동의(가입 화면)**
```
[필수] 개인정보 수집·이용에 동의합니다.
- 수집 항목: 이름, 이메일, 소속(회사/기관), 직무, 학번/졸업연도, (선택) 프로필 사진·오픈카톡 URL·제안 수신 이메일
- 수집·이용 목적: 동문 디렉토리 제공 및 동문 간 매칭(커피챗/제안/채용)
- 보유·이용 기간: 회원 탈퇴 시까지(탈퇴 후 ___일(기본 30일) 이내 파기)
- 동의 거부 권리 및 불이익: 동의를 거부할 수 있으나, 거부 시 회원 가입 및 서비스 이용이 제한됩니다.
```

**개인정보 처리방침(빈칸 채우기)**
```
1. 처리하는 개인정보 항목: ____________________
2. 수집·이용 목적: ____________________
3. 보유·이용 기간: ____________________
4. 제3자 제공: (없음 / 있을 경우 대상·항목·목적) ____________________
5. 처리위탁·국외이전:
   - Supabase(DB/인증) — 리전: __________
   - Vercel(호스팅/배포) — 리전: __________
   - Resend(트랜잭션 이메일 발송) — 리전: __________
   - Cloudflare R2(이미지 스토리지/CDN) — 리전: __________
6. 파기 절차 및 방법: ____________________
7. 정보주체 권리(열람·정정·삭제·처리정지·동의철회)와 행사 방법: ____________________
8. 개인정보 보호책임자: 성명 ________ / 연락처 ________
9. 만 14세 미만 아동의 개인정보 처리: 본 서비스는 만 14세 이상만 가입할 수 있습니다.
10. 개인정보처리자: (동문회/학과 공식 단위) ____________________
11. 시행일자: 20__.__.__
```

---

## 부록 D. UX 라이팅 가이드 + lib/messages.ts 상수

원칙: 짧고, 다음 행동을 알려준다. 책임을 사용자에게 떠넘기지 않는다.

빈 상태 4종 문구(예):
```ts
// lib/messages.ts
export const EMPTY = {
  noData: { title: '아직 등록된 동문이 없어요', cta: '첫 프로필을 등록해보세요' },
  searchZero: { title: '검색 결과가 없어요', cta: '다른 키워드로 검색해보세요' },
  filterZero: { title: '조건에 맞는 동문이 없어요', cta: '필터를 초기화해보세요' },
};
export const ERROR = {
  generic: { title: '문제가 발생했어요', cta: '다시 시도' },
};
export const CONTACT = {
  // 오픈카톡은 본인 공개 설정 시 직접 표시. 없거나 비공개면 제안 이메일(서버 중계)로 폴백
  openKakao: { title: '오픈카톡으로 바로 연결', cta: '오픈채팅 링크로 대화를 시작해보세요' },
  proposalFallback: { title: '오픈카톡이 없어요', cta: '이메일 제안으로 연락해보세요(서버 중계)' },
};
```

---

## 부록 E. 소유권/시크릿 매트릭스 + 런북

**소유 모델(단순화) — 프로젝트 공용 계정 1개**

모든 외부 서비스를 **하나의 프로젝트 전용 공용 계정**(예: `hallym.mice.alumni@gmail.com` 같은, 졸업해도 넘길 수 있는 전용 Gmail)으로 **기술 담당 1명이 생성·소유**한다. **개인 계정 금지.** 인수인계 = 이 공용 계정 1개의 자격증명(비밀번호 + MFA 복구코드)을 넘기고 시크릿을 로테이션하는 것(§14.4).

- **MFA 필수**(공용 계정 2단계 인증), 복구코드는 안전한 곳에 보관(소수만 접근, 개인 메모 금지).
- 단일 계정 = 단일 실패점 → 복구코드 분실/탈취 방지가 핵심.
- 결제는 무료 단계엔 불필요. 유료 전환 시 학과/동문회 공용 결제수단을 이 계정에 연결(개인 카드 금지).

| 서비스(전부 = 프로젝트 공용 계정 1개 소유) | 비고 / 만료 주의 |
| --- | --- |
| GitHub | 레포·배포 연결 |
| Supabase (Prod/Preview) | 무료 2 프로젝트 |
| Vercel | Hobby 무료 |
| Cloudflare (R2 이미지) | access key/secret 로테이션 |
| Resend | API 키 로테이션 |
| 도메인(선택) | **만료일 기록 필수** |
| Google OAuth | client secret 로테이션 |

**환경변수 목록(`docs/env.md`)**
```
NEXT_PUBLIC_SUPABASE_URL=        # 공개값
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # 공개값(브라우저 노출 정상)
SUPABASE_SERVICE_ROLE_KEY=       # 서버 전용, Prod 환경변수만, 절대 NEXT_PUBLIC 금지
NEXT_PUBLIC_SITE_URL=            # 공개값(OAuth 리다이렉트)
RESEND_API_KEY=                  # 서버 전용
ADMIN_EMAILS=                    # 부트스트랩 관리자(최초만)
R2_ACCOUNT_ID=                   # 서버 전용(Cloudflare R2)
R2_BUCKET=                       # 서버 전용(버킷명)
R2_ACCESS_KEY_ID=               # 서버 전용, 절대 NEXT_PUBLIC 금지, lib/storage 단일 사용처
R2_SECRET_ACCESS_KEY=           # 서버 전용, 절대 NEXT_PUBLIC 금지, lib/storage 단일 사용처
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=  # 공개값(r2.dev 또는 커스텀 도메인 — 이미지 읽기 URL 베이스)
```

**런북(`docs/troubleshooting.md`) — 4대 장애**
1. **Supabase pause(월요일 로그인 불가):** 콘솔에서 프로젝트 resume → pause 방지 핑(cron-job.org `/api/health`) 동작 점검. 원인: 7일 비활성. (유료 전환은 선택)
2. **무료 한도 초과(조회 실패):** Supabase DB/MAU·R2 저장 사용량 확인 → 이미지 압축/삭제 또는 Pro/R2 유료 전환.
3. **이미지 업로드 실패:** presigned PUT URL 발급(서버 withAuth) 정상인지 + R2 버킷 **CORS(허용 origin·PUT/GET)** 설정 + R2 키(env) 유효성 점검. lib/storage 한 곳만 확인.
4. **OAuth 리다이렉트 실패:** Supabase Auth Redirect URLs + Google 콘솔 Authorized redirect URI에 배포 도메인 등록 확인. NEXT_PUBLIC_SITE_URL 일치 확인.

---

## 부록 F. `docs/security.md` — 신임 운영진 5분 필독 5계명

```
1. RLS를 절대 끄지 마라. 전 테이블 ENABLE = 정책 없음 = 안전망. 끄는 순간 anon 키만으로 실명·직장·학번이 샌다.
2. service_role 키는 서버에만. lib/supabase/admin.ts 한 곳에서만 쓰고, NEXT_PUBLIC에 절대 넣지 마라.
3. 모든 서버 핸들러는 withAuth로 감싼다. 감싸지 않으면 데이터에 닿지 않게 되어 있다.
4. 사용자 수정에서 role/status/is_admin/is_verified는 받지 않는다(자기 권한 상승·배지 자가부여 차단).
5. 콘솔로 DB를 직접 만지지 마라. 운영은 관리자 화면으로. 콘솔 접근은 프로젝트 공용 계정 1개 + MFA.
```

출시 보안 스모크(매 배포):

```
- curl로 anon 키 /rest/v1/profiles → 0행 또는 401 확인
- .next/ 빌드에 service_role 문자열 없는지 확인
- ESLint가 components의 admin import를 막는지 확인
```
