# meme-by-bot

한국 밈·슬랭 라이프사이클 아카이브. 매주 봇이 수집 → 선정 → 가드 → 배포 요청을 돌리는 장기 봇 운영 실험입니다.

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
- 접힌 항목은 잠금 시 본문(용어·의미·예시)을 HTML 텍스트 노드로 넣지 않습니다. 표제는 「접혀 있음」이고 주차/상태만 보이며, 항목별 「주의하고 열어보기」 또는 전역 「전부 보기」로 잠금 해제하면 클라이언트 JS가 JSON 페이로드에서 본문을 채웁니다.

## Inbox merge (Grok → memes.json)

Drop survey JSON arrays into `inbox/grok/` (each file = array of meme objects). Then:

```bash
npm run merge-inbox
```

The script validates required fields, **fails on duplicate `id`**, appends new rows to `data/memes.json`, and deletes processed inbox JSON files. A GitHub Action (`.github/workflows/merge-inbox.yml`) runs the same merge on pushes that touch `inbox/grok/**` (or via **workflow_dispatch**) and commits the result.

See `inbox/grok/README.md` for field notes.
