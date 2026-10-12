const PATTERNS = Object.freeze([
    {
        name: 'SQL 구문 삽입',
        test: (text) =>
            /SQL 구문을 이어 붙인 요청|SQL 구문 표기|데이터베이스 조회를 이어 붙이는 표기/i.test(
                text,
            ),
        minLevel: 10,
        minCount: 10,
    },
    {
        name: '스크립트 태그 삽입',
        test: (text) =>
            /스크립트 삽입 표기|스크립트 표식/i.test(text),
        minLevel: 10,
        minCount: 9,
    },
    {
        name: '반복 경로 순회',
        test: (text) =>
            /경로를 여러 단계 거슬러 올라가는 표기|경로 이탈 표기/i.test(
                text,
            ),
        minLevel: 10,
        minCount: 8,
    },
]);

const THRESHOLDS = Object.freeze({
    block: 0.85,
    alert: 0.5,
});

function getDecision(action, confidence, reason) {
    return { action, confidence, reason };
}

export function decide(alert) {
    const description =
        typeof alert?.rule?.description === 'string'
            ? alert.rule.description
            : '';

    const level = Number(alert?.rule?.level);
    const count = Number(alert?.data?.count);

    const matching = PATTERNS.find((pattern) =>
        pattern.test(description),
    );

    if (matching) {
        const clearAttack =
            Number.isFinite(level) &&
            Number.isFinite(count) &&
            level >= matching.minLevel &&
            count >= matching.minCount;

        if (clearAttack && 0.9 >= THRESHOLDS.block) {
            return getDecision(
                'block',
                0.9,
                `명확한 반복 공격: ${matching.name}`,
            );
        }

        return getDecision(
            'alert',
            0.65,
            `의심 요청: ${matching.name} 패턴은 확인됐지만 차단 기준 미충족`,
        );
    }

    const ambiguous =
        /따옴표|이상한 검색|주입처럼 보이는 표기|구분 문자|구분자 표기|명령 구분자 표기/i.test(
            description,
        );

    if (ambiguous && 0.6 >= THRESHOLDS.alert) {
        return getDecision(
            'alert',
            0.6,
            '애매한 요청: 의심 징후는 있으나 명확한 반복 공격은 확인되지 않음',
        );
    }

    return getDecision(
        'record',
        0.1,
        '정상 이벤트: 명확하거나 애매한 공격 징후가 확인되지 않음',
    );
}
