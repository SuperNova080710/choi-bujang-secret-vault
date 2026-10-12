
const PATTERNS = Object.freeze([
    {
        name: 'SQL 구문 삽입',
        test: (text) =>
            /sql 구문을 이어 붙인 요청|sql 구문 표기가|데이터베이스 조회를 이어 붙이는 표기/i.test(text),
    },
    {
        name: '스크립트 태그 삽입',
        test: (text) =>
            /스크립트 삽입 표기|스크립트 표식/i.test(text),
    },
    {
        name: '반복 경로 순회',
        test: (text) =>
            /경로를 여러 단계 거슬러 올라가는 표기|경로 이탈 표기/i.test(text),
    },
]);

const THRESHOLDS = Object.freeze({
    block: 0.85,
    alert: 0.5,
});

function getEvidence(alert) {
    return [
        alert?.rule?.description,
        alert?.data?.url,
    ]
        .filter((value) => typeof value === 'string')
        .join(' ');
}

function isClearAttack(alert, pattern, evidence) {
    const level = alert?.rule?.level;
    const count = Number(alert?.data?.count ?? 0);

    if (pattern.name === 'SQL 구문 삽입') {
        return /sql 구문을 이어 붙인 요청|sql 구문 표기가|데이터베이스 조회를 이어 붙이는 표기/i.test(evidence)
            && Number.isFinite(level)
            && level >= 10
            && count >= 10;
    }

    if (pattern.name === '스크립트 태그 삽입') {
        return /스크립트 삽입 표기|스크립트 표식/i.test(evidence)
            && Number.isFinite(level)
            && level >= 10
            && count >= 9;
    }

    if (pattern.name === '반복 경로 순회') {
        return /경로를 여러 단계 거슬러 올라가는 표기|경로 이탈 표기/i.test(evidence)
            && Number.isFinite(level)
            && level >= 10
            && count >= 8;
    }

    return false;
}

export function decide(alert) {
    const evidence = getEvidence(alert);
    const matching = PATTERNS.find((pattern) => pattern.test(evidence));

    if (!matching) {
        const ambiguous =
            /주입처럼 보이는 표기|이상한 검색|구분 문자|명령 구분자 표기/i.test(evidence)
            || /sql|select|스크립트|경로/i.test(evidence);

        return {
            action: ambiguous ? 'alert' : 'record',
            confidence: ambiguous ? 0.6 : 0.1,
            reason: ambiguous
                ? '애매한 요청: 등록된 패턴과 명확히 일치하지 않음'
                : '정상 이벤트: 등록된 공격 패턴이 확인되지 않음',
        };
    }

    if (isClearAttack(alert, matching, evidence)) {
        return {
            action: 'block',
            confidence: 0.9,
            reason: `명확한 공격: ${matching.name}`,
        };
    }

    return {
        action: 'alert',
        confidence: 0.65,
        reason: `의심 요청: ${matching.name} 패턴 일부 일치`,
    };
}
