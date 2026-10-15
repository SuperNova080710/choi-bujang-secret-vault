import {
    execFileSync,
} from 'node:child_process';

import {
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';

import {
    join,
    resolve,
} from 'node:path';

import {
    runAttackChecks,
} from '../src/attack-check.mjs';

import {
    buildOpsRows,
    countRows,
} from '../src/checks.mjs';

const root =
    resolve(
        import.meta.dirname,
        '..',
    );

const secretPattern =
    /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]{16,}|\bsb_secret_[A-Za-z0-9_-]{12,}|\bsk-[A-Za-z0-9_-]{20,}|\beyJ[A-Za-z0-9_-]{12,}\.eyJ|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu;

function readJson(path) {
    return JSON.parse(
        readFileSync(
            path,
            'utf8',
        ),
    );
}

function currentCommit() {
    return execFileSync(
        'git',
        [
            '-C',
            root,
            'rev-parse',
            '--verify',
            'HEAD',
        ],
        {
            encoding:
                'utf8',

            timeout:
                5000,

            windowsHide:
                true,
        },
    ).trim();
}

function validateRows(rows) {
    if (!Array.isArray(rows)) {
        throw new Error(
            '점검 행이 배열이 아닙니다.',
        );
    }

    if (rows.length !== 20) {
        throw new Error(
            `점검 행은 20개여야 합니다. 현재 ${rows.length}개입니다.`,
        );
    }

    const ids =
        new Set();

    for (const row of rows) {
        if (
            !row
            || typeof row.attackId
            !== 'string'
            || row.attackId.length === 0
        ) {
            throw new Error(
                'attackId가 없는 점검 행이 있습니다.',
            );
        }

        if (
            ids.has(
                row.attackId,
            )
        ) {
            throw new Error(
                `중복 attackId: ${row.attackId}`,
            );
        }

        ids.add(
            row.attackId,
        );

        if (
            row.result
            === 'not_run'
        ) {
            if (
                !String(
                    row.observed,
                ).startsWith(
                    '미실행:',
                )
            ) {
                throw new Error(
                    `${row.attackId}: 미실행 행의 observed 형식이 올바르지 않습니다.`,
                );
            }

            if (
                row.requestIds.length !== 0
                || row.checkedAt !== null
            ) {
                throw new Error(
                    `${row.attackId}: 미실행 행에 실제 요청 기록이 들어 있습니다.`,
                );
            }

            continue;
        }

        if (
            row.requestIds.length !== 1
            || typeof row.checkedAt
            !== 'string'
        ) {
            throw new Error(
                `${row.attackId}: 실제 실행 행에는 요청 ID 1개와 확인 시각이 필요합니다.`,
            );
        }

        if (
            !String(
                row.observed,
            ).startsWith(
                'HTTP ',
            )
        ) {
            throw new Error(
                `${row.attackId}: 실제 실행 결과는 HTTP 관측값이어야 합니다.`,
            );
        }
    }
}

try {
    const config =
        readJson(
            join(
                root,
                'aleph.config.json',
            ),
        );

    if (config.step !== 12) {
        throw new Error(
            `ops:record는 12단계에서 실행합니다. 현재 step=${config.step}`,
        );
    }

    const evidenceRecords =
        new Map();

    const attempts =
        await runAttackChecks(
            config,
            {
                evidenceRecords,
            },
        );

    const rows =
        buildOpsRows(
            attempts,
            evidenceRecords,
        );

    validateRows(
        rows,
    );

    const counts =
        countRows(
            rows,
        );

    const record = {
        schema:
            'aleph.ops-record.v1',

        step:
            config.step,

        commit:
            currentCommit(),

        checkedAt:
            new Date().toISOString(),

        note:
            '실제 Production에 보낸 GET 점검의 기록입니다. 판정·탐지 항목은 고정된 가상 입력 결과이며 실제 사용자 기기나 실제 사건이 아닙니다. 미실행 항목은 통과로 계산하지 않으며 41종 총공세의 심판 판정과도 구분합니다.',

        counts,

        rows,
    };

    const text =
        `${JSON.stringify(
            record,
            null,
            2,
        )}\n`;

    if (
        secretPattern.test(
            text,
        )
    ) {
        throw new Error(
            '점검 기록에 비밀값 또는 개인정보로 보이는 내용이 있어 저장하지 않았습니다.',
        );
    }

    mkdirSync(
        join(
            root,
            'ops',
        ),
        {
            recursive:
                true,
        },
    );

    writeFileSync(
        join(
            root,
            'ops',
            'ops-record.json',
        ),
        text,
        'utf8',
    );

    console.log(
        '점검 기록 생성: ops/ops-record.json',
    );

    console.log(
        [
            `총 ${counts.total}`,
            `거부 확인 ${counts.blocked}`,
            `허용 확인 ${counts.allowed}`,
            `예상과 다름 ${counts.unexpected}`,
            `미실행 ${counts.notRun}`,
        ].join(' · '),
    );

    for (const row of rows) {
        console.log(
            [
                `Stage ${row.stage}`,
                row.attackId,
                row.result,
                row.observed,
            ].join(' | '),
        );
    }
} catch (error) {
    console.error(
        `점검 기록 생성 중 첫 오류: ${error.message}`,
    );

    process.exitCode = 1;
}
