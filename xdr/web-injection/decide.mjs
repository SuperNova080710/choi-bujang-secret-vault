
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

function getText(alert) {
    const description =
        typeof alert?.rule?.description === 'string'
            ? alert.rule.description
            : '';

    const url =
        typeof alert?.data?.url === 'string'
            ? alert.data.url
            : '';

    return {
        description,
        combined: `${description}\n${url}`,
    };
}

function getCount(alert) {
    const value = Number(alert?.data?.count);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getLevel(alert) {
    const value = Number(alert?.rule?.level);
    return Number.isFinite(value) ? value : 0;
}

export function decide(alert) {
    const { description, combined } = getText(alert);
    const count = getCount(alert);
    const level = getLevel(alert);

    // 정상 조회가 뒤따르더라도 앞선 의심 이벤트를 정상으로 덮어쓰지 않습니다.
    const explicitlyBenign =
        /수업명|수업 단어|수업 공지 제목|삽입 표식은 아닙니다|공격 표기는 없습니다|로그아웃 화면|정적 화면|자료 목록|내 메모|반 공지|새로고침/i.test(
            description,
        );

    if (explicitlyBenign) {
        return result(
            'record',
            0.05,
            '정상 활동 또는 공격 표식이 아님',
        );
    }

    const matching = PATTERNS.filter((pattern) =>
        pattern.test(combined),
    );

    if (matching.length > 0) {
        const names = matching.map((pattern) => pattern.name);
        const strongEvidence =
            level >= 10 &&
            count >= 8;

        if (strongEvidence) {
            const confidence = 0.9;

            if (confidence >= THRESHOLDS.block) {
                return result(
                    'block',
                    confidence,
                    `반복 공격 증거 확인: ${names.join(', ')}`,
                );
            }
        }

        return result(
            'alert',
            0.65,
            `의심 공격 패턴 확인: ${names.join(', ')}; 차단 기준 미충족`,
        );
    }

    // 명령 구분자와 단발성 주입 의심 징후는 별도 확인 대상으로 둡니다.
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
