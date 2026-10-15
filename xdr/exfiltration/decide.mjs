const PATTERNS = Object.freeze([
    {
        name: 'large_transfer_to_unfamiliar_destination',
        condition: 'MITRE T1041 또는 T1048 문맥에서 평소보다 큰 자료가 처음 보는 목적지나 외부 주소로 한 번에 또는 반복 전송되는 경우',
        basis: '처음 보는 목적지로 대용량 자료를 전송하는 행위는 명령 통로 또는 다른 프로토콜을 통한 유출 신호로 MITRE ATT&CK T1041·T1048 근거와 연결됩니다.',
    },
    {
        name: 'off_hours_archive_exfiltration',
        condition: 'MITRE T1041 또는 T1048 문맥에서 업무·수업 시간 밖에 압축 파일이나 자료 묶음이 외부 또는 처음 보는 목적지로 전송되는 경우',
        basis: '비정상 시간대에 압축된 자료를 외부로 반출하는 행위는 데이터 유출을 의심할 수 있는 전송 신호로 MITRE ATT&CK T1041·T1048 근거와 연결됩니다.',
    },
]);

const CLEAR_ATTACK_LEVEL = 10;
const AMBIGUOUS_LEVEL = 5;
const LARGE_TRANSFER_BYTES = 50_000_000;

function hasMitre(alert, technique) {
    return Array.isArray(alert?.rule?.mitre)
        && alert.rule.mitre.includes(technique);
}

function hasExfiltrationMitre(alert) {
    return hasMitre(alert, 'T1041') || hasMitre(alert, 'T1048');
}

function ruleLevel(alert) {
    return Number.isFinite(alert?.rule?.level)
        ? alert.rule.level
        : 0;
}

function descriptionOf(alert) {
    return typeof alert?.rule?.description === 'string'
        ? alert.rule.description
        : '';
}

function numericData(alert, key) {
    const value = Number(alert?.data?.[key]);
    return Number.isFinite(value) ? value : 0;
}

function exfiltrationPatternName(alert) {
    if (!hasExfiltrationMitre(alert)) {
        return null;
    }

    const description = descriptionOf(alert);

    if (
        /압축 파일/u.test(description)
        && /(시간 밖|다른 주소|처음 보는 주소|처음 보는 목적지|외부 전송|나갔|올라갔|반출)/u.test(description)
    ) {
        return PATTERNS[1].name;
    }

    return PATTERNS[0].name;
}

function isClearAttack(alert) {
    if (!hasExfiltrationMitre(alert) || ruleLevel(alert) < CLEAR_ATTACK_LEVEL) {
        return false;
    }

    const description = descriptionOf(alert);
    const bytes = numericData(alert, 'bytes');
    const files = numericData(alert, 'files');
    const count = numericData(alert, 'count');

    const strongTransferSignal = /(
        대용량 전송|
        처음 보는 목적지|
        처음 보는 주소|
        쓰지 않던 포트|
        자료실 전체|
        외부 주소로 복사|
        명령 통로로 큰 파일|
        압축 파일.*(?:나갔|올라갔)|
        전송이 [0-9]+번
    )/ux.test(description);

    return bytes >= LARGE_TRANSFER_BYTES
        || files >= 50
        || count >= 5
        || strongTransferSignal;
}

function decision(action, confidence, reason) {
    return { action, confidence, reason };
}

export function decide(alert) {
    const patternName = exfiltrationPatternName(alert);

    if (patternName && isClearAttack(alert)) {
        return decision(
            'block',
            0.95,
            `${patternName}: 명확한 자료 유출 공격 신호와 일치합니다.`,
        );
    }

    if (
        patternName
        && ruleLevel(alert) >= AMBIGUOUS_LEVEL
    ) {
        return decision(
            'alert',
            0.65,
            `${patternName}: 자료 유출 기법 문맥의 애매한 전송 신호입니다.`,
        );
    }

    return decision(
        'record',
        0.1,
        'normal_activity: 자료 유출 공격 패턴이 확인되지 않았습니다.',
    );
}
