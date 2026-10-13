// 9단계에서 학생이 채우는 탐지 함수입니다.
// 반 엔진이 검증한 사건만 전달해야 하며, 브라우저가 보낸 사용자 번호는 받지 않습니다.

const BURST_WINDOW_MS = 10 * 60 * 1000;
const BURST_READ_LIMIT = 120;

function readDetectionEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return null;
  }

  const at = typeof event.at === 'string'
    ? event.at
    : null;

  const method = typeof event.method === 'string'
    ? event.method
    : null;

  const subject = (
    event.identity
    && typeof event.identity === 'object'
    && !Array.isArray(event.identity)
    && typeof event.identity.sub === 'string'
  )
    ? event.identity.sub
    : null;

  return {
    at,
    method,
    subject,
  };
}

function findBurstReadSubject(events) {
  const readsBySubject = new Map();

  for (const event of events) {
    const parsed = readDetectionEvent(event);

    if (
      !parsed
      || parsed.method !== 'GET'
      || !parsed.subject
      || !parsed.at
    ) {
      continue;
    }

    const atMs = Date.parse(parsed.at);

    if (!Number.isFinite(atMs)) {
      continue;
    }

    const subjectReads = readsBySubject.get(parsed.subject) ?? [];
    subjectReads.push(atMs);
    readsBySubject.set(parsed.subject, subjectReads);
  }

  for (const [subject, times] of readsBySubject) {
    times.sort((a, b) => a - b);

    let left = 0;

    for (let right = 0; right < times.length; right += 1) {
      while (times[right] - times[left] > BURST_WINDOW_MS) {
        left += 1;
      }

      const readsInWindow = right - left + 1;

      if (readsInWindow > BURST_READ_LIMIT) {
        return subject;
      }
    }
  }

  return null;
}

export function detect(events) {
  if (!Array.isArray(events)) {
    throw new TypeError('invalid_detection_events');
  }

  const burstSubject = findBurstReadSubject(events);

  // 계약상 확인 가능한 같은 가명 사용자의 다량 GET 조회를 탐지합니다.
  // 실제 권한 회수와 운영 연동은 이 함수가 직접 수행하지 않습니다.
  if (burstSubject) {
    return {
      action: 'propose_revocation',
      reasonCode: 'burst_read',
      subject: burstSubject,
    };
  }

  return { action: 'observe' };
}
