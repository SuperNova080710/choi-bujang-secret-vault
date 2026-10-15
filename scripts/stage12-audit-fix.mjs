import {
    readFileSync,
    writeFileSync,
} from 'node:fs';

import {
    resolve,
} from 'node:path';

const root =
    resolve(
        import.meta.dirname,
        '..',
    );

function read(relativePath) {
    return readFileSync(
        resolve(
            root,
            relativePath,
        ),
        'utf8',
    );
}

function write(
    relativePath,
    content,
) {
    writeFileSync(
        resolve(
            root,
            relativePath,
        ),
        content,
        'utf8',
    );
}

function replaceOnce(
    text,
    search,
    replacement,
    label,
) {
    if (!text.includes(search)) {
        if (
            typeof replacement
            === 'string'
            && text.includes(
                replacement,
            )
        ) {
            return text;
        }

        throw new Error(
            `${label}: 교체 대상을 찾지 못했습니다.`,
        );
    }

    const first =
        text.replace(
            search,
            replacement,
        );

    if (
        first.includes(
            search,
        )
    ) {
        throw new Error(
            `${label}: 같은 교체 대상이 두 번 이상 있습니다.`,
        );
    }

    return first;
}

function replaceRegexOnce(
    text,
    pattern,
    replacement,
    label,
) {
    const matches =
        [...text.matchAll(
            new RegExp(
                pattern.source,
                pattern.flags.includes('g')
                    ? pattern.flags
                    : `${pattern.flags}g`,
            ),
        )];

    if (matches.length === 0) {
        if (
            typeof replacement
            === 'string'
            && text.includes(
                replacement,
            )
        ) {
            return text;
        }

        throw new Error(
            `${label}: 교체 대상을 찾지 못했습니다.`,
        );
    }

    if (matches.length !== 1) {
        throw new Error(
            `${label}: 교체 대상이 ${matches.length}개입니다.`,
        );
    }

    return text.replace(
        pattern,
        replacement,
    );
}

function updateApp() {
    let text =
        read(
            'public/app.js',
        );

    if (
        !text.includes(
            'Production 점검 기록 미실행',
        )
    ) {
        text =
            replaceRegexOnce(
                text,
                /const verificationChecks = \[[\s\S]*?function verificationCheckedAt\(\) \{\n    return new Date\(\)\.toISOString\(\);\n\}\n\n/u,
                '',
                '브라우저 자체 점검 정의 제거',
            );

        text =
            replaceOnce(
                text,
                "    operationsError.hidden = true;\n    operationsError.textContent = '';\n}",
                "    operationsError.hidden = true;\n    operationsError.textContent = '';\n\n    renderVerificationTable(\n        [],\n    );\n}",
                '작전실 초기화에 서버 기록 표 초기화 추가',
            );

        text =
            replaceOnce(
                text,
                "    operationsBackupDetail.textContent =\n        versions.length > 0\n            ? versions\n                .map(item => {\n                    const version =\n                        typeof item?.version\n                            === 'string'\n                            ? item.version\n                            : 'unknown';\n\n                    const count =\n                        Number.isInteger(\n                            item?.count,\n                        )\n                            ? item.count\n                            : 0;\n\n                    return `${version} × ${count}`;\n                })\n                .join(' · ')\n            : '확인된 백업 버전 없음';\n}",
                "    operationsBackupDetail.textContent =\n        versions.length > 0\n            ? versions\n                .map(item => {\n                    const version =\n                        typeof item?.version\n                            === 'string'\n                            ? item.version\n                            : 'unknown';\n\n                    const count =\n                        Number.isInteger(\n                            item?.count,\n                        )\n                            ? item.count\n                            : 0;\n\n                    return `${version} × ${count}`;\n                })\n                .join(' · ')\n            : '확인된 백업 버전 없음';\n\n    const verificationRows =\n        Array.isArray(\n            data.verification?.rows,\n        )\n            ? data.verification.rows\n            : [];\n\n    renderVerificationTable(\n        verificationRows,\n    );\n}",
                '작전실 서버 기록 표 연결',
            );

        const replacementTail =
`function formatVerificationTime(value) {
    if (!value) {
        return '미실행';
    }

    const date =
        new Date(value);

    if (
        !Number.isFinite(
            date.getTime(),
        )
    ) {
        return '확인 불가';
    }

    return date.toLocaleString(
        'ko-KR',
        {
            dateStyle: 'short',
            timeStyle: 'medium',
        },
    );
}

function renderVerificationTable(
    records,
) {
    const list =
        Array.isArray(records)
            ? records
            : [];

    if (list.length === 0) {
        const row =
            document.createElement(
                'tr',
            );

        const cell =
            document.createElement(
                'td',
            );

        cell.colSpan =
            7;

        cell.textContent =
            'Production 점검 기록 미실행';

        row.append(
            cell,
        );

        verificationResults.replaceChildren(
            row,
        );

        return;
    }

    const rows =
        list.map(
            record => {
                const row =
                    document.createElement(
                        'tr',
                    );

                const stage =
                    document.createElement(
                        'td',
                    );

                stage.textContent =
                    Number.isInteger(
                        record?.stage,
                    )
                        ? String(
                            record.stage,
                        )
                        : '-';

                const kind =
                    document.createElement(
                        'td',
                    );

                kind.textContent =
                    record?.kind
                    === 'allow'
                        ? '정상'
                        : '금지';

                const request =
                    document.createElement(
                        'td',
                    );

                request.textContent =
                    typeof record?.attackId
                    === 'string'
                        ? record.attackId
                        : '알 수 없음';

                const expected =
                    document.createElement(
                        'td',
                    );

                expected.textContent =
                    typeof record?.expected
                    === 'string'
                        ? record.expected
                        : '기대 결과 없음';

                const actual =
                    document.createElement(
                        'td',
                    );

                const status =
                    document.createElement(
                        'span',
                    );

                status.className =
                    'verification-status';

                if (
                    record?.result
                    === 'not_run'
                ) {
                    status.classList.add(
                        'is-not-run',
                    );
                } else if (
                    record?.result
                    === 'unexpected'
                ) {
                    status.classList.add(
                        'is-denied',
                    );
                } else {
                    status.classList.add(
                        'is-ok',
                    );
                }

                status.textContent =
                    typeof record?.observed
                    === 'string'
                        ? record.observed
                        : '미실행';

                actual.append(
                    status,
                );

                const requestId =
                    document.createElement(
                        'td',
                    );

                const requestIds =
                    Array.isArray(
                        record?.requestIds,
                    )
                        ? record.requestIds
                        : [];

                requestId.textContent =
                    requestIds.length === 1
                        ? requestIds[0]
                        : '미실행';

                const checkedAt =
                    document.createElement(
                        'td',
                    );

                checkedAt.textContent =
                    formatVerificationTime(
                        record?.checkedAt,
                    );

                row.append(
                    stage,
                    kind,
                    request,
                    expected,
                    actual,
                    requestId,
                    checkedAt,
                );

                return row;
            },
        );

    verificationResults.replaceChildren(
        ...rows,
    );
}

verificationRunButton.addEventListener(
    'click',
    async () => {
        verificationError.hidden =
            true;

        verificationError.textContent =
            '';

        verificationRunButton.disabled =
            true;

        try {
            await loadOperationsSummary();
        } catch (error) {
            verificationError.textContent =
                error instanceof Error
                    ? error.message
                    : '서버 점검 기록을 불러오지 못했습니다.';

            verificationError.hidden =
                false;
        } finally {
            verificationRunButton.disabled =
                false;
        }
    },
);

renderVerificationTable(
    [],
);
`;

        text =
            replaceRegexOnce(
                text,
                /function formatVerificationTime\(value\) \{[\s\S]*\z/u,
                replacementTail,
                '브라우저 자체 실측 실행 코드 제거',
            );
    }

    if (
        /verificationRequestId|verificationRecords|runPublicRootCheck|runAnonymousNotesCheck|runInvalidTokenCheck|runStaticDataCheck|runApprovedNotesCheck|runUnsignedNotesCheck|runVerificationChecks/u.test(
            text,
        )
    ) {
        throw new Error(
            'public/app.js에 브라우저 자체 점검 코드가 남아 있습니다.',
        );
    }

    write(
        'public/app.js',
        text,
    );
}

function updateIndex() {
    let text =
        read(
            'public/index.html',
        );

    text =
        text.replace(
            '안전한 요청 다시 확인',
            '서버 기록 다시 불러오기',
        );

    const oldDescription =
`            실제로 실행한 요청만 결과를 기록합니다.
            실행하지 않은 시험은 미실행으로 남기며
            41종 총공세를 임의로 통과 처리하지 않습니다.
            점검 요청 ID는 이 화면이 각 실측 실행을 구분하기 위해 생성하며,
            서버 또는 ALEPH SDP 엔진의 요청 ID를 의미하지 않습니다.`;

    const newDescription =
`            이 표는 ops/ops-record.json에 저장된 Production GET 점검 기록만 표시합니다.
            실행하지 않은 시험은 미실행으로 남기며 41종 총공세를 임의로 통과 처리하지 않습니다.
            점검 요청 ID는 제출 점검이 실제 GET 요청에 연결한 alephEvidence requestKey이며,
            브라우저가 새로 만들어낸 값이 아닙니다.`;

    if (
        text.includes(
            oldDescription,
        )
    ) {
        text =
            text.replace(
                oldDescription,
                newDescription,
            );
    } else if (
        !text.includes(
            newDescription,
        )
    ) {
        throw new Error(
            'public/index.html의 점검 설명을 찾지 못했습니다.',
        );
    }

    write(
        'public/index.html',
        text,
    );
}

function updateReadme() {
    let text =
        read(
            'README.md',
        );

    const oldText =
        '`점검 요청 ID`는 브라우저가 각각의 실측 실행을 구분하기 위해 생성하는 UUID입니다.\n\n이 값은 서버나 ALEPH SDP 엔진이 발급한 요청 ID를 의미하지 않습니다.';

    const newText =
        '`점검 요청 ID`는 `npm run ops:record`가 실제 Production GET 요청에 연결한 `alephEvidence.requestKey`입니다.\n\n브라우저 화면은 새 UUID를 만들지 않고 `ops/ops-record.json`의 서버 기록을 그대로 표시합니다.';

    if (
        text.includes(
            oldText,
        )
    ) {
        text =
            text.replace(
                oldText,
                newText,
            );
    }

    const heading =
        '## 12단계 증거 출처 구분 — 최신 구조';

    if (
        !text.includes(
            heading,
        )
    ) {
        text +=
`\n\n---\n\n${heading}\n\n이 절은 위의 초기 12단계 화면 설명보다 최신입니다.\n\n| 정보 | 출처 | 의미 |\n|---|---|---|\n| 판정 규칙 이름 | \`src/decider.mjs\`의 \`RULE_IDS\` | 구현된 학생 규칙 목록이며 실측 결과가 아님 |\n| 6~9단계 고정 점검 | \`GET /api/device/status?view=rule-check&case=...\` | 고정 가상 입력의 판정·탐지 결과이며 실제 사용자 사건이 아님 |\n| Production 점검 기록 | \`ops/ops-record.json\` | 실제 Production GET 결과와 동일한 requestKey·확인 시각 |\n| 로그인 사용자의 기기·백업 현황 | \`GET /api/device/status?view=operations\` | 현재 사용자 DB 상태를 서버가 조회한 결과 |\n| 41종 총공세 | ALEPH 심판 | 심판 실행 전에는 결과를 생성하거나 통과로 표시하지 않음 |\n\n실행하지 않은 쓰기 요청은 \`미실행:\`으로 기록하며 \`blocked\` 또는 \`allowed\`로 계산하지 않습니다. 작전실 확인표는 브라우저가 결과나 UUID를 새로 만들지 않고, 서버가 제공한 동일한 \`ops/ops-record.json\`의 행을 표시합니다.\n`;
    }

    write(
        'README.md',
        text,
    );
}

updateApp();
updateIndex();
updateReadme();

console.log(
    'Stage 12 감사 수정 적용 완료',
);
