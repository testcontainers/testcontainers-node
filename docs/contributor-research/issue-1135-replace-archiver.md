# Issue GH-1135: Replace `archiver` with lighter alternative

## 기본 정보

| 항목 | 내용 |
|------|------|
| 이슈 | [GH-1135](https://github.com/testcontainers/testcontainers-node/issues/1135) |
| 제목 | Replace `archiver` with lighter alternative |
| 라벨 | `enhancement`, `never-stale` |
| 클레임 | **없음** (2차례 PR 닫힌 후 방치) |
| 모듈 | `packages/testcontainers` (코어) |

## 문제

`archiver` 패키지가 64개 의존성, 7MB+ 용량으로 프로젝트 전체 의존성의 상당 부분을 차지.

이슈 작성자가 보안 관련 근거로 [socket.dev 공급망 공격 보고서](https://socket.dev/blog/npm-author-qix-compromised-in-major-supply-chain-attack)를 링크함 — archiver의 일부 의존성 저자(`qix-`)의 npm 계정이 침해된 사건. 단, archiver 자체가 직접 침해된 것은 아니며 **간접적 공급망 리스크**로 보는 것이 정확.

### 현재 `archiver` 사용처

Docker 컨테이너에 파일/디렉토리를 복사할 때 tar 아카이브를 생성하는 데 사용:
- 파일 복사 (단일/다중)
- 디렉토리 복사
- 인라인 콘텐츠 복사
- `copyUIDGID` 옵션 지원

## 이전 PR 분석

### PR #1161 (ayuhito — modern-tar 저자, 2025-10 닫힘)

- **접근**: `modern-tar` 라이브러리 사용 (48MB → 38MB 감소)
- **닫힌 이유**: 메인테이너가 명시적으로 답변 — "`modern-tar`가 아직 몇 주밖에 안 된 라이브러리라서 `archiver`(검증된 라이브러리) 대비 신뢰성이 부족하다. 대신 `tar-stream`이나 `tar-fs` 같은 검증된 대안을 선호한다."
- **메인테이너 피드백**: "I'd happily accept a PR to use `tar-stream` or `tar-fs`"

### PR #1246 (cristianrgreco — 메인테이너 본인, 2026-02 닫힘)

- **접근**: `tar-fs` 사용
- **닫힌 이유**: 코멘트 없이 닫힘. 원인 미확인 — copy 동작의 전체 케이스 커버가 어려웠을 가능성이 있지만, **확인된 사실이 아님. 추가 조사 필요.**

## 해결 방향

PR #1161 리뷰에서 메인테이너가 `tar-stream` (archiver가 내부적으로 사용) 또는 `tar-fs`를 선호한다고 명시. PR #1246이 `tar-fs`로 시도했으나 닫힌 이유를 파악하는 것이 핵심.

### 사전 조사 항목

1. **PR #1246의 닫힌 이유 확인** — diff와 CI 결과 분석, 필요 시 메인테이너에게 직접 질문
2. `archiver` → `tar-stream` 직접 교체 POC
3. 모든 copy 케이스 목록 작성 (파일, 디렉토리, 인라인, copyUIDGID)
4. 기존 테스트 전부 통과 확인

## 머지 확률 평가

| 요소 | 평가 |
|------|------|
| 메인테이너 관심 | ✅ "PR welcome!" + `never-stale` + 선호 대안 명시 |
| 의존성 감소 효과 | ✅ 7MB+ 제거 |
| 경쟁자 | ✅ 현재 없음 |
| 기술적 난이도 | ⚠️ 높음 — copy 동작의 엣지 케이스가 많을 수 있음 |
| 이전 실패 이력 | ⚠️ 2차례 PR 닫힘 (1건은 라이브러리 선택 문제, 1건은 원인 미확인) |
| **종합** | **중간** — PR #1246 실패 원인 파악 여부에 크게 좌우 |

## 포트폴리오 가치

**높음**:
1. 의존성 최적화 — 실무에서 중요한 주제
2. 공급망 보안 인식
3. 코어 패키지 개선

## 리스크

- PR #1246이 왜 닫혔는지 모르는 상태에서 시작하면 같은 함정에 빠질 수 있음 → **사전 조사 필수**
- copy 동작의 엣지 케이스가 많을 수 있음
- 코어 패키지 변경이라 회귀 리스크
- **GH-1274 이후, 신뢰 쌓은 뒤 시도 권장**
