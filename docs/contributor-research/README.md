# Testcontainers-Node 기여 전략 리서치

## 목표

TypeScript/Node.js 백엔드 엔지니어가 `testcontainers/testcontainers-node`에 기여할 후보를 정리한 문서.

**"머지 가능성이 높으면서 백엔드 채용팀에 어필할 수 있는 것"**을 기준으로 선별.

## 저장소 상태

- 업스트림: `testcontainers/testcontainers-node`
- 포크: `PreAgile/testcontainers-node`
- 최종 업데이트: 2026-03-22

### 저장소 특징

| 항목 | 내용 |
|------|------|
| Stars | 2,499 |
| 언어 | TypeScript |
| 구조 | 모노레포 — `packages/testcontainers` (코어) + 41개 모듈 (`packages/modules/*`) |
| 오픈 이슈 | **5개** (매우 적음 — 잘 관리되는 프로젝트) |
| 라이선스 | MIT |

### 메인테이너 분석

| 이름 | GitHub | 역할 | 커밋 수 | 특징 |
|------|--------|------|---------|------|
| Cristian Greco | `cristianrgreco` | 핵심 메인테이너 | 640 / 1,125 총 커밋 (57%, 봇 제외 시 ~75%) | 리뷰 빠름 (당일~2일), 높은 품질 기준 |
| Andreas Hofmeister | `HofmeisterAn` | 간헐적 기여 | 소수 | 가끔 리뷰 참여 |

> 참고: 총 1,125 커밋 중 github-actions(195), dependabot(75) 등 봇 커밋이 상당수. 인간 기여자 중에서는 cristianrgreco가 압도적이나, "90%+"는 과장된 수치.

### 머지 패턴

- **리뷰 속도**: 심플한 PR은 당일, 기능 PR은 1-2일, 외부 기여자는 1-3주
- **선호**: 깔끔하고 집중된 PR. API 변경 시 문서 업데이트 같은 PR에 포함
- **높은 품질 기준**: GH-1135에서 2개 PR(외부 + 메인테이너 본인 것) 모두 닫힘 — 기준이 엄격
- **새 모듈 수용적**: Oracle Free 모듈 PR #1242가 17일 만에 머지

### AGENTS.md 준수 필수

이 프로젝트는 `AGENTS.md`에 PR 프로세스, 라벨링, 커밋 컨벤션이 상세히 기술됨. CONTRIBUTING.md보다 AGENTS.md를 따를 것.

## 완료된 PR

| PR | 이슈 | 상태 | 날짜 |
|----|------|------|------|
| — | — | 아직 없음 | — |

## 현재 후보 (2026-03-22)

| 순위 | 이슈 | 유형 | 머지 확률 | 포트폴리오 가치 | 상태 | 상세 문서 |
|------|------|------|----------|---------------|------|----------|
| 1 | `GH-1274` LocalStack auth token 대응 | 문서/예제 | 매우 높음 | 중간 | 🔴 **긴급** (3/23 데드라인), 문서 중심 변경 | [issue-1274-localstack-auth.md](issue-1274-localstack-auth.md) |
| 2 | 새 모듈 추가 (예: Meilisearch) | 신규 모듈 | 중상 | 중상 | 🟢 상시 가능, 선례 있으나 개별 심사 | [new-module-opportunity.md](new-module-opportunity.md) |
| 3 | `GH-1135` archiver 경량 대체 | 보안/성능 | 중간 | 높음 | 🟡 2차례 PR 닫힘, 실패 원인 분석 선행 필수 | [issue-1135-replace-archiver.md](issue-1135-replace-archiver.md) |
| 4 | `GH-1049` BuildKit 빌드 로그 디코딩 | 기능 개선 | 낮음-중간 | 매우 높음 | 🟡 기술적 난이도 매우 높음 | [issue-1049-buildkit-logs.md](issue-1049-buildkit-logs.md) |
| 5 | `GH-1237` Docker 빌드 시 인증 정보 미적용 | 버그 | 낮음-중간 | 높음 | 🟡 업스트림 이슈 가능성, 모니터링 | [issue-1237-build-credentials.md](issue-1237-build-credentials.md) |

## 추천 실행 순서

### 1단계: 빠른 첫 머지

1. **GH-1274 LocalStack auth token** — 긴급. 3/23부터 `localstack/localstack:latest`에 `LOCALSTACK_AUTH_TOKEN` 필수. 기존 모듈은 `.withEnvironment()`로 이미 토큰 전달 가능하므로, **문서/예제 업데이트가 핵심**. 소스 수정(편의 메서드 등)은 메인테이너 선호에 따라 옵션

### 2단계: 안정적인 기여

2. **새 모듈 추가** — 검증된 패턴. 41개 기존 모듈이 템플릿. 실제 사용하는 서비스로 만들면 자연스러운 스토리

### 3단계: 고난이도 도전

3. **GH-1135 archiver 교체** — 2번의 실패 원인 분석 후 시도. 성공하면 보안+성능 기여로 큰 임팩트
4. **GH-1049 BuildKit 로그** — protobuf 디코딩 역량 필요. 성공하면 매우 인상적
5. **GH-1237 인증 버그** — 업스트림 `docker-modem` 이슈일 가능성. 복합 디버깅 필요

## 피해야 할 이슈

| 이슈 | 이유 |
|------|------|
| `GH-687` / PR #1096 HealthCheckWaitStrategy | `digital88`가 7개월째 활발히 작업 중 |
| PR #1276 lock file per user | `seanwu1105`가 방금 제출 (3/21) |

## PR 제출 전 체크리스트

- [ ] AGENTS.md 규칙 확인
- [ ] `npm run format` 실행
- [ ] `npm run lint` 실행
- [ ] 관련 모듈만 타겟 테스트 실행
- [ ] 문서 변경 시 같은 PR에 포함
- [ ] PR 하나에 이슈 하나
- [ ] 커밋 메시지 컨벤션 준수
