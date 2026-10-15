import assert from 'node:assert/strict';

import {
    runAttackChecks,
} from '../src/attack-check.mjs';

import {
    buildOpsRows,
    CHECK_IDS,
    countRows,
} from '../src/checks.mjs';

import {
    RULE_CHECK_CASES,
    runRuleCheck,
} from '../src/rule-check.mjs';

function mockResponse(
    status,
    value,
) {
    return {
        status,

        ok:
            status >= 200
            && status < 300,

        body: {
            async cancel() {},
        },

        async json() {
            if (
                typeof value
                === 'string'
            ) {
                return JSON.parse(
                    value,
                );
            }

            return value;
        },

        async text() {
            return typeof value
                === 'string'
                ? value
                : JSON.stringify(
                    value,
                );
        },
    };
}

const calls = [];
const originalFetch =
    globalThis.fetch;

globalThis.fetch =
    async (
        input,
        init = {},
    ) => {
        const url =
            input instanceof URL
                ? input
                : new URL(
                    String(input),
                );

        calls.push({
            url:
                url.href,

            evidence:
                init.alephEvidence
                ?? null,
        });

        if (
            url.hostname
            === 'mock.supabase.co'
        ) {
            return mockResponse(
                401,
                {
                    code:
                        '42501',

                    message:
                        'denied',
                },
            );
        }

        if (
            url.pathname
            === '/'
        ) {
            return mockResponse(
                200,
                '<html><body>BYTE BACK</body></html>',
            );
        }

        if (
            url.pathname
            === '/data.json'
        ) {
            return mockResponse(
                200,
                {
                    notes: [],
                },
            );
        }

        if (
            url.pathname
            === '/api/device/status'
            && url.searchParams.get(
                'view',
            ) === 'public-config'
        ) {
            return mockResponse(
                200,
                {
                    publishableKey:
                        `sb_publishable_${'x'.repeat(
                            32,
                        )}`,
                },
            );
        }

        if (
            url.pathname
            === '/api/device/status'
            && url.searchParams.get(
                'view',
            ) === 'rule-check'
        ) {
            const caseId =
                url.searchParams.get(
                    'case',
                );

            return mockResponse(
                200,
                {
                    case:
                        caseId,

                    virtual:
                        true,

                    ready:
                        true,
                },
            );
        }

        if (
            url.pathname
            === '/api/device/status'
            && url.searchParams.get(
                'view',
            ) === 'operations-record'
        ) {
            return mockResponse(
                200,
                {
                    schema:
                        'aleph.operations.record.v1',

                    record: {
                        status:
                            'not_run',

                        rows:
                            [],
                    },
                },
            );
        }

        if (
            url.pathname
            === '/api/device/status'
        ) {
            return mockResponse(
                401,
                {
                    error:
                        'LOGIN_REQUIRED',
                },
            );
        }

        if (
            url.pathname.startsWith(
                '/api/restore/',
            )
        ) {
            return mockResponse(
                405,
                {
                    error:
                        'METHOD_NOT_ALLOWED',
                },
            );
        }

        if (
            url.pathname
            === '/api/notes'
            || url.pathname.startsWith(
                '/api/notes/',
            )
        ) {
            return mockResponse(
                401,
                {
                    error:
                        'LOGIN_REQUIRED',
                },
            );
        }

        throw new Error(
            `unexpected mock URL: ${url.href}`,
        );
    };

try {
    const config = {
        step:
            12,

        publicAppUrl:
            'https://app.example.test',

        originalApiUrl:
            'https://mock.supabase.co/rest/v1/virtual_notes',

        identityProvider: {
            issuer:
                'https://mock.supabase.co/auth/v1',
        },
    };

    const evidenceRecords =
        new Map();

    const attempts =
        await runAttackChecks(
            config,
            {
                evidenceRecords,
            },
        );

    assert.equal(
        attempts.length,
        20,
        'attack attempt 수는 20개여야 합니다.',
    );

    for (const attempt of attempts) {
        assert.deepEqual(
            Object.keys(
                attempt,
            ).sort(),
            [
                'attackId',
                'expected',
                'observed',
            ],
            `${attempt.attackId}: bundle schema 불일치`,
        );
    }

    const attackIds =
        attempts.map(
            item =>
                item.attackId,
        );

    assert.equal(
        new Set(
            attackIds,
        ).size,
        attackIds.length,
        'attackId가 중복되었습니다.',
    );

    assert.deepEqual(
        [...attackIds].sort(),
        [...CHECK_IDS].sort(),
        'attack-check와 CHECK_META의 ID가 일치하지 않습니다.',
    );

    const rows =
        buildOpsRows(
            attempts,
            evidenceRecords,
        );

    assert.equal(
        rows.length,
        20,
        'ops row 수는 20개여야 합니다.',
    );

    assert.equal(
        rows.some(
            row =>
                row.area
                === 'unknown',
        ),
        false,
        'CHECK_META가 없는 행이 있습니다.',
    );

    assert.equal(
        rows.some(
            row =>
                row.result
                === 'unexpected',
        ),
        false,
        '가상 응답 기준 예상과 다른 행이 있습니다.',
    );

    const representedStages =
        [...new Set(
            rows
                .map(
                    row =>
                        row.stage,
                )
                .filter(
                    Number.isInteger,
                ),
        )].sort(
            (left, right) =>
                left - right,
        );

    assert.deepEqual(
        representedStages,
        [
            1, 2, 3, 4, 5, 6,
            7, 8, 9, 10, 11, 12,
        ],
        '작전실 점검 행은 Stage 1~12를 모두 대표해야 합니다.',
    );

    const notRunIds =
        rows
            .filter(
                row =>
                    row.result
                    === 'not_run',
            )
            .map(
                row =>
                    row.attackId,
            )
            .sort();

    assert.deepEqual(
        notRunIds,
        [
            'anonymous_api_note_delete',
            'anonymous_api_note_update',
        ],
        '미실행 항목 구성이 예상과 다릅니다.',
    );

    for (const row of rows) {
        if (
            row.result
            === 'not_run'
        ) {
            assert.equal(
                row.requestIds.length,
                0,
                `${row.attackId}: 미실행인데 요청 ID가 있습니다.`,
            );

            assert.equal(
                row.checkedAt,
                null,
                `${row.attackId}: 미실행인데 확인 시각이 있습니다.`,
            );

            continue;
        }

        assert.equal(
            row.requestIds.length,
            1,
            `${row.attackId}: 실행 행의 요청 ID가 1개가 아닙니다.`,
        );

        assert.equal(
            typeof row.checkedAt,
            'string',
            `${row.attackId}: 확인 시각이 없습니다.`,
        );
    }

    const counts =
        countRows(
            rows,
        );

    assert.deepEqual(
        counts,
        {
            total:
                20,

            blocked:
                14,

            allowed:
                4,

            unexpected:
                0,

            notRun:
                2,
        },
        '점검 집계가 예상 구조와 다릅니다.',
    );

    for (
        const caseId
        of RULE_CHECK_CASES
    ) {
        const result =
            await runRuleCheck(
                caseId,
            );

        assert.equal(
            result?.ready,
            true,
            `${caseId}: 고정 가상 점검 실패`,
        );
    }

    const evidenceCalls =
        calls.filter(
            call =>
                call.evidence,
        );

    assert.equal(
        evidenceCalls.length,
        18,
        '실제 실행 항목의 evidence 요청 수가 예상과 다릅니다.',
    );

    console.log(
        '통과 · attack-check 20개와 CHECK_META 20개 일치',
    );

    console.log(
        '통과 · 실제 실행 18개 / 미실행 2개 증적 구조',
    );

    console.log(
        '통과 · Stage 1~12 점검 행 모두 존재',
    );

    console.log(
        '통과 · blocked 14 / allowed 4 / unexpected 0 / notRun 2',
    );

    console.log(
        `통과 · rule-check ${RULE_CHECK_CASES.length}개 ready=true`,
    );

    console.log(
        'Production 요청은 보내지 않았습니다.',
    );
} finally {
    globalThis.fetch =
        originalFetch;
}
