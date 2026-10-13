// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기입니다.
// 등록 기기, 복합 이상 접속, 정확한 자원 구역을 순서대로 확인합니다.

import {
  announcementResourceId,
  isResourcePart,
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

function loadResourceBindings() {
  const raw = typeof process !== 'undefined'
    ? process.env.ALEPH_RESOURCE_BINDINGS
    : undefined;

  if (!raw) {
    return STARTER_RESOURCE_BINDINGS;
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
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
   * 모든 자원 요청은 서버가 제공한 정확한 binding을 통과해야 합니다.
   * 사용자·기기·서비스·메서드·경로·자원 ID를 우회해서 허용하지 않습니다.
   */
  return bindingAllows(
    request,
    resource,
    bindings,
  );
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
