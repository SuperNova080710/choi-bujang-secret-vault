import assert from 'node:assert/strict';
import test from 'node:test';
import {
    resourceAllowed,
} from '../src/decider.mjs';

import {
    decide,
} from '../src/decider.mjs';

function request(overrides = {}) {
    return {
        schema: 'aleph.xdr.request.v1',
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

test('기존 demo fixture의 본인 메모를 허용한다', async () => {
    const result = await decide(request());

    assert.equal(result.decision, 'allow');
    assert.equal(result.reasonCode, 'approved');
});

test('B 사용자가 A의 메모를 읽으면 거부한다', async () => {
    const result = await decide(request({
        subjectId: 'learner_b',
        path: '/notes/learner_a-note-01',
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'resource_not_allowed');
    assert.deepEqual(result.ruleIds, ['resource_scope']);
});

test('본인 메모 목록 요청은 허용한다', async () => {
    const result = await decide(request({
        subjectId: 'learner_a',
        path: '/notes',
        route: 'GET /notes',
    }));

    assert.equal(result.decision, 'allow');
});

test('export 기능 경로는 자원 ID로 인정하지 않는다', async () => {
    const result = await decide(request({
        path: '/notes/export',
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'resource_not_allowed');
});

test('쿼리가 붙은 자원 요청은 거부한다', async () => {
    const result = await decide(request({
        path: '/notes/learner_fixture-note-01',
        queryLength: 8,
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'resource_not_allowed');
});

test('일반 학생의 강사 공지 수정은 거부한다', async () => {
    const result = await decide(request({
        subjectId: 'learner_a',
        service: 'announcements',
        method: 'PUT',
        path: '/announcements/notice-01',
        route: 'PUT /announcements/:id',
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'resource_not_allowed');
});

test('미등록 기기는 기존 규칙대로 거부한다', async () => {
    const result = await decide(request({
        deviceRegistered: false,
    }));

    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'device_not_registered');
    assert.deepEqual(result.ruleIds, ['device_registered']);
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
    assert.equal(result.reasonCode, 'step_up_required');
});

test('서버 binding의 소유자와 요청자가 같으면 단건 메모를 허용한다', () => {
    const req = request({
        subjectId: 'subject_a',
        path: '/notes/note-17',
    });

    const bindings = [
        {
            classId: 'class_fixture',
            projectId: 'project_fixture',
            subjectId: 'subject_a',
            ownerSubjectId: 'subject_a',
            deviceId: 'aaaaaaaaaaaaaaaa',
            service: 'notes',
            path: '/notes/note-17',
            resourceId: 'notes:note-17',
            permissions: ['GET'],
        },
    ];

    assert.equal(
        resourceAllowed(req, bindings),
        true,
    );
});

test('B 사용자가 A의 opaque 메모 ID를 읽으면 거부한다', () => {
    const req = request({
        subjectId: 'subject_b',
        path: '/notes/note-17',
    });

    const bindings = [
        {
            classId: 'class_fixture',
            projectId: 'project_fixture',
            subjectId: 'subject_a',
            ownerSubjectId: 'subject_a',
            deviceId: 'aaaaaaaaaaaaaaaa',
            service: 'notes',
            path: '/notes/note-17',
            resourceId: 'notes:note-17',
            permissions: ['GET'],
        },
    ];

    assert.equal(
        resourceAllowed(req, bindings),
        false,
    );
});

test('소유권 binding이 없는 단건 메모는 추측해서 허용하지 않는다', () => {
    const req = request({
        subjectId: 'subject_a',
        path: '/notes/subject_a-note-17',
    });

    assert.equal(
        resourceAllowed(req, []),
        false,
    );
});
