# overlay-monitor

실시간 시스템 오버레이 모니터. 화면 오른쪽에 항상 위로 떠있는 작업관리자.

## 기능

| 탭 | 기능 |
|----|------|
| 개요 | CPU / 메모리 / 네트워크 실시간 그래프 |
| CPU | 전체 로드 + 코어별 사용률 |
| 프로세스 | 목록 조회, 검색, 강제 종료 |
| 디스크 | 드라이브별 용량 |

- 항상 위 (핀 토글)
- 투명도 조절 슬라이더
- 프로세스 검색 + KILL 버튼

## 설치 및 실행

```bash
npm install
npm start
```

## 요구 사항

- Node.js 18+
- npm

## 빌드 (exe)

```bash
npm install --save-dev electron-builder
npx electron-builder --win
```
