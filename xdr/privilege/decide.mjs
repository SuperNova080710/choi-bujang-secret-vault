const PATTERNS = Object.freeze([
    {
        name: 'administrator_group_addition',
        condition: 'MITRE T1078 문맥에서 평범한 계정이 administrators 같은 관리자 그룹에 새로 추가되거나 짧은 시간 안에 관리자 그룹 재가입이 반복되는 경우',
        basis: '정상 계정이 관리자 그룹에 새로 편입되는 행위는 탈취된 계정의 권한 확대에 악용될 수 있어 MITRE ATT&CK T1078 근거와 연결됩니다.',
    },
    {
        name: 'unfamiliar_admin_command',
        condition: 'MITRE T1068 또는 T1078 문맥에서 평소와 다른 계정·주소·직후 권한 변경과 함께 처음 보는 관리자 명령이나 관리자 권한 명령이 실행되는 경우',
        basis: '관리자 권한을 새로 얻은 계정이 관리자 명령을 실행하는 행위는 권한 상승 악용 또는 정상 계정 도용 신호로 MITRE ATT&CK T1068·T1078에 해당합니다.',
    },
    {
        name: 'off_hours_privilege_use',
        condition: 'MITRE T1068 또는 T1078 문맥에서 업무·수업 시간 밖처럼 평소와 다른 시각에 관리자 그룹 변경이나 관리자 권한 명령이 사용되는 경우',
        basis: '평소 사용 시간대에서 벗어난 관리자 권한 사용은 계정 도용이나 권한 상승을 의심할 수 있는 행위 신호로 MITRE ATT&CK T1068·T1078 근거와 연결됩니다.',
    },
]);

const CLEAR_ATTACK_LEVEL = 10;
const AMBIGUOUS_LEVEL = 5;

function hasMitre(alert, technique) {
    return Array.isArray(alert?.rule?.mitre)
        && alert.rule.mitre.includes(technique);
}

function hasPrivilegeMitre(alert) {
    return hasMitre(alert, 'T1068') || hasMitre(alert, 'T1078');
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

function groupOf(alert) {
    return typeof alert?.data?.group === 'string'
        ? alert.data.group.toLowerCase()
        : '';
}

function privilegePatternName(alert) {
    const description = descriptionOf(alert);
    const group = groupOf(alert);

    if (
        hasPrivilegeMitre(alert)
        && /(수업 시간 밖|업무처럼 보이지 않는 시각|업무 시간 밖|평소와 다른 시각)/u.test(description)
    ) {
        return PATTERNS[2].name;
    }

    if (
        hasMitre(alert, 'T1078')
        && (
            /(관리자 그룹|관리자로 들어|다시 관리자로|관리자 그룹에 추가)/u.test(description)
            || group === 'administrators'
        )
    ) {
        return PATTERNS[0].name;
    }

    if (
        hasPrivilegeMitre(alert)
        && /(관리자 명령|관리자 권한|권한 명령|권한으로 바뀌|다른 계정의 권한|권한 상승)/u.test(description)
    ) {
        return PATTERNS[1].name;
    }

    if (hasMitre(alert, 'T1068')) {
        return PATTERNS[1].name;
    }

    if (hasMitre(alert, 'T1078')) {
        return PATTERNS[0].name;
    }

    return null;
}

function isClearAttack(alert, patternName) {
    if (ruleLevel(alert) < CLEAR_ATTACK_LEVEL || !patternName) {
        return false;
    }

    const description = descriptionOf(alert);
    const group = groupOf(alert);

    if (patternName === PATTERNS[0].name) {
        return (
            group === 'administrators'
            || /(관리자 그룹에 추가|관리자 그룹에 들어|다시 관리자로 들어|관리자 그룹 추가)/u.test(description)
        );
    }

    if (patternName === PATTERNS[1].name) {
        return /(관리자 명령|관리자 권한|권한 명령|관리자 권한으로 바뀌|다른 계정의 권한)/u.test(description);
    }

    if (patternName === PATTERNS[2].name) {
        return /(수업 시간 밖|업무처럼 보이지 않는 시각|업무 시간 밖)/u.test(description)
            && /(관리자|권한)/u.test(description);
    }

    return false;
}

function isAmbiguousPrivilegeEvent(alert) {
    const level = ruleLevel(alert);

    return level >= AMBIGUOUS_LEVEL
        && level < CLEAR_ATTACK_LEVEL
        && hasPrivilegeMitre(alert);
}

export function decide(alert) {
    const patternName = privilegePatternName(alert);

    if (isClearAttack(alert, patternName)) {
        return {
            action: 'block',
            confidence: 0.95,
            reason: `${patternName}: 명확한 권한 상승 공격 신호와 일치합니다.`,
        };
    }

    if (isAmbiguousPrivilegeEvent(alert)) {
        return {
            action: 'alert',
            confidence: 0.65,
            reason: `${patternName ?? PATTERNS[1].name}: 권한 상승 기법 문맥의 애매한 변화 신호입니다.`,
        };
    }

    return {
        action: 'record',
        confidence: 0.1,
        reason: 'normal_activity: 권한 상승 공격 패턴이 확인되지 않았습니다.',
    };
}
