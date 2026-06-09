import { Article, Fill, LegalShell, OL, UL } from "@/components/legal/Legal";

/**
 * 개인정보 처리방침 (§5.2 / §8.3). 초안 — 시행 전 법무 검토 + 【 】 항목 작성 필요.
 * 실제 데이터 처리(구글 OAuth, Supabase/R2/Resend/Vercel 국외 처리위탁, 탈퇴 파기)에 맞춰 작성.
 */
export const metadata = { title: "개인정보 처리방침 · 한림 MICE 동문" };

export default function PrivacyPage() {
  return (
    <LegalShell
      title="개인정보 처리방침"
      updated={
        <>
          시행일 <Fill>YYYY년 MM월 DD일</Fill>
        </>
      }
      intro="한림 MICE 동문 네트워크(이하 “서비스”)는 「개인정보 보호법」을 준수하며, 정보주체의 개인정보를 다음과 같이 처리합니다."
    >
      <Article title="제1조 (수집하는 개인정보 항목)">
        <p>서비스는 다음의 개인정보를 수집합니다.</p>
        <p className="mt-2 font-medium">가. 가입·로그인(필수)</p>
        <UL
          items={[
            "구글 계정 인증 정보: 이메일, 이름",
            "가입 정보: 이름, 역할(재학생/동문/교직원 등), 학과·전공, 졸업연도 또는 학번",
            "동의 기록: 약관·개인정보·프로필 공개 동의 일시 및 버전",
          ]}
        />
        <p className="mt-3 font-medium">나. 프로필(선택)</p>
        <UL
          items={[
            "입학연도, 회사·기관, 직무, 고용 상태, 한 줄 소개, 경력 요약, 분야 태그, 커피챗 상태, 오픈카톡 링크, 프로필 사진",
          ]}
        />
        <p className="mt-3 font-medium">다. 자동 생성·수집</p>
        <UL
          items={[
            "서비스 이용 기록(프로필 조회·연락 클릭 등) — 개인을 식별하지 않는 비식별 코호트 값으로 저장",
            "접속 로그, 세션 유지용 쿠키",
            "회원이 업로드한 이미지(프로필·행사 사진)",
          ]}
        />
      </Article>

      <Article title="제2조 (개인정보의 수집·이용 목적)">
        <UL
          items={[
            "회원 식별·관리 및 본인 확인",
            "동문 디렉토리 제공 및 검색",
            "회원 간 연락 중계(이메일 제안) 및 연결 지원",
            "행사 기록(갤러리), 구인구직, 콘텐츠 등 커뮤니티 기능 제공",
            "신고 처리·이용 제한 등 서비스 안전 및 부정 이용 방지",
            "공지 전달 및 비식별 통계 작성",
          ]}
        />
      </Article>

      <Article title="제3조 (보유 및 이용 기간)">
        <OL
          items={[
            "회원의 개인정보는 회원 탈퇴 또는 동의 철회 시까지 보유·이용합니다.",
            "탈퇴 시 이름·학번·소속 등 식별 정보는 지체 없이 익명화 또는 파기합니다. 다만 관계 법령에 보존 의무가 있는 경우 해당 기간 동안 보관합니다.",
            "개인을 식별할 수 없는 비식별 통계는 서비스 개선을 위해 보존될 수 있습니다.",
          ]}
        />
      </Article>

      <Article title="제4조 (개인정보의 제3자 제공)">
        <p>
          서비스는 원칙적으로 개인정보를 외부에 제공하지 않습니다. 다만 다음의
          경우는 정보주체 본인의 결정 또는 법령에 따른 것입니다.
        </p>
        <UL
          items={[
            "오픈카톡 링크: 회원 본인이 공개하도록 설정한 경우에만 다른 회원에게 표시됩니다.",
            "이메일 제안: 운영팀이 서버에서 중계하며, 발신자·수신자의 실제 이메일은 상대방에게 제공되지 않습니다.",
            "법령에 근거하거나 수사기관의 적법한 요청이 있는 경우",
          ]}
        />
      </Article>

      <Article title="제5조 (개인정보 처리의 위탁 및 국외 이전)">
        <p>
          서비스는 운영을 위해 아래와 같이 개인정보 처리를 위탁하며, 일부 수탁자는
          국외에 소재합니다. 회원은 가입 시 개인정보 수집·이용 동의를 통해 국외
          이전에 동의한 것으로 봅니다.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">수탁자</th>
                <th className="py-2 pr-3 font-medium">위탁 업무</th>
                <th className="py-2 pr-3 font-medium">이전 국가</th>
                <th className="py-2 font-medium">이전 시점·방법</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {[
                ["Supabase, Inc.", "데이터베이스·회원 인증", "미국", "서비스 이용 시 네트워크를 통해 전송"],
                ["Cloudflare, Inc. (R2)", "이미지 저장", "미국 등", "이미지 업로드 시 전송"],
                ["Resend (이메일 발송)", "제안 이메일 발송", "미국", "제안 발송 시 수신자 이메일·내용 전송"],
                ["Vercel, Inc.", "서비스 호스팅", "미국", "서비스 이용 시 처리"],
              ].map((row) => (
                <tr key={row[0]} className="border-b">
                  <td className="py-2 pr-3">{row[0]}</td>
                  <td className="py-2 pr-3">{row[1]}</td>
                  <td className="py-2 pr-3">{row[2]}</td>
                  <td className="py-2">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          이전되는 항목·보유기간·수탁자 연락처 등 세부사항은 <Fill>법무 검토 후 확정</Fill>합니다.
        </p>
      </Article>

      <Article title="제6조 (정보주체의 권리·의무 및 행사 방법)">
        <OL
          items={[
            "정보주체는 언제든지 개인정보의 열람·정정·삭제·처리정지·동의 철회를 요구할 수 있습니다.",
            "프로필 열람·수정·비공개 전환·탈퇴는 서비스 내 ‘내 정보’에서 직접 할 수 있습니다.",
            "그 밖의 권리 행사는 아래 개인정보 보호책임자에게 요청할 수 있으며, 운영팀은 지체 없이 조치합니다.",
          ]}
        />
      </Article>

      <Article title="제7조 (개인정보의 파기 절차 및 방법)">
        <UL
          items={[
            "파기 절차: 탈퇴·목적 달성 등 사유 발생 시 해당 정보를 식별 불가능하게 익명화하거나 파기합니다.",
            "파기 방법: 데이터베이스 레코드는 영구 삭제 또는 익명화하고, 저장된 이미지 파일은 복구 불가능하게 삭제합니다.",
          ]}
        />
      </Article>

      <Article title="제8조 (개인정보의 안전성 확보 조치)">
        <UL
          items={[
            "접근 권한 통제: 데이터베이스 행 수준 보안(RLS) 적용 및 서버 단일 경로를 통한 접근 제한",
            "전송 구간 암호화(HTTPS) 및 최소 수집 원칙 준수",
            "관리자 작업 기록 보관 및 정기 점검",
          ]}
        />
      </Article>

      <Article title="제9조 (만 14세 미만 아동)">
        <p>
          서비스는 만 14세 이상만 가입할 수 있으며, 만 14세 미만 아동의 개인정보를
          수집하지 않습니다.
        </p>
      </Article>

      <Article title="제10조 (쿠키의 운영)">
        <p>
          서비스는 로그인 세션 유지를 위해 필요한 최소한의 쿠키를 사용합니다.
          정보주체는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우
          로그인 등 일부 기능이 제한될 수 있습니다.
        </p>
      </Article>

      <Article title="제11조 (개인정보 보호책임자)">
        <p>
          개인정보 처리에 관한 업무를 총괄하고 정보주체의 문의·불만을 처리하기 위해
          개인정보 보호책임자를 지정합니다.
        </p>
        <UL
          items={[
            <>성명: <Fill>홍길동</Fill></>,
            <>직책: <Fill>운영팀 개인정보 보호책임자</Fill></>,
            <>연락처: <Fill>이메일 / 전화</Fill></>,
          ]}
        />
        <p className="text-sm text-muted-foreground">
          그 밖에 개인정보 침해에 관한 상담은 개인정보분쟁조정위원회, 한국인터넷진흥원
          개인정보침해신고센터(privacy.kisa.or.kr) 등에 문의할 수 있습니다.
        </p>
      </Article>

      <Article title="제12조 (처리방침의 변경)">
        <p>
          본 처리방침은 <Fill>YYYY년 MM월 DD일</Fill>부터 시행하며, 내용이 변경되는
          경우 변경 사항과 시행일을 서비스 내에 공지합니다.
        </p>
      </Article>
    </LegalShell>
  );
}
