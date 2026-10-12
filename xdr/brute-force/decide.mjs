const PATTERNS = Object.freeze({
  repeatedLoginFailures: Object.freeze({
    name: 'repeated_login_failures',
    minCount: 20,
    minRuleLevel: 10,
    mitreId: 'T1110',
  }),
  passwordSpraying: Object.freeze({
    name: 'password_spraying',
    minRuleLevel: 10,
    mitreId: 'T1110',
  }),
});

const THRESHOLDS = Object.freeze({
  block: 0.85,
  alert: 0.5,
});

function hasMitreTechnique(alert, techniqueId) {
  return Array.isArray(alert?.rule?.mitre)
    && alert.rule.mitre.includes(techniqueId);
}

function isPasswordSpraying(alert) {
  const description = alert?.rule?.description;

  return typeof description === 'string'
    && /여러 계정|계정\s*\d+개|계정 이름을 바꿔|서로 다른 계정/.test(description)
    && /같은 비밀번호|같은 주소/.test(description);
}

function isRepeatedLoginFailure(alert) {
    const rawCount = alert?.data?.count;
    const count = typeof rawCount === 'number'
        ? rawCount
        : typeof rawCount === 'string' && rawCount.trim() !== ''
            ? Number(rawCount)
            : NaN;

    const description = alert?.rule?.description;

    return Number.isFinite(count)
        && count >= PATTERNS.repeatedLoginFailures.minCount
        && typeof description === 'string'
        && /로그인 실패|실패/.test(description);
}

function result(action, confidence, patternName, evidence) {
  return {
    action,
    confidence,
    reason: `${ patternName }: ${ evidence } `,
  };
}

export function decide(alert) {
  const level = alert?.rule?.level;

  if (!Number.isFinite(level)) {
    return result('record', 0, 'insufficient_evidence', '규칙 수준이 없어 기록만 합니다');
  }

  // 정상 활동은 MITRE T1110이 아니며 규칙 수준도 낮습니다.
  if (
    level <= 3
    && !hasMitreTechnique(alert, PATTERNS.repeatedLoginFailures.mitreId)
  ) {
    return result('record', 0.05, 'normal_activity', '공격 징후가 확인되지 않았습니다');
  }

  // 공격으로 분류하려면 높은 규칙 수준과 T1110 근거가 모두 필요합니다.
  if (
    level >= PATTERNS.repeatedLoginFailures.minRuleLevel
    && hasMitreTechnique(alert, PATTERNS.repeatedLoginFailures.mitreId)
  ) {
    if (isPasswordSpraying(alert)) {
      return result('block', 0.95, PATTERNS.passwordSpraying.name, '여러 계정에 대한 비밀번호 시도와 T1110 근거가 확인되었습니다');
    }

    if (isRepeatedLoginFailure(alert)) {
      return result('block', 0.9, PATTERNS.repeatedLoginFailures.name, '반복 로그인 실패 횟수와 T1110 근거가 확인되었습니다');
    }
  }

  return result('alert', 0.65, 'suspicious_login_activity', '로그인 공격 가능성은 있으나 차단 근거가 충분하지 않습니다');
}
