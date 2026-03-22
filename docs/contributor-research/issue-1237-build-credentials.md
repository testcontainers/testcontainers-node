# Issue GH-1237: Credentials not used for pulling images during build

## 기본 정보

| 항목 | 내용 |
|------|------|
| 이슈 | [GH-1237](https://github.com/testcontainers/testcontainers-node/issues/1237) |
| 제목 | Credentials not used for pulling images during build |
| 라벨 | `triage` |
| 클레임 | **없음** (메인테이너가 조사 중) |
| 모듈 | `packages/testcontainers` (코어 — GenericContainerBuilder) |

## 문제

`GenericContainerBuilder`로 Docker 이미지를 빌드할 때, base 이미지를 pull하는 과정에서 `~/.docker/config.json`의 인증 정보가 적용되지 않음. 프라이빗 레지스트리의 base 이미지를 사용하는 Dockerfile 빌드가 실패.

### 증상

```
Error: pull access denied for private-registry.com/base-image
```

레지스트리 주소가 `localhost`로 resolve되는 현상 — `docker-modem`의 레지스트리 해석 로직 문제 추정.

## 조사 상태

- 메인테이너 `cristianrgreco`가 직접 조사 중
- 업스트림 `docker-modem` 이슈 (`apocas/docker-modem#194`) 연관 가능성 식별
- 아직 triage 단계 — 근본 원인 미확정

## 해결 방향

### 시나리오 1: testcontainers-node 내부 문제

- `GenericContainerBuilder`에서 빌드 시 auth config를 올바르게 전달하도록 수정

### 시나리오 2: docker-modem 업스트림 문제

- `docker-modem`에 PR 제출 → testcontainers-node에서 업데이트된 버전 사용

## 머지 확률 평가

| 요소 | 평가 |
|------|------|
| 메인테이너 관심 | ✅ 직접 조사 중 |
| 근본 원인 | ⚠️ **미확정** — 업스트림일 수 있음 |
| 변경 범위 | ⚠️ 코어 인증 로직 |
| **종합 머지 확률** | **중하 (30-40%)** |

## 포트폴리오 가치

**높음** — 성공 시:
1. Docker 인증 메커니즘 깊은 이해
2. 업스트림 + 다운스트림 크로스 프로젝트 디버깅 능력
3. 보안 관련 기여

## 리스크

- **근본 원인이 업스트림(`docker-modem`)일 가능성** — 두 프로젝트에 PR 필요
- 메인테이너가 직접 조사 중 — 기여 공간이 좁을 수 있음
- triage 단계라 방향이 바뀔 수 있음
- **모니터링 대상** — 근본 원인 확정 후 판단
