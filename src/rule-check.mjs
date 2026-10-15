import {
    decide,
} from './decider.mjs';

import {
    detect,
} from './detect.mjs';

/*
 * 12단계 탈환 작전실용 고정 가상 점검입니다.
 *
 * caseId는 아래 목록 중 하나를 고르는 용도로만 사용합니다.
 * HTTP 요청의 쿼리·헤더·본문 값을 판정 입력으로 사용하지 않습니다.
 *
 * 이 결과는 판정기·탐지 규칙의 고정 가상 입력 결과이며,
 * 실제 사용자 기기 승인, 실제 사건, 실제 회수 집행을 뜻하지 않습니다.
 */

function decisionRequest(
    overrides = {},
) {
    return {
        schema:
            'aleph.decision.v1',

        requestId:
            '00000000-0000-4000-8000-0000000000c1',

        classId:
            'check_class',

        projectId:
            'check_project',

        subjectId:
            'check_subject',

        deviceId:
            '0123456789abcdef',

        service:
            'notes',

        method:
            'GET',

        path:
            '/notes/demo',

        route:
            'GET /notes/:id',

        queryLength:
            0,

        querySha256:
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',

        at:
            new Date().toISOString(),

        policyRevision:
            1,

        deviceRegistered:
            true,

        stepUp: {
            verified:
                false,

            authAgeSeconds:
                null,
        },

        recentEvents:
            [],

        signals: {
            source:
                'none',

            region:
                'unknown',

            network:
                'unknown',

            hour:
                null,
        },

        ...overrides,
    };
}

const DECISION_CASES =
    Object.freeze({
        registered_device_allowed: {
            expected:
                'allow',

            input: () =>
                decisionRequest(),

            ready: result =>
                result?.decision === 'allow'
                && result.reasonCode === 'approved'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'resource_zone',
                ),
        },

        unregistered_device_denied: {
            expected:
                'deny',

            input: () =>
                decisionRequest({
                    deviceRegistered:
                        false,
                }),

            ready: result =>
                result?.decision === 'deny'
                && result.reasonCode
                === 'device_not_registered'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'device_registered',
                ),
        },

        composite_risk_requires_step_up: {
            expected:
                'step_up',

            input: () =>
                decisionRequest({
                    stepUp: {
                        verified:
                            false,

                        authAgeSeconds:
                            null,
                    },

                    recentEvents: [
                        {
                            kind:
                                'risk_signal',

                            ageSeconds:
                                60,

                            count:
                                20,
                        },
                    ],

                    signals: {
                        source:
                            'judge_fixture',

                        region:
                            'foreign',

                        network:
                            'unusual',

                        hour:
                            3,
                    },
                }),

            ready: result =>
                result?.decision
                === 'step_up'
                && result.reasonCode
                === 'step_up_required'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'step_up_required',
                ),
        },

        step_up_verified_allows_retry: {
            expected:
                'allow',

            input: () =>
                decisionRequest({
                    stepUp: {
                        verified:
                            true,

                        authAgeSeconds:
                            60,
                    },

                    recentEvents: [
                        {
                            kind:
                                'risk_signal',

                            ageSeconds:
                                60,

                            count:
                                20,
                        },
                    ],

                    signals: {
                        source:
                            'judge_fixture',

                        region:
                            'foreign',

                        network:
                            'unusual',

                        hour:
                            3,
                    },
                }),

            ready: result =>
                result?.decision === 'allow'
                && result.reasonCode === 'approved'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'resource_zone',
                ),
        },

        own_resource_allowed: {
            expected:
                'allow',

            input: () =>
                decisionRequest(),

            ready: result =>
                result?.decision === 'allow'
                && result.reasonCode === 'approved'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'resource_zone',
                ),
        },

        note_list_route_denied: {
            expected:
                'deny',

            input: () =>
                decisionRequest({
                    path:
                        '/notes',

                    route:
                        'GET /notes',
                }),

            ready: result =>
                result?.decision === 'deny'
                && result.reasonCode
                === 'policy_denied'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'resource_zone',
                ),
        },

        unknown_resource_path_denied: {
            expected:
                'deny',

            input: () =>
                decisionRequest({
                    path:
                        '/notes/export',

                    route:
                        'GET /notes/:id',
                }),

            ready: result =>
                result?.decision === 'deny'
                && result.reasonCode
                === 'policy_denied'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'resource_zone',
                ),
        },

        student_announcement_update_denied: {
            expected:
                'deny',

            input: () =>
                decisionRequest({
                    service:
                        'announcements',

                    method:
                        'PUT',

                    path:
                        '/announcements/demo',

                    route:
                        'PUT /announcements/:id',
                }),

            ready: result =>
                result?.decision === 'deny'
                && result.reasonCode
                === 'policy_denied'
                && Array.isArray(
                    result.ruleIds,
                )
                && result.ruleIds.includes(
                    'resource_zone',
                ),
        },
    });

const DETECTION_CASES =
    Object.freeze({
        normal_read_observed: {
            expected:
                'observe',

            count:
                30,

            ready: result =>
                result?.action
                === 'observe'
                && Object.keys(
                    result,
                ).length === 1,
        },

        burst_read_boundary_observed: {
            expected:
                'observe',

            count:
                120,

            ready: result =>
                result?.action
                === 'observe'
                && Object.keys(
                    result,
                ).length === 1,
        },

        burst_read_revocation_proposed: {
            expected:
                'propose_revocation',

            count:
                121,

            ready: result =>
                result?.action
                === 'propose_revocation'
                && result.reasonCode
                === 'burst_read'
                && result.subject
                === 'check_subject',
        },
    });

export const RULE_CHECK_CASES =
    Object.freeze([
        ...Object.keys(
            DECISION_CASES,
        ),

        ...Object.keys(
            DETECTION_CASES,
        ),
    ]);

function detectionEvents(count) {
    const start =
        Date.now()
        - (
            10
            * 60
            * 1000
        );

    return Array.from(
        {
            length:
                count,
        },

        (_, index) => ({
            at:
                new Date(
                    start
                    + (
                        index
                        * 2
                        * 1000
                    ),
                ).toISOString(),

            method:
                'GET',

            identity: {
                sub:
                    'check_subject',
            },
        }),
    );
}

export async function runRuleCheck(
    caseId,
) {
    if (
        typeof caseId
        !== 'string'
    ) {
        return null;
    }

    if (
        Object.hasOwn(
            DECISION_CASES,
            caseId,
        )
    ) {
        const definition =
            DECISION_CASES[
            caseId
            ];

        const result =
            await decide(
                definition.input(),
            );

        return {
            case:
                caseId,

            virtual:
                true,

            expected:
                definition.expected,

            decision:
                result?.decision
                ?? null,

            reasonCode:
                result?.reasonCode
                ?? null,

            ruleIds:
                Array.isArray(
                    result?.ruleIds,
                )
                    ? result.ruleIds
                    : [],

            ready:
                definition.ready(
                    result,
                ),
        };
    }

    if (
        Object.hasOwn(
            DETECTION_CASES,
            caseId,
        )
    ) {
        const definition =
            DETECTION_CASES[
            caseId
            ];

        const result =
            detect(
                detectionEvents(
                    definition.count,
                ),
            );

        return {
            case:
                caseId,

            virtual:
                true,

            expected:
                definition.expected,

            action:
                result?.action
                ?? null,

            reasonCode:
                result?.reasonCode
                ?? null,

            ready:
                definition.ready(
                    result,
                ),
        };
    }

    return null;
}