// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 판정기는 등록 기기, 복합 이상 접속, 정확한 자원 구역만 판단합니다.
// 실제 메모 소유권과 강사 권한은 최종 서버 API가 다시 확인합니다.

import {
  isResourcePart,
} from './resource-id.mjs';

export const RULE_IDS = Object.freeze([
  'device_registered',
  'step_up_required',
  'resource_zone',
]);

const SIGNAL_KEYS = ['hour', 'network', 'region', 'source'];

const RESERVED_RESOURCE_PARTS = new Set([
  'export',
  'all',
  'admin',
  'search',
  'backup',
  'restore',
]);

function hasValidSignalShape(signals) {
  if (
    !signals
    || typeof signals !== 'object'
    || Array.isArray(signals)
  ) {
    return false;
  }

  if (
    Object.keys(signals).sort().join(',')
    !== SIGNAL_KEYS.join(',')
  ) {
    return false;
  }

  const {
    source,
    region,
    network,
    hour,
  } = signals;

  if (source === 'none') {
    return region === 'unknown'
      && network === 'unknown'
      && (
        hour === null
        || hour === undefined
        || (
          Number.isInteger(hour)
          && hour >= 0
          && hour <= 23
        )
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
  const {
    signals,
    recentEvents,
  } = request;

  if (signals.source !== 'judge_fixture') {
    return false;
  }

  const unusualTime =
    signals.hour < 6
    || signals.hour >= 22;

  const unusualNetwork =
    signals.network !== 'usual';

  const recentActivityCount =
    Array.isArray(recentEvents)
      ? recentEvents.reduce(
        (total, event) => {
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
        },
        0,
      )
      : 0;

  const massActivity =
    recentActivityCount > 1;

  return unusualTime
    && unusualNetwork
    && massActivity;
}

function hasFreshStepUp(stepUp) {
  return stepUp?.verified === true
    && Number.isInteger(stepUp.authAgeSeconds)
    && stepUp.authAgeSeconds >= 0
    && stepUp.authAgeSeconds <= 900;
}

/*
 * 판정 요청에는 resourceId나 ownerId가 없습니다.
 * 따라서 여기서는 엔진이 검증한 service/method/path/route로
 * 접근 가능한 "구역"만 판단합니다.
 *
 * 실제 owner_id 및 강사 여부는 API에서 별도로 확인합니다.
 */
export function resourceAllowed(request) {
  if (
    request.queryLength !== 0
    || typeof request.service !== 'string'
    || typeof request.method !== 'string'
    || typeof request.path !== 'string'
    || typeof request.route !== 'string'
  ) {
    return false;
  }

  const match =
    /^\/(api\/)?(notes|announcements)\/([^/]+)$/u.exec(
      request.path,
    );

  if (!match) {
    return false;
  }

  const [, apiPrefix, family, resourcePart] = match;

  if (
    !isResourcePart(resourcePart)
    || RESERVED_RESOURCE_PARTS.has(
      resourcePart.toLowerCase(),
    )
    || request.service !== family
  ) {
    return false;
  }

  const expectedRoute =
    `${request.method} /${apiPrefix ?? ''}${family}/:id`;

  if (request.route !== expectedRoute) {
    return false;
  }

  /*
   * Stage 8의 일반 판정기에서 열어 두는 구역:
   *
   * - 내 메모 단건 읽기
   * - 내 메모 단건 수정
   *
   * "내 것"인지의 실제 확인은 최종 API의 owner_id 비교가 담당합니다.
   */
  if (family === 'notes') {
    return ['GET', 'PUT'].includes(
      request.method,
    );
  }

  /*
   * 강사 공지 수정은 request 계약에 강사 역할 정보가 없습니다.
   * 따라서 일반 판정기에서 임의로 강사라고 추정해 PUT을 허용하지 않습니다.
   * 실제 강사 여부는 서버의 vault_instructors 조회가 담당합니다.
   */
  return false;
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

function resourceDeniedResponse(request) {
  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision: 'deny',
    reasonCode: 'policy_denied',
    ruleIds: ['resource_zone'],
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

  if (
    hasCompositeRisk(request)
    && !hasFreshStepUp(request.stepUp)
  ) {
    return stepUpResponse(request);
  }

  if (!resourceAllowed(request)) {
    return resourceDeniedResponse(request);
  }

  return {
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['resource_zone'],
  };
}
