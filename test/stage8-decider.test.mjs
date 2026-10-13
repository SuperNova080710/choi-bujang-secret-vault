import assert from 'node:assert/strict';
import test from 'node:test';

import {
    decide,
    resourceAllowed,
} from '../src/decider.mjs';

function request(overrides = {}) {
    return {
        schema: 'aleph.decision.v1',
        requestId: crypto.randomUUID(),
        classId: 'class_fixture',
        projectId: 'project_fixture',
        subjectId: 'learner_fixture',
        deviceId: 'aaaaaaaaaaaaaaaa',
        service: 'notes',
        method: 'GET',
        path: '/notes/demo',
        route: 'GET /notes/:id',
        queryLength: 0,
        querySha256:
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        at: new Date().toISOString(),
        policyRevision: 1,
        deviceRegistered: true,
        stepUp: {
            verified: false,
            authAgeSeconds: null,
        },
        recentEvents: [],
        signals: {
            source: 'judge_fixture',
            region: 'local',
            network: 'usual',
            hour: 14,
        },
        ...overrides,
    };
}

test('정확한 메모 단건 GET 구역을 허용한다', async () => {
    const result = await decide(request());

    assert.equal(result.decision, 'allow');
    assert.equal(result.reasonCode, 'approved');
    assert.deepEqual(
        result.ruleIds,
        ['resource_zone'],
    );
});

test('API 형식의 메모 단건 GET 구역도 허용한다', async () => {
    const result = await decide(request({
        path: '/api/notes/demo',
        route: 'GET /api/notes/:id',
    }));

    assert.equal(result.decision, 'allow');
    assert.equal(result.reasonCode, 'approved');
});

test('메모 단건 PUT 구역을 허용한다', async () => {
    const result = await decide(request({
        method: 'PUT',
        route: 'PUT /notes/:id',
    }));

    assert.equal(result.decision, 'allow');
});

test('메모 전체 목록 경로는 허용하지 않는다', async () => {
    const result = await decide(request({
        path: '/notes',
        route: 'GET /notes',
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(
        result.reasonCode,
        'policy_denied',
    );
    assert.deepEqual(
        result.ruleIds,
        ['resource_zone'],
    );
});

test('API 메모 전체 목록 경로도 허용하지 않는다', async () => {
    const result = await decide(request({
        path: '/api/notes',
        route: 'GET /api/notes',
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(
        result.reasonCode,
        'policy_denied',
    );
});

test('export 기능 경로는 자원 ID로 인정하지 않는다', async () => {
    const result = await decide(request({
        path: '/notes/export',
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(
        result.reasonCode,
        'policy_denied',
    );
});

test('알 수 없는 admin 기능 경로도 거부한다', async () => {
    const result = await decide(request({
        path: '/api/notes/admin',
        route: 'GET /api/notes/:id',
    }));

    assert.equal(result.decision, 'deny');
});

test('쿼리가 붙은 자원 요청은 거부한다', async () => {
    const result = await decide(request({
        queryLength: 8,
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(
        result.reasonCode,
        'policy_denied',
    );
});

test('service와 실제 경로가 다르면 거부한다', async () => {
    const result = await decide(request({
        service: 'announcements',
    }));

    assert.equal(result.decision, 'deny');
});

test('route와 실제 path가 다르면 거부한다', async () => {
    const result = await decide(request({
        route: 'GET /api/notes/:id',
    }));

    assert.equal(result.decision, 'deny');
});

test('일반 판정기에서는 강사 공지 PUT을 허용하지 않는다', async () => {
    const result = await decide(request({
        service: 'announcements',
        method: 'PUT',
        path: '/announcements/notice-01',
        route: 'PUT /announcements/:id',
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(
        result.reasonCode,
        'policy_denied',
    );
});

test('미등록 기기는 기존 규칙대로 거부한다', async () => {
    const result = await decide(request({
        deviceRegistered: false,
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(
        result.reasonCode,
        'device_not_registered',
    );
    assert.deepEqual(
        result.ruleIds,
        ['device_registered'],
    );
});

test('복합 이상 요청은 기존 규칙대로 추가 확인을 요구한다', async () => {
    const result = await decide(request({
        recentEvents: [
            {
                kind: 'risk_signal',
                ageSeconds: 60,
                count: 20,
            },
        ],
        signals: {
            source: 'judge_fixture',
            region: 'foreign',
            network: 'unusual',
            hour: 3,
        },
    }));

    assert.equal(result.decision, 'step_up');
    assert.equal(
        result.reasonCode,
        'step_up_required',
    );
});

test('추가 확인 뒤 정상 단건 요청은 허용한다', async () => {
    const result = await decide(request({
        stepUp: {
            verified: true,
            authAgeSeconds: 60,
        },
        recentEvents: [
            {
                kind: 'risk_signal',
                ageSeconds: 60,
                count: 20,
            },
        ],
        signals: {
            source: 'judge_fixture',
            region: 'foreign',
            network: 'unusual',
            hour: 3,
        },
    }));

    assert.equal(result.decision, 'allow');
});

test('resourceAllowed는 소유자를 추측하지 않고 단건 구역만 판정한다', () => {
    assert.equal(
        resourceAllowed(request({
            subjectId: 'opaque-subject-a',
            path: '/notes/opaque-note-id',
        })),
        true,
    );

    assert.equal(
        resourceAllowed(request({
            subjectId: 'opaque-subject-b',
            path: '/notes/opaque-note-id',
        })),
        true,
    );
});
