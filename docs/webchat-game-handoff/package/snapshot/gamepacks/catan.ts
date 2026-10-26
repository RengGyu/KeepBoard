import type { Assertion, GamePack, Player, Value } from "../shared/types.ts";
import { catanInformationProfile } from "./catanProfile.ts";

const baseCatanPack: GamePack = {
  "id": "catan-base",
  "version": "1.2.0",
  "title": "CATAN",
  "edition": "Base Game (2020 rules)",
  "description": "기본판의 공개 보드와 현재 턴, 각 플레이어가 직접 제공하는 비공개 손패 상태를 기록합니다. 보드 좌표 대신 타일 앵커를 사용하며, 보이지 않는 정보나 과거 의도는 추측하지 않습니다.",
  "sources": [
    {
      "id": "rules-setup",
      "title": "CATAN Game Rules & Almanac (2020)",
      "url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
      "section": "Game Components, Setting Up the Game, Starting Map; pp. 1–3"
    },
    {
      "id": "rules-turn",
      "title": "CATAN Game Rules & Almanac (2020)",
      "url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
      "section": "Turn Overview and Trade/Build; pp. 3–4"
    },
    {
      "id": "rules-seven",
      "title": "CATAN Game Rules & Almanac (2020)",
      "url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
      "section": "Rolling a 7 and Activating the Robber; Game Rules p. 4"
    },
    {
      "id": "rules-development",
      "title": "CATAN Game Rules & Almanac (2020)",
      "url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
      "section": "Playing Development Cards; Game Rules p. 4; Almanac: Development Cards, p. 7"
    },
    {
      "id": "rules-awards",
      "title": "CATAN Game Rules & Almanac (2020)",
      "url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
      "section": "Longest Road and Largest Army; Almanac pp. 8–9"
    },
    {
      "id": "rules-components",
      "title": "CATAN Game Rules & Almanac (2020)",
      "url": "https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf",
      "section": "Game Components and component supply; pp. 1, 3"
    }
  ],
  "placement": {
    "topology": "catan-base",
    "slots": [
      { "kind": "road", "locationTypes": ["edge", "unplaced"] },
      { "kind": "settlement", "locationTypes": ["vertex", "unplaced"] },
      { "kind": "city", "locationTypes": ["vertex", "unplaced"] },
      { "kind": "terrain", "locationTypes": ["hex", "unplaced"] },
      { "kind": "number-token", "locationTypes": ["hex", "unplaced"] },
      { "kind": "robber", "locationTypes": ["hex", "unplaced"] }
    ]
  },
  "fields": [
    { "key": "components.observed", "label": "사진 속 구성물", "description": "부분 사진·카드·말을 종류와 원본 영역별로 기록합니다. 전체 판을 추측하지 않습니다.", "scope": "public", "type": "json", "acquisition": "observe", "group": "components", "presentation": "scene" },
    { "key": "player.components.observed", "label": "내 구성물", "description": "내 사진에 실제 보이는 카드·토큰을 개별 항목으로 기록합니다.", "scope": "player", "type": "json", "acquisition": "observe", "group": "components", "presentation": "scene" },
    {
      "key": "board.layout",
      "presentation": "scene",
      "label": "19개 타일과 공개 배치",
      "description": "지형·숫자 토큰·도둑·도로·정착지·도시를 타일 앵커(예: r3c2 북쪽 꼭짓점)로 기록합니다. 사진처럼 정확한 좌표를 만들 필요는 없습니다.",
      "scope": "public",
      "type": "json",
      "acquisition": "observe",
      "group": "board",
      "sourceId": "rules-setup"
    },
    {
      "key": "board-public-state",
      "label": "공개 보드 상태 보존",
      "description": "보드, 토큰, 도둑, 공개 말과 특수 카드를 실제 배치 그대로 보존합니다.",
      "scope": "public",
      "type": "json",
      "acquisition": "preserve",
      "group": "board",
      "sourceId": "rules-setup"
    },
    {
      "key": "player-resource-hands",
      "label": "플레이어별 자원 손패 보존",
      "description": "각 소유자의 자원 카드를 분리된 봉투/트레이에 보존합니다.",
      "scope": "player",
      "type": "json",
      "acquisition": "preserve",
      "group": "resources",
      "sourceId": "rules-turn"
    },
    {
      "key": "currentPlayer",
      "label": "현재 플레이어",
      "description": "현재 주사위를 가진 플레이어의 ID입니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-turn"
    },
    {
      "key": "turn.phase",
      "label": "현재 턴 단계",
      "description": "기본 규칙의 주사위·도둑 해결·거래·건설·턴 종료 중 현재 단계입니다.",
      "scope": "public",
      "type": "select",
      "options": [
        {
          "value": "await_roll",
          "label": "주사위 굴리기 전"
        },
        {
          "value": "production",
          "label": "자원 생산·지급 중"
        },
        {
          "value": "seven_discard",
          "label": "7: 자원 버리기"
        },
        {
          "value": "robber_move",
          "label": "7/기사: 도둑 이동"
        },
        {
          "value": "robber_steal",
          "label": "도둑: 자원 훔치기"
        },
        {
          "value": "trade",
          "label": "거래"
        },
        {
          "value": "build",
          "label": "건설/개발 카드 구매"
        },
        {
          "value": "end_turn",
          "label": "턴 넘기기 전"
        }
      ],
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-turn"
    },
    {
      "key": "turn.diceTotal",
      "label": "이번 주사위 합",
      "description": "두 주사위 합계(2–12)입니다. 아직 굴리지 않았다면 비워 둡니다.",
      "scope": "public",
      "type": "number",
      "acquisition": "observe",
      "group": "turn",
      "sourceId": "rules-turn"
    },
    {
      "key": "turn.productionResolved",
      "label": "생산 처리 완료",
      "description": "굴림에 따른 생산이 끝났는지 기록합니다. 7이면 자원을 받지 않으므로 생산 없음이 확인되면 완료로 둡니다.",
      "scope": "public",
      "type": "boolean",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-turn"
    },
    {
      "key": "turn.actionDevelopmentCardPlayed",
      "label": "이번 턴 행동 개발 카드 사용 여부",
      "description": "현재 플레이어가 기사 또는 진보 카드를 사용했는지 기록합니다. 사용한 행동 카드는 공개됩니다.",
      "scope": "public",
      "type": "boolean",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-development"
    },
    {
      "key": "turn.developmentCardBoughtThisTurn",
      "label": "이번 턴 개발 카드 구매 여부",
      "description": "현재 플레이어가 이번 턴에 개발 카드를 구매했는지 기록합니다. 카드 종류와 정체는 공개하지 않습니다.",
      "scope": "public",
      "type": "boolean",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-development"
    },
    {
      "key": "turn.sevenDiscardsResolved",
      "label": "7의 자원 버리기 처리 완료",
      "description": "주사위 7에서 버려야 하는 플레이어들의 절차가 끝났는지 기록합니다.",
      "scope": "public",
      "type": "boolean",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-seven"
    },
    {
      "key": "robber.hexAnchor",
      "label": "현재 도둑 타일",
      "description": "도둑이 있는 타일의 앵커 ID입니다. 좌표 대신 타일 이름/행열 ID를 사용합니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "observe",
      "group": "board",
      "sourceId": "rules-seven"
    },
    {
      "key": "robber.resolutionStep",
      "label": "도둑/7 처리 단계",
      "description": "7을 굴렸을 때 현재 처리 단계입니다. 7이 아니면 not_applicable입니다.",
      "scope": "public",
      "type": "select",
      "options": [
        {
          "value": "not_applicable",
          "label": "해당 없음"
        },
        {
          "value": "discard",
          "label": "자원 버리기"
        },
        {
          "value": "move",
          "label": "도둑 이동"
        },
        {
          "value": "steal",
          "label": "자원 훔치기"
        },
        {
          "value": "complete",
          "label": "처리 완료"
        }
      ],
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-seven"
    },
    {
      "key": "robber.targetHexAnchor",
      "label": "도둑 이동 목적지",
      "description": "현재 처리에서 도둑을 옮길 타일 앵커 ID입니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-seven"
    },
    {
      "key": "robber.stolenFromPlayerId",
      "label": "도둑에게서 자원을 빼앗긴 플레이어",
      "description": "훔치기를 마친 경우 자원을 준 플레이어 ID입니다. 자원 종류는 공개하지 않습니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-seven"
    },
    {
      "key": "player.resources.counts",
      "label": "내 자원 손패 수량",
      "description": "소유자 본인의 벽돌·목재·양모·곡물·광석 수량을 기록합니다. 다른 플레이어 수량을 보고 추정하지 않습니다.",
      "scope": "player",
      "type": "json",
      "acquisition": "ask",
      "group": "resources",
      "sourceId": "rules-turn",
      "preservationId": "player-resource-hands"
    },
    {
      "key": "player.resources.total",
      "label": "내 자원 카드 총수",
      "description": "소유자가 실제 카드 수를 셉니다. 7이 나오면 8장 이상인 플레이어는 절반(내림)을 버립니다.",
      "scope": "player",
      "type": "number",
      "acquisition": "ask",
      "group": "resources",
      "sourceId": "rules-seven",
      "preservationId": "player-resource-hands"
    },
    {
      "key": "player.resources.mustDiscardHalf",
      "label": "7에서 절반 버리기 대상",
      "description": "주사위가 7이고 자원 카드가 8장 이상일 때 절반(내림)을 버려야 합니다.",
      "scope": "player",
      "type": "boolean",
      "acquisition": "observe",
      "group": "turn",
      "sourceId": "rules-seven"
    },
    {
      "key": "player.development.handCounts",
      "label": "내 손에 든 개발 카드",
      "description": "소유자 본인이 현재 손에 든 카드의 수량/종류를 기록하거나, 실물 카드를 소유자별로 따로 보존합니다. 상대 손패를 추정하지 않습니다.",
      "scope": "player",
      "type": "json",
      "acquisition": "observe",
      "group": "development",
      "sourceId": "rules-development",
      "preservationId": "player.development.handCounts"
    },
    {
      "key": "newly-bought-development-card",
      "label": "이번 턴에 산 개발 카드 보존",
      "description": "이번 턴 구매 카드를 기존 손패와 구분해 구매자 소유로 보존합니다.",
      "scope": "player",
      "type": "json",
      "acquisition": "preserve",
      "group": "development",
      "sourceId": "rules-development"
    },
    {
      "key": "player.development.boughtThisTurnType",
      "label": "이번 턴에 산 개발 카드 종류",
      "description": "소유자 본인에게만 묻습니다. 구매가 없으면 none, 구매했다면 knight/progress/victory_point 중 하나를 고릅니다.",
      "scope": "player",
      "type": "select",
      "options": [
        {
          "value": "none",
          "label": "구매하지 않음"
        },
        {
          "value": "knight",
          "label": "기사"
        },
        {
          "value": "progress",
          "label": "진보 카드"
        },
        {
          "value": "victory_point",
          "label": "승점 카드"
        },
        {
          "value": "mixed",
          "label": "여러 종류의 카드를 구매함"
        }
      ],
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-development",
      "preservationId": "newly-bought-development-card"
    },
    {
      "key": "player.development.boughtThisTurnIdentity",
      "label": "이번 턴에 산 개발 카드 이름",
      "description": "이번 턴 구매한 카드 전부의 종류·수량·구분을 기록하거나 새 카드 묶음을 따로 보관합니다. 예: 기사 1장, 승점 1장.",
      "scope": "player",
      "type": "text",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-development",
      "preservationId": "newly-bought-development-card"
    },
    {
      "key": "player.development.knightsPlayed",
      "label": "내가 공개 사용한 기사 수",
      "description": "소유자 앞에 공개된 기사 카드 수입니다. 손에 든 미사용 기사는 세지 않습니다.",
      "scope": "player",
      "type": "number",
      "acquisition": "observe",
      "group": "awards",
      "sourceId": "rules-awards"
    },
    {
      "key": "player.development.newActionCardUnavailableThisTurn",
      "label": "새 행동 개발 카드 이번 턴 사용 불가",
      "description": "이번 턴에 산 기사/진보 카드는 같은 턴에 사용할 수 없습니다.",
      "scope": "player",
      "type": "boolean",
      "acquisition": "observe",
      "group": "turn",
      "sourceId": "rules-development"
    },
    {
      "key": "player.development.newVictoryPointCanBeRevealedToWin",
      "label": "새 승점 카드의 승리 선언 예외",
      "description": "승점 카드는 새 행동 카드 제한과 구별합니다. 실제 승리 여부는 본인 차례의 총승점으로 판단합니다.",
      "scope": "player",
      "type": "boolean",
      "acquisition": "observe",
      "group": "turn",
      "sourceId": "rules-development"
    },
    {
      "key": "player.development.qualifiesForLargestArmy",
      "label": "최대 기사단 기준 충족",
      "description": "공개 사용한 기사 3장 이상으로 기준을 충족하는지 나타냅니다.",
      "scope": "player",
      "type": "boolean",
      "acquisition": "observe",
      "group": "derived",
      "sourceId": "rules-awards"
    },
    {
      "key": "player.road.longestContinuousSegments",
      "label": "내 최장 연속 도로 길이",
      "description": "분기점에서는 가장 긴 한 갈래만 셉니다. 보드에 놓인 도로에서 현재 길이를 확인합니다.",
      "scope": "player",
      "type": "number",
      "acquisition": "observe",
      "group": "awards",
      "sourceId": "rules-awards"
    },
    {
      "key": "player.road.qualifiesForLongestRoad",
      "label": "최장 도로 기준 충족",
      "description": "연속 도로 5개 이상으로 기준을 충족하는지 나타냅니다.",
      "scope": "player",
      "type": "boolean",
      "acquisition": "observe",
      "group": "derived",
      "sourceId": "rules-awards"
    },
    {
      "key": "turn.actionDevelopmentCardLimitReached",
      "label": "이번 턴 행동 개발 카드 제한 도달",
      "description": "현재 플레이어가 기사/진보 카드를 이미 하나 사용한 상태입니다.",
      "scope": "public",
      "type": "boolean",
      "acquisition": "observe",
      "group": "turn",
      "sourceId": "rules-development"
    },
    {
      "key": "awards.longestRoadHolder",
      "label": "최장 도로 카드 보유자",
      "description": "실제 카드 보유자를 기록합니다. 길이만으로 동률 상태의 보유자를 추측하지 않습니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "observe",
      "group": "awards",
      "sourceId": "rules-awards"
    },
    {
      "key": "awards.largestArmyHolder",
      "label": "최대 기사단 카드 보유자",
      "description": "실제 카드 보유자를 기록합니다. 기사 수만으로 동률 상태의 보유자를 추측하지 않습니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "observe",
      "group": "awards",
      "sourceId": "rules-awards"
    },
    {
      "key": "physical.bankResources",
      "label": "은행 자원 카드",
      "description": "은행의 벽돌·목재·양모·곡물·광석 더미를 종류별로 분리해 보존합니다.",
      "scope": "public",
      "type": "json",
      "acquisition": "preserve",
      "group": "components",
      "sourceId": "rules-components"
    },
    {
      "key": "physical.availablePieces",
      "label": "색상별 남은 구성품",
      "description": "각 색상의 남은 도로·정착지·도시 조각을 기록하거나 색상별로 따로 보존합니다.",
      "scope": "public",
      "type": "json",
      "acquisition": "preserve",
      "group": "components",
      "sourceId": "rules-components"
    },
    {
      "key": "ordered-development-deck",
      "label": "뒤집힌 개발 카드 더미 보존",
      "description": "더미는 물리적으로 원래 순서를 유지하고 순서 자체는 디지털화하지 않습니다.",
      "scope": "public",
      "type": "json",
      "acquisition": "preserve",
      "group": "components",
      "sourceId": "rules-components"
    },
    {
      "key": "player.private.planNote",
      "label": "내가 말한 계획 메모(선택)",
      "description": "플레이어가 실제로 말한 계획만 기록합니다. 말하지 않은 의도나 과거 생각은 게임 상태에서 추론하지 않습니다.",
      "scope": "player",
      "type": "text",
      "acquisition": "ask",
      "group": "private",
      "sourceId": "rules-turn"
    },
    {
      "key": "turn.pendingEffect",
      "label": "아직 처리 중인 효과·절차",
      "description": "아직 남은 처리를 선택하세요. 완료한 행동을 추측하지 않습니다.",
      "scope": "public",
      "type": "select",
      "options": [
        {
          "value": "none",
          "label": "없음 · 현재 단계 계속"
        },
        {
          "value": "production",
          "label": "자원 생산·지급"
        },
        {
          "value": "trade",
          "label": "거래·교환"
        },
        {
          "value": "knight",
          "label": "기사·도둑 효과"
        },
        {
          "value": "road_building",
          "label": "도로 건설 카드"
        },
        {
          "value": "year_of_plenty",
          "label": "발견 카드"
        },
        {
          "value": "monopoly",
          "label": "독점 카드"
        },
        {
          "value": "other",
          "label": "다른 처리·선택"
        }
      ],
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-development"
    },
    {
      "key": "turn.pendingEffectDetails",
      "label": "완료한 처리와 남은 처리",
      "description": "예: 도로 건설 카드의 첫 도로 완료, 두 번째 도로를 놓기 전. 지급 중이면 아직 받을 사람과 자원을 적습니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-development"
    },
    {
      "key": "resume.nextProcedure",
      "label": "재개 후 다음 절차",
      "description": "확인한 중단 단계에 따른 절차입니다.",
      "scope": "public",
      "type": "text",
      "acquisition": "ask",
      "group": "resume",
      "sourceId": "rules-turn"
    },
    {
      "key": "player.discard.remainingCount",
      "label": "아직 버려야 하는 자원 수",
      "description": "7의 버리기를 진행 중일 때 실제로 남은 수량입니다. 이미 마쳤다면 0입니다.",
      "scope": "player",
      "type": "number",
      "acquisition": "ask",
      "group": "turn",
      "sourceId": "rules-seven"
    }
  ],
  "requirements": [
    {
      "id": "need-board-layout",
      "scope": "public",
      "fields": [
        "board.layout"
      ],
      "reason": "타일 앵커를 이용해 공개 보드와 놓인 말을 복원합니다.",
      "priority": 100,
      "sourceId": "rules-setup"
    },
    {
      "id": "need-turn-player-and-phase",
      "scope": "public",
      "fields": [
        "currentPlayer",
        "turn.phase"
      ],
      "reason": "현재 턴의 소유자와 진행 단계를 알아야 턴별 질문을 적용할 수 있습니다.",
      "priority": 100,
      "sourceId": "rules-turn"
    },
    {
      "id": "need-dice-after-roll",
      "scope": "public",
      "fields": [
        "turn.diceTotal"
      ],
      "when": {
        "op": "or",
        "conditions": [
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "seven_discard"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "robber_move"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "robber_steal"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "trade"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "build"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "end_turn"
          },
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "production"
          }
        ]
      },
      "reason": "주사위 값은 생산과 7 처리 여부를 결정합니다.",
      "priority": 90,
      "sourceId": "rules-turn"
    },
    {
      "id": "need-production-resolution",
      "scope": "public",
      "fields": [
        "turn.productionResolved"
      ],
      "when": {
        "op": "or",
        "conditions": [
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "trade"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "build"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "end_turn"
          },
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "production"
          }
        ]
      },
      "reason": "굴림 이후 단계라면 생산이 처리되었는지 확인합니다.",
      "priority": 85,
      "sourceId": "rules-turn"
    },
    {
      "id": "need-player-resource-hands",
      "scope": "player",
      "fields": [
        "player.resources.counts",
        "player.resources.total"
      ],
      "reason": "손패는 소유자별 비공개 상태로 보존하고, 7에서 버릴 카드 수를 판단하는 데 총수가 필요합니다.",
      "priority": 95,
      "sourceId": "rules-seven"
    },
    {
      "id": "need-seven-resolution",
      "scope": "public",
      "fields": [
        "turn.sevenDiscardsResolved",
        "robber.resolutionStep",
        "robber.hexAnchor"
      ],
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.diceTotal",
            "owner": "public",
            "op": "eq",
            "value": 7
          },
          {
            "op": "or",
            "conditions": [
              {
                "field": "turn.phase",
                "owner": "public",
                "op": "eq",
                "value": "seven_discard"
              },
              {
                "field": "turn.phase",
                "owner": "public",
                "op": "eq",
                "value": "robber_move"
              },
              {
                "field": "turn.phase",
                "owner": "public",
                "op": "eq",
                "value": "robber_steal"
              }
            ]
          }
        ]
      },
      "reason": "7이면 생산이 없고, 자원 버리기와 도둑 이동 절차를 완료해야 합니다.",
      "priority": 100,
      "sourceId": "rules-seven"
    },
    {
      "id": "need-robber-destination",
      "scope": "public",
      "fields": [
        "robber.targetHexAnchor"
      ],
      "when": {
        "field": "robber.resolutionStep",
        "owner": "public",
        "op": "eq",
        "value": "move"
      },
      "reason": "도둑을 옮기는 중이면 목적지 타일 앵커를 기록합니다.",
      "priority": 90,
      "sourceId": "rules-seven"
    },
    {
      "id": "need-robber-victim",
      "scope": "public",
      "fields": [
        "robber.stolenFromPlayerId"
      ],
      "when": {
        "field": "robber.resolutionStep",
        "owner": "public",
        "op": "eq",
        "value": "steal"
      },
      "reason": "훔치기를 마친 뒤 자원을 준 플레이어를 기록합니다.",
      "priority": 75,
      "sourceId": "rules-seven"
    },
    {
      "id": "need-action-card-play-status",
      "scope": "public",
      "fields": [
        "turn.actionDevelopmentCardPlayed"
      ],
      "when": {
        "op": "or",
        "conditions": [
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "trade"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "build"
          }
        ]
      },
      "reason": "기사/진보 카드는 턴마다 하나의 사용 제한이 있습니다.",
      "priority": 80,
      "sourceId": "rules-development"
    },
    {
      "id": "need-purchase-status",
      "scope": "public",
      "fields": [
        "turn.developmentCardBoughtThisTurn"
      ],
      "when": {
        "op": "or",
        "conditions": [
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "trade"
          },
          {
            "field": "turn.phase",
            "owner": "public",
            "op": "eq",
            "value": "build"
          }
        ]
      },
      "reason": "이번 턴 구매 여부를 공개 사건으로 확인하고, 카드 정체는 소유자 범위에 둡니다.",
      "priority": 80,
      "sourceId": "rules-development"
    },
    {
      "id": "need-bought-card-type",
      "scope": "player",
      "fields": [
        "player.development.boughtThisTurnType"
      ],
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.developmentCardBoughtThisTurn",
            "owner": "public",
            "op": "eq",
            "value": true
          },
          {
            "field": "currentPlayer",
            "owner": "public",
            "op": "eq",
            "value": "$owner"
          },
          {
            "op": "or",
            "conditions": [
              {
                "field": "turn.phase",
                "owner": "public",
                "op": "eq",
                "value": "trade"
              },
              {
                "field": "turn.phase",
                "owner": "public",
                "op": "eq",
                "value": "build"
              }
            ]
          }
        ]
      },
      "reason": "구매한 플레이어 본인만 카드 종류를 기록합니다.",
      "priority": 85,
      "sourceId": "rules-development"
    },
    {
      "id": "need-bought-card-identity",
      "scope": "player",
      "fields": [
        "player.development.boughtThisTurnIdentity"
      ],
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "currentPlayer",
            "owner": "public",
            "op": "eq",
            "value": "$owner"
          },
          {
            "field": "player.development.boughtThisTurnType",
            "owner": "$owner",
            "op": "neq",
            "value": "none"
          }
        ]
      },
      "reason": "구매한 카드가 확인되는 경우에만 이름을 추가합니다.",
      "priority": 60,
      "sourceId": "rules-development"
    },
    {
      "id": "need-public-award-holders",
      "scope": "public",
      "fields": [
        "awards.longestRoadHolder",
        "awards.largestArmyHolder"
      ],
      "reason": "실제 특수 카드 보유자를 확인해 동률/인계 상태를 그대로 보존합니다.",
      "priority": 55,
      "sourceId": "rules-awards"
    },
    {
      "id": "need-award-eligibility-counts",
      "scope": "player",
      "fields": [
        "player.road.longestContinuousSegments",
        "player.development.knightsPlayed"
      ],
      "reason": "현재 도로 길이와 공개 기사 수가 기준 이상인지 확인할 때 사용합니다.",
      "priority": 45,
      "sourceId": "rules-awards"
    },
    {
      "id": "need-pending-effect",
      "scope": "public",
      "fields": [
        "turn.pendingEffect"
      ],
      "reason": "같은 배치라도 처리 중인 효과에 따라 재개 절차가 달라집니다.",
      "priority": 99
    },
    {
      "id": "need-pending-details",
      "scope": "public",
      "fields": [
        "turn.pendingEffectDetails"
      ],
      "when": {
        "op": "or",
        "conditions": [
          {
            "field": "turn.pendingEffect",
            "op": "neq",
            "value": "none"
          },
          {
            "field": "turn.productionResolved",
            "op": "eq",
            "value": false
          }
        ]
      },
      "reason": "이미 마친 행동을 반복하지 않고 남은 처리부터 이어 갑니다.",
      "priority": 99
    },
    {
      "id": "need-development-hand",
      "scope": "player",
      "fields": [
        "player.development.handCounts"
      ],
      "reason": "기존 개발 카드를 기록하거나 소유자별 실물 묶음으로 유지합니다.",
      "priority": 70
    },
    {
      "id": "need-ordered-deck",
      "scope": "public",
      "fields": [
        "ordered-development-deck"
      ],
      "reason": "찍지 않은 더미 내부 순서는 실물 묶음으로 보존합니다.",
      "priority": 80
    },
    {
      "id": "need-discard-remaining",
      "scope": "player",
      "fields": [
        "player.discard.remainingCount"
      ],
      "when": {
        "field": "turn.phase",
        "op": "eq",
        "value": "seven_discard"
      },
      "reason": "현재 손패로 이미 버린 수량을 추측하지 않고 실제 남은 처리만 확인합니다.",
      "priority": 100
    }
  ],
  "derivedRules": [
    {
      "id": "newly-bought-action-card-cannot-be-played",
      "scope": "player",
      "when": {
        "op": "or",
        "conditions": [
          {
            "field": "player.development.boughtThisTurnType",
            "owner": "$owner",
            "op": "eq",
            "value": "knight"
          },
          {
            "field": "player.development.boughtThisTurnType",
            "owner": "$owner",
            "op": "eq",
            "value": "progress"
          },
          {
            "field": "player.development.boughtThisTurnType",
            "owner": "$owner",
            "op": "eq",
            "value": "mixed"
          }
        ]
      },
      "field": "player.development.newActionCardUnavailableThisTurn",
      "value": true,
      "reason": "이번 턴에 산 기사/진보 카드는 같은 턴에 사용할 수 없습니다. 이 제한은 승점 카드 예외와 구분됩니다.",
      "sourceId": "rules-development"
    },
    {
      "id": "one-action-development-card-per-turn",
      "scope": "public",
      "when": {
        "field": "turn.actionDevelopmentCardPlayed",
        "owner": "public",
        "op": "eq",
        "value": true
      },
      "field": "turn.actionDevelopmentCardLimitReached",
      "value": true,
      "reason": "기사 또는 진보 카드를 이미 하나 사용했으므로 이번 턴의 추가 행동 개발 카드 사용은 끝났습니다.",
      "sourceId": "rules-development"
    },
    {
      "id": "new-victory-point-card-winning-exception",
      "scope": "player",
      "when": {
        "op": "or",
        "conditions": [
          {
            "field": "player.development.boughtThisTurnType",
            "owner": "$owner",
            "op": "eq",
            "value": "victory_point"
          },
          {
            "field": "player.development.boughtThisTurnType",
            "owner": "$owner",
            "op": "eq",
            "value": "mixed"
          }
        ]
      },
      "field": "player.development.newVictoryPointCanBeRevealedToWin",
      "value": true,
      "reason": "새 승점 카드도 본인 차례에 총 10점 이상으로 승리할 때 공개할 수 있습니다. 이 기록 자체가 승리를 뜻하지는 않습니다.",
      "sourceId": "rules-development"
    },
    {
      "id": "longest-road-threshold",
      "scope": "player",
      "when": {
        "field": "player.road.longestContinuousSegments",
        "owner": "$owner",
        "op": "gt",
        "value": 4
      },
      "field": "player.road.qualifiesForLongestRoad",
      "value": true,
      "reason": "최장 연속 도로가 5개 이상이면 카드 보유 자격 기준을 만족합니다. 카드 보유자는 실제 상태를 따릅니다.",
      "sourceId": "rules-awards"
    },
    {
      "id": "largest-army-threshold",
      "scope": "player",
      "when": {
        "field": "player.development.knightsPlayed",
        "owner": "$owner",
        "op": "gt",
        "value": 2
      },
      "field": "player.development.qualifiesForLargestArmy",
      "value": true,
      "reason": "공개 사용한 기사가 3장 이상이면 최대 기사단 카드의 기준을 만족합니다. 카드 보유자는 실제 상태를 따릅니다.",
      "sourceId": "rules-awards"
    },
    {
      "id": "resume-pending",
      "scope": "public",
      "when": {
        "field": "turn.pendingEffect",
        "op": "neq",
        "value": "none"
      },
      "field": "resume.nextProcedure",
      "value": "기록한 미해결 효과·선택의 남은 부분부터 처리합니다. 완료한 하위 처리는 반복하지 않습니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-await_roll",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "await_roll"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "현재 플레이어의 주사위 굴리기부터 이어 갑니다. 이번 턴 개발 카드 사용 기록은 유지합니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-production",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "production"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "아직 지급하지 않은 사람과 자원부터 처리합니다. 이미 지급한 자원은 다시 주지 않습니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-trade",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "trade"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "현재 플레이어의 거래·건설을 계속하거나 턴을 마치고 다음 플레이어에게 넘깁니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-build",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "build"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "거래·건설을 계속하거나 턴을 마칩니다. 이번 턴 구매한 행동 개발 카드는 구분해 둡니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-end_turn",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "end_turn"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "남은 효과가 없다면 턴을 마치고 다음 플레이어에게 넘깁니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-seven_discard",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "seven_discard"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "각 플레이어의 남은 버리기 수량부터 처리한 뒤 도둑 절차를 계속합니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-robber_move",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "robber_move"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "도둑 이동의 남은 처리부터 이어 가고 훔치기 절차를 확인합니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    },
    {
      "id": "resume-robber_steal",
      "scope": "public",
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.phase",
            "op": "eq",
            "value": "robber_steal"
          },
          {
            "field": "turn.pendingEffect",
            "op": "eq",
            "value": "none"
          }
        ]
      },
      "field": "resume.nextProcedure",
      "value": "기록한 훔치기 절차의 남은 부분부터 이어 갑니다.",
      "reason": "확인한 중단 단계와 남은 처리에서 도출한 다음 절차입니다.",
      "sourceId": "rules-turn"
    }
  ],
  "preservationTemplates": [
    {
      "id": "board-public-state",
      "visualFields": ["board.layout", "components.observed", "robber.hexAnchor"],
      "label": "공개 보드와 보드 위 말",
      "description": "원본과 공개 배치 기록을 확보한 뒤 타일·숫자 토큰·색상별 말을 구분해 정리합니다. 복원은 타일 → 숫자 → 말 순서로 진행합니다.",
      "scope": "public",
      "conditions": [
        "말의 소유·위치·관계가 원본 또는 배치 기록에 남았는지 확인합니다.",
        "타일·숫자 토큰·색상별 말을 구분된 칸에 넣고 위치를 적습니다.",
        "기록하지 못한 관계는 분해하지 않고 실제 배치나 별도 묶음으로 유지합니다."
      ],
      "restoreAfter": []
    },
    {
      "id": "player-resource-hands",
      "label": "플레이어별 자원 손패",
      "description": "각 플레이어의 자원 카드를 색상/소유자별로 분리한 봉투나 작은 트레이에 넣습니다. 손패를 한데 섞지 않습니다.",
      "scope": "player",
      "conditions": [
        "벽돌·목재·양모·곡물·광석 카드를 소유자별로 따로 둡니다.",
        "숨은 손패는 해당 플레이어만 열 수 있도록 닫힌 봉투/트레이를 사용합니다.",
        "복원할 때는 공개 보드 상태를 맞춘 뒤 각 봉투를 소유자에게 돌려주고 종류별 수량을 대조합니다."
      ],
      "restoreAfter": [
        "board-public-state"
      ]
    },
    {
      "id": "player.development.handCounts",
      "label": "기존 개발 카드 손패",
      "description": "턴 시작 전에 보유하던 개발 카드는 소유자별 불투명 봉투에 넣고, 다른 플레이어 카드와 섞지 않습니다.",
      "scope": "player",
      "conditions": [
        "기사·진보·승점 카드를 현재 소유자별로 나눠 둡니다.",
        "카드를 공개하거나 다시 섞지 않습니다. 현재 손패 카드 수/종류를 확인할 수 있으면 소유자만 기록합니다.",
        "복원할 때는 공개 보드 상태를 맞춘 뒤 기존 카드를 소유자에게 돌려주고 승점 카드는 계속 뒤집어 둡니다."
      ],
      "restoreAfter": [
        "board-public-state"
      ]
    },
    {
      "id": "newly-bought-development-card",
      "label": "이번 턴에 새로 산 개발 카드",
      "description": "이번 턴 구매 카드는 기존 카드와 구분해 소유자 봉투의 별도 칸에 둡니다. 기사/진보 카드는 다음 턴 전에는 사용하지 않습니다.",
      "scope": "player",
      "conditions": [
        "이번 턴 구매 카드를 기존 손패와 분리하고 구매 플레이어와 턴 ID를 연결합니다.",
        "카드 정체를 다른 플레이어에게 공개하지 않습니다.",
        "복원할 때는 기존 개발 카드를 맞춘 뒤 새 카드를 구매자에게 돌려주고 기사/진보 카드는 이번 턴에 사용하지 않습니다."
      ],
      "restoreAfter": [
        "player.development.handCounts"
      ],
      "when": {
        "op": "and",
        "conditions": [
          {
            "field": "turn.developmentCardBoughtThisTurn",
            "owner": "public",
            "op": "eq",
            "value": true
          },
          {
            "field": "currentPlayer",
            "owner": "public",
            "op": "eq",
            "value": "$owner"
          }
        ]
      }
    },
    {
      "id": "ordered-development-deck",
      "label": "뒤집힌 개발 카드 더미",
      "description": "개발 카드 더미를 원래 순서 그대로 뒤집어 둡니다. 순서를 디지털로 읽거나 기록하지 않습니다.",
      "scope": "public",
      "conditions": [
        "더미를 기존 보관 위치에 뒤집어 두고, 폐기 카드와 분리합니다.",
        "카드를 세거나 펼쳐 순서를 노출하지 않습니다.",
        "복원할 때 공개 보드 상태를 맞춘 뒤 같은 더미를 같은 방향과 순서로 둡니다."
      ],
      "restoreAfter": [
        "board-public-state"
      ]
    },
    {
      "id": "physical.bankResources",
      "label": "은행 자원 카드 더미",
      "description": "은행의 다섯 자원 더미를 종류별로 나눠 지정된 보관함에 둡니다.",
      "scope": "public",
      "conditions": [
        "벽돌·목재·양모·곡물·광석 더미를 각각 별도 칸에 둡니다.",
        "은행 카드와 플레이어 손패를 같은 봉투에 넣지 않습니다.",
        "복원할 때 공개 보드 상태를 맞춘 뒤 다섯 자원 더미를 은행 위치에 되돌립니다."
      ],
      "restoreAfter": [
        "board-public-state"
      ]
    },
    {
      "id": "physical.availablePieces",
      "label": "색상별 남은 도로·정착지·도시 조각",
      "description": "각 색상의 남은 도로·정착지·도시를 색상별 칸에 보관합니다.",
      "scope": "public",
      "conditions": [
        "미사용 조각은 색상·종류별로 구분합니다.",
        "보드에서 회수한 말과 미사용 말을 구분해 보관합니다.",
        "공개 배치를 먼저 복원한 뒤 미사용 조각을 소유자에게 돌려줍니다."
      ],
      "restoreAfter": [
        "board-public-state"
      ]
    },
    {
      "id": "played-development-cards",
      "label": "사용한 개발 카드",
      "description": "사용한 기사·진보 카드를 소유자별로 묶어 미사용 손패·남은 덱과 구분합니다.",
      "scope": "player",
      "conditions": [
        "공개 기사 수와 소유자 구분을 유지합니다.",
        "사용한 카드를 남은 덱이나 손패에 섞지 않습니다."
      ],
      "restoreAfter": [
        "board-public-state"
      ]
    }
  ],
  "supportGaps": [
    "이 팩은 기본판 3–4인 게임만 다룹니다. 5–6인 확장과 Seafarers, Cities & Knights 등 확장은 포함하지 않습니다.",
    "타일 앵커는 보드를 설명하기 위한 행열 이름입니다. 임의 배치의 정확한 꼭짓점/모서리 좌표를 자동 검증하지 않습니다.",
    "상대 플레이어의 숨은 자원·개발 카드 내용은 추정하지 않습니다. 소유자 본인이 제공한 비공개 값만 기록합니다.",
    "개발 카드 더미는 실물 순서를 그대로 유지합니다. 뒤집힌 더미의 순서는 디지털화하거나 검증하지 않습니다.",
    "동률 시 특수 카드 보유와 도둑/자원 버리기 절차의 진행 단계는 실제 테이블 상태를 관찰해 기록합니다. 과거 의도나 미기록 행동은 추론하지 않습니다."
  ]
};

export const catanPack = catanInformationProfile(baseCatanPack);

const exampleBoardLayout = {
  shape: "classic-19-hex-example",
  anchors: "r{row}c{column}; pointy-top hex vertices N, NE, SE, S, SW, NW; schematic axial q/r coordinates",
  tiles: [
    { id: "r1c1", resource: "forest", number: 5, q: 0, r: -2 },
    { id: "r1c2", resource: "pasture", number: 2, q: 1, r: -2 },
    { id: "r1c3", resource: "hills", number: 6, q: 2, r: -2 },
    { id: "r2c1", resource: "fields", number: 9, q: -1, r: -1 },
    { id: "r2c2", resource: "mountains", number: 10, q: 0, r: -1 },
    { id: "r2c3", resource: "pasture", number: 4, q: 1, r: -1 },
    { id: "r2c4", resource: "forest", number: 3, q: 2, r: -1 },
    { id: "r3c1", resource: "hills", number: 11, q: -2, r: 0 },
    { id: "r3c2", resource: "forest", number: 8, q: -1, r: 0 },
    { id: "r3c3", resource: "desert", number: null, q: 0, r: 0 },
    { id: "r3c4", resource: "fields", number: 12, q: 1, r: 0 },
    { id: "r3c5", resource: "mountains", number: 5, q: 2, r: 0 },
    { id: "r4c1", resource: "pasture", number: 9, q: -2, r: 1 },
    { id: "r4c2", resource: "fields", number: 4, q: -1, r: 1 },
    { id: "r4c3", resource: "forest", number: 6, q: 0, r: 1 },
    { id: "r4c4", resource: "mountains", number: 11, q: 1, r: 1 },
    { id: "r5c1", resource: "fields", number: 8, q: -2, r: 2 },
    { id: "r5c2", resource: "pasture", number: 10, q: -1, r: 2 },
    { id: "r5c3", resource: "hills", number: 3, q: 0, r: 2 },
  ],
  robber: { tileId: "r3c3" },
  pieces: [],
};

// Normalized to demo-board.svg's 1000×730 viewBox.
const exampleRegions = {
  boardLayout: { x: 185 / 1000, y: 127 / 730, width: 630 / 1000, height: 500 / 730 },
  robberHex: { x: 451.5 / 1000, y: 307 / 730, width: 97 / 1000, height: 112 / 730 },
};

function findPlayer(players: Player[], aliases: string[], fallbackIndex: number): Player | undefined {
  const matches = players.find((player) => {
    const identity = `${player.id} ${player.name} ${player.color}`.toLowerCase();
    return aliases.some((alias) => identity.includes(alias));
  });
  return matches ?? players[fallbackIndex];
}

export function createExampleAssertions(
  players: Player[],
  turnInstanceId: string,
  evidenceId: string,
): Assertion[] {
  const red = findPlayer(players, ["red", "빨강"], 0);
  const blue = findPlayer(players, ["blue", "파랑"], 1);
  const white = findPlayer(players, ["white", "흰색"], 2);
  const timestamp = new Date().toISOString();
  const assertions: Assertion[] = [];

  const add = (field: string, value: Value, ownerId?: string, region?: Assertion["region"]) => {
    assertions.push({
      id: `${ownerId ?? "public"}:${field}`,
      field,
      value,
      ...(ownerId ? { ownerId } : {}),
      basis: "example",
      status: "accepted",
      evidenceIds: [evidenceId],
      confidence: 1,
      reason: "명시적 CATAN 예시 픽스처입니다.",
      turnInstanceId,
      updatedAt: timestamp,
      ...(region ? { region } : {}),
    });
  };

  const pieces: Value[] = [];
  const addPiece = (owner: Player | undefined, type: string, location: string) => {
    if (owner) pieces.push({ id: `piece-${pieces.length + 1}`, type, ownerId: owner.id, location });
  };
  const addSettlement = (owner: Player | undefined, location: string) => addPiece(owner, "settlement", location);
  const addRoad = (owner: Player | undefined, location: string) => addPiece(owner, "road", location);

  addSettlement(red, "r3c2:N");
  addSettlement(red, "r3c1:NW");
  [
    "r3c2:N-NE",
    "r3c2:NE-SE",
    "r3c2:SE-S",
    "r3c2:S-SW",
    "r3c2:SW-NW",
    "r3c1:NE-NW",
  ].forEach((edge) => addRoad(red, edge));
  addSettlement(blue, "r1c3:S");
  addSettlement(blue, "r3c5:N");
  ["r2c4:NW-NE", "r2c4:NE-SE"].forEach((edge) => addRoad(blue, edge));
  addSettlement(white, "r5c1:N");
  addSettlement(white, "r5c3:S");
  [
    "r5c1:N-NE",
    "r5c1:NE-SE",
    "r5c2:SW-S",
    "r5c2:S-SE",
    "r5c3:SW-S",
  ].forEach((edge) => addRoad(white, edge));
  const boardLayout: Value = { ...structuredClone(exampleBoardLayout), pieces };
  add("board.layout", boardLayout, undefined, exampleRegions.boardLayout);
  add("currentPlayer", red?.id ?? "red");
  add("turn.phase", "build");
  add("turn.diceTotal", 8);
  add("turn.productionResolved", true);
  add("turn.actionDevelopmentCardPlayed", false);
  add("turn.developmentCardBoughtThisTurn", true);
  add("robber.hexAnchor", "r3c3", undefined, exampleRegions.robberHex);
  add("awards.longestRoadHolder", red?.id ?? "red");
  add("awards.largestArmyHolder", blue?.id ?? "blue");
  add("physical.bankResources", {
    brick: 15,
    lumber: 14,
    wool: 16,
    grain: 14,
    ore: 16,
  });
  add("physical.availablePieces", {
    roads: { red: 9, blue: 13, white: 10 },
    settlements: { red: 3, blue: 3, white: 3 },
    cities: { red: 4, blue: 4, white: 4 },
  });

  const playerExamples: Array<{
    player: Player | undefined;
    counts: { brick: number; lumber: number; wool: number; grain: number; ore: number };
    roadLength: number;
    knightsPlayed: number;
  }> = [
    {
      player: red,
      counts: { brick: 1, lumber: 3, wool: 1, grain: 1, ore: 1 },
      roadLength: 6,
      knightsPlayed: 1,
    },
    {
      player: blue,
      counts: { brick: 2, lumber: 1, wool: 1, grain: 1, ore: 1 },
      roadLength: 2,
      knightsPlayed: 3,
    },
    {
      player: white,
      counts: { brick: 1, lumber: 1, wool: 1, grain: 3, ore: 1 },
      roadLength: 5,
      knightsPlayed: 0,
    },
  ];

  for (const example of playerExamples) {
    if (!example.player) continue;
    const ownerId = example.player.id;
    add("player.resources.counts", example.counts, ownerId);
    add("player.resources.total", Object.values(example.counts).reduce((sum, count) => sum + count, 0), ownerId);
    add("player.road.longestContinuousSegments", example.roadLength, ownerId);
    add("player.development.knightsPlayed", example.knightsPlayed, ownerId);
  }

  if (red) {
    add("player.development.boughtThisTurnType", "knight", red.id);
    add("player.development.boughtThisTurnIdentity", "Knight", red.id);
  }

  return assertions;
}
