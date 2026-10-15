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
        condition: '불완전한 원격 조회 흔적 또는 같은 출발지의 반복된 CVE-2021-44228 탐색처럼 실제 점검 시도와 가까운 신호가 있고 MITRE T1190 표기가 함께 있는 경우',
        basis: '공개 취약점 이름이나 일반 보안 용어만으로는 공격을 확정하지 않고, 실제 악용 전 탐색과 더 가까운 반복·불완전 lookup 신호만 보조 신호로 사용합니다.',
    },
]);

const DIRECT_LOOKUP_PATTERN = /\$\{jndi:[^{}\s:]+:\/\/[^{}\s]+\}/iu;
const CVE_PATTERN = /cve-2021-44228/iu;
const INCOMPLETE_LOOKUP_PATTERN = /lookup[-_ ]?fragment/iu;

function hasDirectLookup(value) {
    return typeof value === 'string'
        && DIRECT_LOOKUP_PATTERN.test(value);
}

function hasMitreT1190(alert) {
    return Array.isArray(alert?.rule?.mitre)
        && alert.rule.mitre.includes('T1190');
}

function eventCount(alert) {
    const count = Number(alert?.data?.count);

    return Number.isFinite(count)
        ? count
        : 0;
}

function hasAmbiguousProbeTrace(alert) {
    if (!hasMitreT1190(alert)) {
        return false;
    }

    const description = typeof alert?.rule?.description === 'string'
        ? alert.rule.description
        : '';
    const url = typeof alert?.data?.url === 'string'
        ? alert.data.url
        : '';

    const incompleteLookup = (
        INCOMPLETE_LOOKUP_PATTERN.test(description)
        || INCOMPLETE_LOOKUP_PATTERN.test(url)
    );

    const repeatedCveSearch = eventCount(alert) >= 2
        && CVE_PATTERN.test(url);

    return incompleteLookup || repeatedCveSearch;
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
            reason: `${PATTERNS[2].name}: 불완전하거나 반복된 알려진 취약점 점검 신호입니다.`,
        };
    }

    return {
        action: 'record',
        confidence: 0.1,
        reason: 'normal_activity: 알려진 취약점 악용 패턴이 확인되지 않았습니다.',
    };
}
