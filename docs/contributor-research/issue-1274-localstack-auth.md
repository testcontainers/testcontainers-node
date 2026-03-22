# Issue GH-1274: LocalStack module docs/examples need updating for auth token requirement

## ✅ 상태: PR 제출 완료

> **2026-03-22**: [PR #1277](https://github.com/testcontainers/testcontainers-node/pull/1277) 제출. `docs/modules/localstack.md`에 auth token 필수화 안내 섹션 추가. 리뷰 대기 중.

## 기본 정보

| 항목 | 내용 |
|------|------|
| 이슈 | [GH-1274](https://github.com/testcontainers/testcontainers-node/issues/1274) |
| 제목 | LocalStack module docs/examples need updating for auth token requirement |
| 작성일 | 2026-03-17 |
| PR | [#1277](https://github.com/testcontainers/testcontainers-node/pull/1277) |
| 긴급도 | 🔴 **2026-03-23부터 `latest` 태그 사용자 기준 breaking change** |
| 모듈 | `packages/modules/localstack` |

## 문제

2026-03-23부터 `localstack/localstack:latest` Docker 이미지가 `LOCALSTACK_AUTH_TOKEN` 환경변수를 **필수**로 요구. `latest` 태그를 사용하는 사용자에게 breaking이며, 버전 고정 사용자는 영향 없을 수 있음. 현재 testcontainers-node의 LocalStack 모듈 문서/예제에 이 토큰에 대한 안내가 없어서 `latest` 사용자들이 혼란을 겪을 수 있음.

## 현재 모듈 구조 분석

`localstack-container.ts`를 보면:
- `GenericContainer`를 상속
- `withEnvironment()`로 `LOCALSTACK_HOST`, `LAMBDA_DOCKER_FLAGS` 등 환경변수 주입
- **사용자가 이미 `.withEnvironment({ LOCALSTACK_AUTH_TOKEN: "..." })`로 토큰을 넣을 수 있음**

→ **모듈 소스 수정은 필수가 아님**. 이슈 제목 그대로 **문서/예제 중심** 변경이 핵심.

### 영향 범위

- **문서/예제** (핵심): auth token 필수화 안내, `.withEnvironment()` 사용 예시 추가
- **모듈 소스** (옵션): `withAuthToken(token)` 같은 편의 메서드 추가는 가능하지만 필수 아님
- **CI** (확인 필요): 기존 테스트가 latest 이미지를 쓴다면 CI 환경에도 토큰 설정 필요할 수 있음

## 해결 방향

1. 문서에 auth token 필수화 안내 + `.withEnvironment()` 사용 예시 추가
2. 필요 시 CI 환경에 토큰 secret 추가

> 편의 메서드(`withAuthToken()` 등) 추가는 **이번 이슈 범위 밖**. 문서 PR 하나로 끝낼 수 있는 일을 코드 변경까지 열어두면 범위만 커짐.

## 머지 확률 평가

| 요소 | 평가 |
|------|------|
| 긴급도 | ✅ **3/23 데드라인 — 즉시 필요** |
| 하위 호환성 | ✅ 문서/예제 변경 중심 |
| 변경 범위 | ✅ 매우 좁음 |
| 경쟁자 | ✅ 없음 (5일간) |
| **종합** | **매우 높음** |

## 포트폴리오 가치

**중간** — 코드 시그널은 약하지만:
- 생태계 변화에 빠르게 대응하는 능력
- 첫 머지 확보용으로 전략적 가치
- LocalStack/AWS 테스팅 경험 어필

## 실행 계획

1. `docs/modules/localstack.md`와 관련 테스트/예제가 `latest`를 실제로 쓰는지 먼저 확인 → 문서만 수정하면 되는지, 테스트/CI도 손대야 하는지 판단
2. LocalStack 공식 문서에서 auth token 변경사항 확인
3. 기존 문서/예제에서 수정할 부분 특정
4. 문서 업데이트 PR 제출 (범위를 문서/예제에 한정)

## 리스크

- 데드라인이 **오늘/내일** — 시간이 촉박
- 메인테이너가 이미 직접 처리했을 가능성 → 이슈 확인 후 진행
- auth token이 유료 플랜 전용일 수 있음 → CI에서 무료 토큰으로 테스트 가능한지 확인 필요
- 문서 변경만으로는 코드 시그널이 약함 — **첫 머지 확보 + 후속 기여 발판** 관점
