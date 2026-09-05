# 원본 규칙 조사와 구현 차이

조사일: 2026-09-05. 게임 유통 페이지와 커뮤니티 위키를 교차 확인했습니다. 웹상의 무관한 복제 사이트는 Space를 드리프트로 설명하거나 로켓을 유도로 설명하는 등 서로 달랐으므로 채택하지 않았습니다. 공식 게임의 실제 서버 코드·물리 상수는 공개되지 않았습니다.

## 확인한 게임 형식

기본 모드는 WASD/방향키로 주행하고 Space로 무기를 사용하는 3분 카트 개인전입니다. 아이템 상자를 통과해 무기를 얻습니다. [CrazyGames의 게임 안내](https://www.crazygames.com/game/smash-karts), [원본 게임](https://smashkarts.io/).

최다 처치 경쟁과 기본 조작을 재현했습니다. 계정, 경험치, 상점, 시즌, 원본 맵, 팀전, 깃발 뺏기 등의 부가 모드는 구현 범위에 넣지 않았습니다. 원본 지형 대신 경사로와 엄폐물이 있는 독립 아레나 하나를 제공합니다.

## 무기 동작

| 무기 | 구현한 동작 | 참고 |
| --- | --- | --- |
| 로켓 | 직진 3발, 직격 50 피해, 작은 범위 피해 | [Rockets](https://smash-karts.fandom.com/wiki/Rockets) |
| 탄환 | 3발씩 9회, 총 27발, 발당 7 피해 | [Bullets](https://smash-karts.fandom.com/wiki/Bullets) |
| 기관총 | 근거리 자동 추적, 166발 / 6.5초 연속 사용, 거리별 피해 감소 | [Machine Gun](https://smash-karts.fandom.com/wiki/Machine_Gun) |
| 곡사포 | 포탄 4발, 포물선, 직격 즉사와 폭발 피해. 길게 눌러 후속 포탄의 사거리를 늘림 | [Cannon Balls](https://smash-karts.fandom.com/wiki/Cannon_Balls) |
| 지뢰 | 뒤에 3개 설치. 상대 접촉 시 처치 | [Ammo / Lasting Seconds](https://smash-karts.fandom.com/wiki/Ammo/Lasting_Seconds) |
| 핵탄두 | 직진 대형 탄두. 넓은 범위 폭발 | [게임 무기 안내](https://www.crazygames.com/game/smash-karts) |
| Lob-Grenuke | 앞으로 던진 뒤 땅에 남고 근접 감지 또는 시간 경과로 폭발 | [무기 분류](https://smash-karts.fandom.com/wiki/Category:Weapons), [효과 안내](https://www.crazygames.com/game/smash-karts) |
| 회전 철퇴 | 5개 철퇴, 6초 지속, 접촉 처치. 무적 효과는 없음 | [Ammo / Lasting Seconds](https://smash-karts.fandom.com/wiki/Ammo/Lasting_Seconds) |
| 무적 | 5초 피해 방지, 접촉 처치 | [Ammo / Lasting Seconds](https://smash-karts.fandom.com/wiki/Ammo/Lasting_Seconds) |
| 눈덩이 | 3발, 3초 빙결, 빙결 카트와 충돌하면 처치. 철퇴 해제, 무적은 빙결 방지 | [Snowball](https://smash-karts.fandom.com/wiki/Snowball) |
| 가짜 상자 | 1개 설치, 일반 상자와 닮은 접촉 함정 | [무기 목록](https://smash-karts.fandom.com/wiki/Weapons), [Ammo / Lasting Seconds](https://smash-karts.fandom.com/wiki/Ammo/Lasting_Seconds) |

기관총이 자동 추적 무기이고 로켓·탄환은 직진 무기라는 차이를 유지했습니다. 위키는 팬 자료이며 패치 시점마다 값이 달라질 수 있습니다. 기관총 166/170발처럼 출처 내부에서도 값이 다른 경우에는 166발을 기준으로 삼았습니다.

## 공개되지 않아 조정한 수치

아래 값은 이 구현의 밸런스이며 원본의 정확한 상수라고 주장하지 않습니다.

- 체력 100, 최대 전진 속도 23 월드 단위/초, 후진 11, 회전·가속·마찰·중력 및 충돌 반경.
- 맵 크기, 충돌 구조, 상자 위치·확률·재생성 5초, 리스폰 2.5초·보호 2초, 라운드 사이 10초.
- 발사체 속도·재사용 간격·수명, 곡사포의 사거리 증가 곡선, 폭발 반경과 거리에 따른 피해 감소.
- 로켓 범위 최대 25, 곡사포 범위 최대 45, 핵탄두 범위 최대 150, Lob-Grenuke 범위 최대 120 피해. 폭발은 중심에서 멀어질수록 줄어듦.
- Lob-Grenuke는 발사부터 4.8초 수명(비행 후 약 4초 이내). 지뢰와 가짜 상자는 0.5초 뒤 활성화, 최대 30초 유지.
- 기관총 탐지 17 월드 단위, 가까운 거리에서 발당 최대 1.25 피해, 거리에 따라 감소. 눈덩이 발당 7 피해.
- 자신의 무기는 자신에게 피해를 주지 않음. 엄폐물은 직선 사격과 폭발 시야를 차단.
- 봇의 이동/발사 판단, 서버 30Hz와 스냅샷 15Hz, 입력 타임아웃 0.5초, 재접속 보존 20초.

원본과 **규칙·효과의 종류를 맞춘 독립 구현**이며, 1:1 역공학 복제 또는 최신 원본 밸런스의 완전한 재현은 아닙니다. 그래픽·캐릭터·맵·UI·효과음은 독립적으로 구성했습니다.

## 검증 범위

규칙 자동 테스트와 실제 WebSocket 클라이언트 테스트로 이동, 서버 권한, 방 공유/격리, 재접속, 무기 피해·상태효과, 경기 종료를 확인합니다. 원본과 실시간 대조 플레이는 하지 않았습니다. Discord 앱 내부와 실제 여러 사용자의 네트워크/기기 성능 검증도 별도 단계입니다.
