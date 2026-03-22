# Issue GH-1049: Container build logs aren't useful because they're encoded (BuildKit)

## 기본 정보

| 항목 | 내용 |
|------|------|
| 이슈 | [GH-1049](https://github.com/testcontainers/testcontainers-node/issues/1049) |
| 제목 | Container build logs aren't useful because they're encoded |
| 라벨 | `enhancement`, `never-stale` |
| 클레임 | `weyert`가 관심 표시 → **8개월+ PR 미제출** |
| 모듈 | `packages/testcontainers` (코어) |

## 문제

Docker BuildKit이 활성화된 환경에서 컨테이너 빌드 로그가 base64 인코딩된 protobuf 메시지(`aux` 프로퍼티)로 반환됨. 사람이 읽을 수 없는 형태.

### 현재 동작

```
빌드 로그: {"aux": "CjkKOBo2c2hhMjU2OjA5MWNkYTJlZj..."}
```

### 원하는 동작

```
Step 1/5: FROM node:18-alpine
Step 2/5: WORKDIR /app
...
```

## 기술적 배경

- BuildKit은 Docker의 차세대 빌드 엔진 (Docker Desktop에서 기본 활성)
- 빌드 진행 상황을 gRPC/protobuf로 전송
- `aux` 필드에 base64로 인코딩된 protobuf 메시지가 들어있음
- 디코딩하려면 `moby/buildkit`의 gRPC 스키마 정의가 필요

## 메인테이너 코멘트

> "I tried decoding these messages... it was not at all trivial."
> "Do not copy/paste schemas into the repository."

→ protobuf 스키마를 벤더링하지 말고, 적절한 디코딩 방법을 찾아야 함

## 해결 방향

1. `moby/buildkit` gRPC 정의에서 관련 proto 파일 확인
2. `protobufjs` 또는 유사 라이브러리로 런타임 디코딩
3. 또는 BuildKit API의 non-aux 출력 모드 활용 (가능한 경우)

## 머지 확률 평가

| 요소 | 평가 |
|------|------|
| 메인테이너 관심 | ✅ `never-stale` + 명시적 관심 |
| 기술적 난이도 | ❌ **매우 높음** — 메인테이너도 "trivial하지 않다"고 |
| 경쟁자 | ✅ 8개월간 미실행 |
| 스키마 제약 | ⚠️ proto 스키마 벤더링 금지 |
| **종합 머지 확률** | **중하 (35-45%)** |

## 포트폴리오 가치

**매우 높음** — 성공 시:
1. Docker/BuildKit 내부 지식
2. protobuf 디코딩 역량
3. 메인테이너도 못 풀었던 문제 해결 — 최강 시그널

## 리스크

- **메인테이너가 "trivial하지 않다"고 한 난이도** — 상당한 연구 시간 필요
- protobuf 스키마 벤더링 금지 정책 → 대안 접근법 필요
- 새 의존성(protobufjs 등) 추가에 대한 거부감 가능
- **충분한 신뢰와 실력 검증 후 도전 권장**
