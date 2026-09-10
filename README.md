# meme-by-bot

한국 밈·슬랭 라이프사이클 아카이브 (정적 사이트).

## 로컬 개발

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:4321` 을 엽니다.

## 빌드

```bash
npm run build
```

결과물은 `dist/` 에 생성됩니다.

## Cloudflare 배포

Workers 정적 에셋으로 배포합니다.

1. **Build**: `npm run build`
2. **Deploy**: `npx wrangler deploy`

`wrangler.toml` 의 `assets.directory` 가 `./dist` 를 가리킵니다.

```bash
npm run build
npx wrangler deploy
```

## 설정

- 「전부 보기」 토글은 `localStorage` 에 저장됩니다.
- 민감·기본 숨김 항목은 잠금 시 본문(용어·의미·예시)을 HTML 텍스트 노드로 넣지 않습니다. 마스킹 자리표시와 주차/상태만 노출되며, 카드별 「내용 보기」 또는 전역 「전부 보기」로 잠금 해제하면 클라이언트 JS가 JSON 페이로드에서 본문을 채웁니다.
