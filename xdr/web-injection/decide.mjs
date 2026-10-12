const PATTERNS = Object.freeze([
    {
        name: 'SQL 구문 삽입',
        test: (text) =>
            /SQL 구문을 이어 붙인 요청|SQL 구문 표기|데이터베이스 조회를 이어 붙이는 표기|SQL 표식과|SQL 표식이/i.test(
                text,
            ),
    },
    {
        name: '스크립트 태그 삽입',
        test: (text) =>
            /스크립트 삽입 표기|스크립트 표식/i.test(text),
    },
    {
        name: '반복 경로 순회',
        test: (text) =>
            /경로를 여러 단계 거슬러 올라가는 표기|경로 이탈 표기/i.test(
                text,
            ),
    },
]);

const THRESHOLDS = Object.freeze({
    block: 0.85,
    alert: 0.5,
});

function result(action, confidence, reason) {
    return { action, confidence, reason };
}

function getDescription(alert) {
    return typeof alert?.rule?.description === 'string'
        ? alert.rule.description
        : '';
}

function getText(alert) {
    const description = getDescription(alert);
    const url =
        typeof alert?.data?.url === 'string'
            ? alert.data.url
            : '';

    return `${description}\n${url}`;
}

function getCount(alert) {
    const value = Number(alert?.data?.count);

    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getLevel(alert) {
    const value = Number(alert?.rule?.level);

    return Number.isFinite(value) ? value : 0;
}

function hasSourceAddress(alert) {
    const srcip = alert?.data?.srcip;

    return typeof srcip === 'string' && srcip.trim().length > 0;
}

function isExplicitlyBenign(description) {
    return /수업명이 한 번 있습니다|수업 단어가 한 번 있습니다|수업 공지 제목을 한 번 조회했습니다|경로에 up 이 한 번 있습니다|삽입 표식은 아닙니다|공격 표기는 없습니다|요청 주소가 평소보다 깁니다|로그아웃 화면|정적 화면|자료 목록|내 메모|반 공지|새로고침/i.test(
        description,
    );
}

function hasRepeatedCommandSeparator(description) {
    const match =
        /명령 구분자 표기가 연속 요청\s*(\d+)\s*번/i.exec(
            description,
        );

    return Boolean(match && Number(match[1]) >= 8);
}

export function decide(alert) {
    const description = getDescription(alert);
    const combined = getText(alert);
    const count = getCount(alert);
    const level = getLevel(alert);
    const hasSource = hasSourceAddress(alert);

    // 정상 문맥을 먼저 판별하여 일반적인 검색어와 정상 활동의
    // 오탐을 방지합니다.
    if (isExplicitlyBenign(description)) {
        return result(
            'record',
            0.05,
            '정상 활동 또는 공격 표식이 아닌 일반 문맥',
        );
    }

    // 반복 명령 구분자는 출발지, 심각도, 반복 횟수가
    // 모두 확인될 때만 차단합니다.
    if (
        hasRepeatedCommandSeparator(description) &&
        hasSource &&
        level >= 10 &&
        count >= 8
    ) {
        return result(
            'block',
            0.9,
            '명확한 반복 공격: 명령 구분자 삽입',
        );
    }

    // 알려진 공격 패턴과 반복 증거를 함께 확인합니다.
    const matching = PATTERNS.filter((pattern) =>
        pattern.test(combined),
    );

    if (matching.length > 0) {
        const names = matching.map((pattern) => pattern.name);
        const strongEvidence =
            hasSource &&
            level >= 10 &&
            count >= 8;

        if (
            strongEvidence &&
            0.9 >= THRESHOLDS.block
        ) {
            return result(
                'block',
                0.9,
                `반복 공격 증거 확인: ${names.join(', ')}`,
            );
        }

        // 공격 패턴은 있지만 차단 기준을 충족하지 못하면 알림만 남깁니다.
        return result(
            'alert',
            0.65,
            `의심 공격 패턴 확인: ${names.join(', ')}; 차단 기준 미충족`,
        );
    }

    // 명확한 공격 패턴은 없지만 단발성 의심 징후가 있으면 알림을 남깁니다.
    const ambiguous =
        /따옴표|이상한 검색|주입처럼 보이는 표기|구분 문자|구분자 표기|명령 구분자/i.test(
            description,
        );

    if (ambiguous) {
        return result(
            'alert',
            0.6,
            '애매한 주입 의심 징후: 추가 확인 필요',
        );
    }

    return result(
        'record',
        0.1,
        '지정된 공격 패턴이 확인되지 않음',
    );
}
