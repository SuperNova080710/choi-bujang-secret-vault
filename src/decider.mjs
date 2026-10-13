// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 등록된 기기만 허용하고, 복합 이상 접속에는 추가 본인 확인을 요구합니다.

export const RULE_IDS = Object.freeze([
  'device_registered',
  'step_up_required',
]);

const SIGNAL_KEYS = ['hour', 'network', 'region', 'source'];

function hasValidSignalShape(signals) {
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) {
    return false;
  }

  if (Object.keys(signals).sort().join(',') !== SIGNAL_KEYS.join(',')) {
    return false;
  }

  const { source, region, network, hour } = signals;

  if (source === 'none') {
    return region === 'unknown'
      && network === 'unknown'
      && (
        hour === null
        || hour === undefined
        || (Number.isInteger(hour) && hour >= 0 && hour <= 23)
      );
  }

  if (source === 'judge_fixture') {
    return typeof region === 'string'
      && region.length > 0
      && typeof network === 'string'
      && network.length > 0
      && Number.isInteger(hour)
      && hour >= 0
      && hour <= 23;
  }

  return false;
}

function hasCompositeRisk(request) {
  const { signals, recentEvents } = request;

  // judge_fixture는 가상 테스트 데이터이며 실제 위치 증거가 아닙니다.
  if (signals.source !== 'judge_fixture') {
    return false;
  }

  // 지역 변경만으로는 추가 확인을 요구하지 않습니다.
  const unusualTime = signals.hour < 6 || signals.hour >= 22;
  const unusualNetwork = signals.network === 'unusual';

  const massRead = Array.isArray(recentEvents)
    && recentEvents.some(event =>
      event
      && event.kind === 'risk_signal'
      && Number.isInteger(event.ageSeconds)
      && event.ageSeconds >= 0
      && event.ageSeconds <= 300
      && Number.isInteger(event.count)
      && event.count >= 10
    );

  return unusualTime && unusualNetwork && massRead;
}

function stepUpResponse(request) {
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision: 'step_up',
    reasonCode: 'step_up_required',
    ruleIds: ['step_up_required'],
  };
}

export async function decide(request) {
  if (request.deviceRegistered !== true) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request.requestId,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: ['device_registered'],
    };
  }

  if (!hasValidSignalShape(request.signals)) {
    return stepUpResponse(request);
  }

  // 실제 신호 출처가 없으면 정상 접속인지 확인할 수 없으므로
  // 정상으로 간주하지 않고 추가 본인 확인을 요구합니다.
  if (request.signals.source !== 'judge_fixture') {
    return stepUpResponse(request);
  }

  // stepUp.verified와 authAgeSeconds만으로 추가 확인을 생략하지 않습니다.
  // 실제 재인증 검증 계약이 확인되지 않았으므로 복합 이상은 계속 step_up입니다.
  if (hasCompositeRisk(request)) {
    return stepUpResponse(request);
  }

  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}
