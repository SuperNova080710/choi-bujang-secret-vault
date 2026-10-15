const PATTERNS = Object.freeze([
    {
        name: 'unsigned_new_service_registration',
        condition: 'MITRE T1543 문맥에서 새로 등록되거나 실행 파일이 변경된 서비스가 서명되지 않았고, 임시 폴더 또는 평소 목록에 없는 실행 대상을 가리키는 경우',
        basis: '서명 없는 새 서비스 등록·변경은 시스템 프로세스 생성·변경을 이용한 지속성 확보 신호로 MITRE ATT&CK T1543에 해당합니다.',
    },
    {
        name: 'unfamiliar_scheduled_task',
        condition: 'MITRE T1053 문맥에서 처음 보는 예약 작업이 새로 생기거나 임의 이름·비정상 시각·임시 폴더 실행 파일처럼 평소 기준과 다른 특징을 보이는 경우',
        basis: '낯선 예약 작업 생성은 재부팅 뒤에도 실행을 이어가기 위한 지속성 기법으로 MITRE ATT&CK T1053에 해당합니다.',
    },
    {
        name: 'startup_folder_change',
        condition: 'MITRE T1543 문맥에서 시작 폴더 또는 시작 프로그램 항목에 평소 목록에 없는 실행 항목이 새로 추가되거나 변경된 경우',
        basis: '시작 항목 변경으로 프로그램을 자동 실행시키는 행위는 시스템 시작 시 지속성을 확보하는 신호로 MITRE ATT&CK T1543 근거와 연결됩니다.',
    },
]);

const CLEAR_ATTACK_LEVEL = 10;
const AMBIGUOUS_LEVEL = 5;

function hasMitre(alert, technique) {
    return Array.isArray(alert?.rule?.mitre)
        && alert.rule.mitre.includes(technique);
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

function persistencePatternName(alert) {
    const description = descriptionOf(alert);

    if (
        hasMitre(alert, 'T1053')
        && /예약 작업/u.test(description)
    ) {
        return PATTERNS[1].name;
    }

    if (
        hasMitre(alert, 'T1543')
        && /(시작 폴더|시작 프로그램|시작 항목)/u.test(description)
    ) {
        return PATTERNS[2].name;
    }

    if (hasMitre(alert, 'T1543')) {
        return PATTERNS[0].name;
    }

    return null;
}

function isClearAttack(alert, patternName) {
    if (ruleLevel(alert) < CLEAR_ATTACK_LEVEL) {
        return false;
    }

    const description = descriptionOf(alert);

    if (patternName === PATTERNS[0].name) {
        return /(서명 없|평소 목록에 없는 서비스|서비스 등록|실행 파일이 바뀌|다시 켜도 남도록)/u.test(description);
    }

    if (patternName === PATTERNS[1].name) {
        return /(처음 보는 예약 작업|임의 문자열|수업 시간 밖|임시 폴더|같은 임시 파일)/u.test(description);
    }

    if (patternName === PATTERNS[2].name) {
        return /(평소 목록에 없는|추가됐|같은 임시 파일)/u.test(description);
    }

    return false;
}

function decision(action, confidence, reason) {
    return {
        action,
        confidence,
        reason,
    };
}

export function decide(alert) {
    const patternName = persistencePatternName(alert);

    if (
        patternName
        && isClearAttack(alert, patternName)
    ) {
        return decision(
            'block',
            0.95,
            `${patternName}: 명확한 지속성 공격 신호와 일치합니다.`,
        );
    }

    if (
        patternName
        && ruleLevel(alert) >= AMBIGUOUS_LEVEL
    ) {
        return decision(
            'alert',
            0.65,
            `${patternName}: 지속성 기법 문맥의 애매한 변화 신호입니다.`,
        );
    }

    return decision(
        'record',
        0.1,
        'normal_activity: 지속성 공격 패턴이 확인되지 않았습니다.',
    );
}
