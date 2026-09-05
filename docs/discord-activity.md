# Discord Activity 설정

이 구현은 Discord 없이도 실행됩니다. Discord 내 실행은 아래 외부 설정을 마친 뒤 사용할 수 있습니다. 다른 게임의 지역 제한 해제를 제공하지 않습니다.

1. [Discord Developer Portal](https://discord.com/developers/applications)에 본인 앱을 만들고 **Activities**를 활성화합니다.
2. 공개 **Application ID**를 `game/.env`의 `VITE_DISCORD_CLIENT_ID`에 넣습니다. 클라이언트 비밀 키는 프런트엔드에 넣지 않습니다. 이 구현은 사용자 지정 닉네임을 쓰므로 OAuth/사용자 개인정보 권한을 요청하지 않습니다.
3. `npm run build` 후 `npm start`로 웹과 WebSocket이 같은 3001 포트에서 실행되도록 합니다.
4. 서비스를 공개 **HTTPS** 주소로 배포합니다. 개발할 때는 해당 포트로 연결되는 본인 터널을 사용할 수 있습니다. 프록시는 WebSocket도 지원해야 합니다.
5. Portal의 **Activities → URL Mappings**에서 `/`를 배포 도메인으로 매핑합니다. Target에는 프로토콜을 빼고 도메인을 입력합니다. 이 프로젝트의 클라이언트는 Discord에서 `wss://{현재 Discord 프록시 호스트}/.proxy/ws`를 사용하고 서버는 `/ws`와 `/.proxy/ws`를 받습니다.
6. 런타임 서버에도 `VITE_DISCORD_CLIENT_ID`를 지정하세요. 서버가 해당 앱의 `.discordsays.com` / `.discordsez.com` 출처만 추가 허용합니다. 별도 프런트엔드 도메인을 쓰면 `ALLOWED_ORIGINS`에 정확한 origin을 추가합니다.
7. Portal의 앱 테스트 권한과 Discord 개발자 설정을 구성하고 본인 서버/DM에서 Activity를 실행합니다. 두 계정으로 같은 활동에 들어가 **Discord 배틀 시작**을 누르면 같은 방에 연결되어야 합니다.

SDK의 `ready()` 후 `instanceId`를 방 연결 키로 사용합니다. `instanceId`는 방을 찾기 위한 정보이며 사용자 인증으로 간주하지 않습니다. 현재 방 코드를 아는 사람은 일반 웹 클라이언트에서도 입장할 수 있습니다. Discord 구성원만 입장시키는 제품으로 확장하려면 서버에서 Discord OAuth와 Activity 인스턴스 검증을 추가해야 합니다.

외부 게임 서버 주소를 강제로 설정하면 Discord 프록시의 CSP에 차단될 수 있습니다. Activity에서는 `VITE_GAME_SERVER_URL`을 비워 같은 출처의 URL Mapping을 사용하세요.

실제 Discord 앱 등록, HTTPS 서비스 운영, 활동 내 네트워크 연결은 아직 외부 설정/검증이 필요합니다. 이 저장소의 네트워크 테스트는 일반 WebSocket 환경입니다.

참고:

- [공식 Activity 만들기](https://docs.discord.com/developers/activities/building-an-activity)
- [SDK reference: ready](https://docs.discord.com/developers/developer-tools/embedded-app-sdk)
- [같은 instanceId로 멀티플레이 구성](https://docs.discord.com/developers/activities/development-guides/multiplayer-experience)
- [프록시, WebSocket, 네트워크 설정](https://docs.discord.com/developers/activities/development-guides/networking)
- [URL Mapping 설정](https://docs.discord.com/developers/activities/development-guides/local-development)
