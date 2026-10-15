const PATTERNS = Object.freeze([
    {
        name: 'jndi_remote_lookup_header',
        condition: '요청 머리글에 ${jndi: 로 시작하고 :// 원격 조회 대상이 이어지는 JNDI lookup 형태가 있는 경우',
        basis: 'CVE-2021-44228의 대표적인 Log4j JNDI 원격 조회 악용 형태이며 MITRE ATT&CK T1190의 공개 애플리케이션 취약점 악용에 해당합니다.',
    },
    {
        name: 'jndi_remote_lookup_argument',
        condition: 'URL 또는 요청 인자에 ${jndi: 로 시작하고 :// 원격 조회 대상이 이어지는 JNDI lookup 형태가 있는 경우',
        basis: 'CVE-2021-44228은 사용자 입력이 로그에 기록될 때 JNDI lookup을 이용해 원격 자원을 조회하도록 악용될 수 있으며 MITRE ATT&CK T1190과 연결됩니다.',
    },
    {
        name: 'known_cve_probe_trace',
        condition: '직접 JNDI 원격 조회로 확정되지는 않았지만 MITRE ATT&CK T1190 표기가 있는 알려진 취약점 관련 경보인 경우',
        basis: 'fixture에서 T1190 표기가 있는 비차단 경보는 알려진 취약점 악용 여부가 불명확한 시도로 분류하고, T1190 표기가 없는 일반 활동은 정상 기록으로 유지합니다.',
    },
]);

const DIRECT_LOOKUP_PATTERN = /\$\{jndi:[^{}\s:]+:\/\/[^{}\s]+\}/iu;

function hasDirectLookup(value) {
    return typeof value === 'string'
        && DIRECT_LOOKUP_PATTERN.test(value);
}

function hasMitreT1190(alert) {
    return Array.isArray(alert?.rule?.mitre)
        && alert.rule.mitre.includes('T1190');
}

function hasAmbiguousProbeTrace(alert) {
    return hasMitreT1190(alert);
}

function decision(action, confidence, patternName) {
    return {
        action,
        confidence,
        reason: `${patternName}: 알려진 취약점 악용 패턴과 일치합니다.`,
    };
}

export function decide(alert) {
    const userAgent = alert?.data?.useragent;
    const url = alert?.data?.url;

    if (hasDirectLookup(userAgent)) {
        return decision(
            'block',
            0.99,
            PATTERNS[0].name,
        );
    }

    if (hasDirectLookup(url)) {
        return decision(
            'block',
            0.98,
            PATTERNS[1].name,
        );
    }

    if (hasAmbiguousProbeTrace(alert)) {
        return {
            action: 'alert',
            confidence: 0.65,
            reason: `${PATTERNS[2].name}: T1190 문맥의 애매한 알려진 취약점 신호입니다.`,
        };
    }

    return {
        action: 'record',
        confidence: 0.1,
        reason: 'normal_activity: 알려진 취약점 악용 패턴이 확인되지 않았습니다.',
    };
}
