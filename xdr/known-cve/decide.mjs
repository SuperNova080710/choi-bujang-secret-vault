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
        condition: '규칙 설명에 알려진 취약점 점검 또는 CVE-2021-44228 점검 흔적이 있고 MITRE T1190 표기가 함께 있는 경우',
        basis: '공개 취약점을 대상으로 한 점검·탐색 흔적은 실제 악용 전 탐색일 수 있으므로 CVE-2021-44228 및 MITRE ATT&CK T1190 근거의 보조 신호로만 사용합니다.',
    },
]);

const DIRECT_LOOKUP_PATTERN = /\$\{jndi:[^{}\s:]+:\/\/[^{}\s]+\}/iu;
const PROBE_TERMS = [
    'cve-2021-44228',
    'jndi',
    '취약점',
    '점검',
    '라이브러리',
    '조회 형태',
    'lookup',
    'probe',
];

function hasDirectLookup(value) {
    return typeof value === 'string'
        && DIRECT_LOOKUP_PATTERN.test(value);
}

function hasMitreT1190(alert) {
    return Array.isArray(alert?.rule?.mitre)
        && alert.rule.mitre.includes('T1190');
}

function hasProbeTrace(alert) {
    if (!hasMitreT1190(alert)) {
        return false;
    }

    const description = typeof alert?.rule?.description === 'string'
        ? alert.rule.description.toLowerCase()
        : '';
    const url = typeof alert?.data?.url === 'string'
        ? alert.data.url.toLowerCase()
        : '';

    return PROBE_TERMS.some((term) => (
        description.includes(term)
        || url.includes(term)
    ));
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

    if (hasProbeTrace(alert)) {
        return {
            action: 'alert',
            confidence: 0.65,
            reason: `${PATTERNS[2].name}: T1190 문맥의 알려진 취약점 점검 흔적입니다.`,
        };
    }

    return {
        action: 'record',
        confidence: 0.1,
        reason: 'normal_activity: 알려진 취약점 악용 패턴이 확인되지 않았습니다.',
    };
}
