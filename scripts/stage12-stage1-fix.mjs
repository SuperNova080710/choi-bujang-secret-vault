import {
    readFileSync,
    writeFileSync,
} from 'node:fs';

function read(path) {
    return readFileSync(
        path,
        'utf8',
    );
}

function write(path, text) {
    writeFileSync(
        path,
        text,
        'utf8',
    );
}

function replaceExact(
    text,
    from,
    to,
    label,
) {
    const count =
        text.split(from).length - 1;

    if (count !== 1) {
        throw new Error(
            `${label}: 교체 대상이 1개여야 하지만 ${count}개입니다.`,
        );
    }

    return text.replace(
        from,
        to,
    );
}

function replaceAllExact(
    text,
    from,
    to,
    expectedCount,
    label,
) {
    const count =
        text.split(from).length - 1;

    if (count !== expectedCount) {
        throw new Error(
            `${label}: 교체 대상이 ${expectedCount}개여야 하지만 ${count}개입니다.`,
        );
    }

    return text.split(from).join(to);
}

{
    const path =
        'src/attack-check.mjs';

    let text =
        read(path);

    text =
        replaceAllExact(
            text,
            "'public_html_no_supabase_key'",
            "'public_root_available'",
            2,
            'Stage 1 attackId',
        );

    text =
        replaceExact(
            text,
            "'공개 HTML에 Supabase 키 또는 프로젝트 URL 할당이 없어야 함'",
            "'공개 루트가 HTTP 200으로 열리고 HTML에 Supabase 키 또는 프로젝트 URL 할당이 없어야 함'",
            'Stage 1 기대 결과',
        );

    write(
        path,
        text,
    );
}

{
    const path =
        'src/checks.mjs';

    let text =
        read(path);

    text =
        replaceExact(
            text,
            `        public_html_no_supabase_key: {\n            stage: 5,\n            kind: 'allow',\n            area: 'app',\n            check: 'http_200',\n        },`,
            `        public_root_available: {\n            stage: 1,\n            kind: 'allow',\n            area: 'app',\n            check: 'http_200',\n        },`,
            'Stage 1 CHECK_META',
        );

    write(
        path,
        text,
    );
}

{
    const path =
        'scripts/ops-self-test.mjs';

    let text =
        read(path);

    const anchor =
`    assert.equal(\n        rows.some(\n            row =>\n                row.result\n                === 'unexpected',\n        ),\n        false,\n        '가상 응답 기준 예상과 다른 행이 있습니다.',\n    );`;

    const replacement =
`${anchor}\n\n    const representedStages =\n        [...new Set(\n            rows\n                .map(\n                    row =>\n                        row.stage,\n                )\n                .filter(\n                    Number.isInteger,\n                ),\n        )].sort(\n            (left, right) =>\n                left - right,\n        );\n\n    assert.deepEqual(\n        representedStages,\n        [\n            1, 2, 3, 4, 5, 6,\n            7, 8, 9, 10, 11, 12,\n        ],\n        '작전실 점검 행은 Stage 1~12를 모두 대표해야 합니다.',\n    );`;

    text =
        replaceExact(
            text,
            anchor,
            replacement,
            'Stage 1~12 self-test',
        );

    const logAnchor =
`    console.log(\n        '통과 · 실제 실행 18개 / 미실행 2개 증적 구조',\n    );`;

    const logReplacement =
`${logAnchor}\n\n    console.log(\n        '통과 · Stage 1~12 점검 행 모두 존재',\n    );`;

    text =
        replaceExact(
            text,
            logAnchor,
            logReplacement,
            'Stage coverage 로그',
        );

    write(
        path,
        text,
    );
}

{
    const path =
        'README.md';

    let text =
        read(path);

    const marker =
        '### Stage 1 작전실 증적 보완';

    if (!text.includes(marker)) {
        text +=
`\n\n${marker}\n\n- 작전실 표의 Stage 1은 \`public_root_available\` 점검으로 표시합니다.\n- 이 점검은 Production의 \`GET /\`를 실제로 호출해 HTTP 200을 확인하며, 같은 응답 HTML에 Supabase Publishable Key 또는 프로젝트 URL 할당이 노출되지 않았는지도 함께 검사합니다.\n- 제출 묶음 규격은 직접 점검을 최대 20개까지만 허용하므로, 기존 공개 HTML 점검을 Stage 1 공개 루트 증적으로 통합해 총 점검 수 20개를 유지합니다.\n- Stage 5의 원본 REST 직접 조회 차단은 \`public_key_direct_rest_read\`로 별도 유지합니다.\n- 기존 \`ops/ops-record.json\`은 과거 Production 실측 기록이므로 코드를 배포한 뒤 \`npm run ops:record\`로 다시 생성하기 전까지 임의 수정하지 않습니다.\n`;
    }

    write(
        path,
        text,
    );
}

console.log(
    'Stage 1 작전실 증적 수정 적용 완료',
);
