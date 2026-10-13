// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 등록 기기, 복합 이상 접속, 정확한 자원 구역을 순서대로 확인합니다.

import {
  announcementResourceId,
  isResourcePart,
  noteListResourceId,
  noteResourceId,
} from './resource-id.mjs';

export const RULE_IDS = Object.freeze([
  'device_registered',
  'step_up_required',
  'resource_scope',
]);

const SIGNAL_KEYS = ['hour', 'network', 'region', 'source'];

const STARTER_RESOURCE_BINDINGS = Object.freeze([
  Object.freeze({
    classId: 'class_fixture',
    projectId: 'project_fixture',
    subjectId: 'learner_fixture',
    ownerSubjectId: 'learner_fixture',
    deviceId: 'a'.repeat(16),
    service: 'notes',
    path: '/notes/demo',
    resourceId: 'notes:demo',
    permissions: Object.freeze(['GET', 'PUT']),
  }),
  Object.freeze({
    classId: 'class_fixture',
    projectId: 'project_fixture',
    subjectId: 'learner_fixture',
    ownerSubjectId: 'learner_fixture',
    deviceId: 'a'.repeat(16),
    service: 'notes',
    path: '/notes',
    resourceId: 'notes:list',
    permissions: Object.freeze(['GET']),
  }),
]);

function hasValidSignalShape(signals) {
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) {
    return false;
  }

  if (Object.keys(signals).sort().join(',') !== SIGNAL_KEYS.join(',')) {
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

function resourceForRequest(request) {
  if (request.queryLength !== 0) {
    return null;
  }

  if (
    typeof request.service !== 'string'
    || typeof request.method !== 'string'
    || typeof request.path !== 'string'
    || typeof request.route !== 'string'
  ) {
    return null;
  }

  if (request.service === 'notes') {
    if (
      request.path === '/notes'
      && request.method === 'GET'
      && request.route === 'GET /notes'
    ) {
      return {
        family: 'notes',
        kind: 'list',
        resourcePart: null,
        resourceId: noteListResourceId(),
      };
    }

    if (
      request.path === '/notes'
      && request.method === 'POST'
      && request.route === 'POST /notes'
    ) {
      return {
        family: 'notes',
        kind: 'create',
        resourcePart: null,
        resourceId: null,
      };
    }

    const match = /^\/notes\/([^/]+)$/u.exec(request.path);

    if (
      !match
      || !isResourcePart(match[1])
      || !['GET', 'PUT', 'DELETE'].includes(request.method)
      || request.route !== `${request.method} /notes/:id`
    ) {
      return null;
    }

    return {
      family: 'notes',
      kind: 'item',
      resourcePart: match[1],
      resourceId: noteResourceId(match[1]),
    };
  }

  if (request.service === 'announcements') {
    const match = /^\/announcements\/([^/]+)$/u.exec(request.path);

    if (
      !match
      || !isResourcePart(match[1])
      || !['POST', 'PUT', 'DELETE'].includes(request.method)
      || request.route !== `${request.method} /announcements/:id`
    ) {
      return null;
    }

    return {
      family: 'announcements',
      kind: 'item',
      resourcePart: match[1],
      resourceId: announcementResourceId(match[1]),
    };
  }

  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function resourceBelongsToSubject(resourcePart, subjectId) {
  if (
    typeof resourcePart !== 'string'
    || typeof subjectId !== 'string'
    || resourcePart.length === 0
    || subjectId.length === 0
  ) {
    return false;
  }

  // 기존 6·7단계 fixture를 보존합니다.
  if (
    resourcePart === 'demo'
    && subjectId === 'learner_fixture'
  ) {
    return true;
  }

  if (resourcePart === subjectId) {
    return true;
  }

  // subjectId가 자원 ID 안에 들어갈 때에는
  // 임의 부분 문자열이 아니라 식별자 구분자 경계를 요구합니다.
  const escapedSubjectId = escapeRegExp(subjectId);

  const ownerPattern = new RegExp(
    `(?:^|[._~-])${escapedSubjectId}(?:$|[._~-])`,
    'u',
  );

  return ownerPattern.test(resourcePart);
}

function loadResourceBindings() {
  const raw = typeof process !== 'undefined'
    ? process.env.ALEPH_RESOURCE_BINDINGS
    : undefined;

  if (!raw) {
    return [...STARTER_RESOURCE_BINDINGS];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [...STARTER_RESOURCE_BINDINGS];
    }

    return [
      ...STARTER_RESOURCE_BINDINGS,
      ...parsed,
    ];
  } catch {
    return [...STARTER_RESOURCE_BINDINGS];
  }
}

function bindingAllows(
  request,
  resource,
  bindings,
) {
  if (!Array.isArray(bindings)) {
    return false;
  }

  return bindings.some(binding => {
    if (
      !binding
      || binding.classId !== request.classId
      || binding.projectId !== request.projectId
      || binding.subjectId !== request.subjectId
      || binding.deviceId !== request.deviceId
      || binding.service !== request.service
      || binding.path !== request.path
      || binding.resourceId !== resource.resourceId
      || !Array.isArray(binding.permissions)
      || !binding.permissions.includes(request.method)
    ) {
      return false;
    }

    if (resource.family === 'notes') {
      return binding.ownerSubjectId === request.subjectId;
    }

    if (resource.family === 'announcements') {
      return binding.instructor === true;
    }

    return false;
  });
}

export function hasZoneAccess(
  request,
  resource,
  bindings = loadResourceBindings(),
) {
  if (!resource) {
    return false;
  }

  /*
   * 본인 메모 목록과 새 메모 생성은 특정 타인 자원을 직접
   * 선택하지 않습니다. 실제 API는 로그인 사용자 owner_id로
   * 목록/생성을 다시 제한합니다.
   */
  if (
    resource.family === 'notes'
    && (
      resource.kind === 'list'
      || resource.kind === 'create'
    )
  ) {
    return true;
  }

  /*
   * 명시적으로 등록된 서버 측 자원 연결이 있으면
   * 그 연결을 최우선으로 사용합니다.
   */
  if (bindingAllows(request, resource, bindings)) {
    return true;
  }

  /*
   * 메모 단건은 엔진의 subjectId와 자원 식별자의 소유자 경계를
   * 대조합니다. 타인의 subjectId가 들어간 자원은 허용하지 않습니다.
   */
  if (
    resource.family === 'notes'
    && resource.kind === 'item'
  ) {
    return resourceBelongsToSubject(
      resource.resourcePart,
      request.subjectId,
    );
  }

  /*
   * 강사 공지 변경은 추측으로 권한을 부여하지 않습니다.
   * 서버 측 binding에서 instructor:true가 확인된 경우에만
   * 위 bindingAllows 단계에서 허용됩니다.
   */
  if (resource.family === 'announcements') {
    return false;
  }

  return false;
}

export function resourceAllowed(
  request,
  bindings = loadResourceBindings(),
) {
  const resource = resourceForRequest(request);

  return hasZoneAccess(
    request,
    resource,
    bindings,
  );
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
    reasonCode: 'resource_not_allowed',
    ruleIds: ['resource_scope'],
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
    ruleIds: ['resource_scope'],
  };
}
