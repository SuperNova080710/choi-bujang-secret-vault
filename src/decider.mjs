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

  if (signals.source !== 'judge_fixture') {
    return false;
  }

  const unusualTime = signals.hour < 6 || signals.hour >= 22;

  const unusualNetwork = signals.network !== 'usual';

  // recentEvents는 계약상 이미 엔진이 제공한 "최근 사건"입니다.
  // 특정 kind나 임의의 시간 제한에 의존하지 않고,
  // 사건들의 발생 횟수를 합산해서 반복 활동 여부를 판정합니다.
  const recentActivityCount = Array.isArray(recentEvents)
    ? recentEvents.reduce((total, event) => {
      if (
        !event
        || !Number.isInteger(event.ageSeconds)
        || event.ageSeconds < 0
        || !Number.isInteger(event.count)
        || event.count < 0
      ) {
        return total;
      }

      return total + event.count;
    }, 0)
    : 0;

  const massActivity = recentActivityCount > 1;

  return unusualTime && unusualNetwork && massActivity;
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

  // source가 none이면 지역·네트워크를 알 수 없으므로
  // 해당 값을 정상 또는 이상으로 임의 분류하지 않습니다.
  // 복합 위험은 확인 가능한 신호가 모두 조건을 충족할 때만 판정합니다.

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
