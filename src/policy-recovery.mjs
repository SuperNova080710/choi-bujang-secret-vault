import { createHash } from 'node:crypto';
import {
    readFile,
    rename,
    unlink,
    writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
);

const DEFAULT_SAFE_POLICY_PATH = resolve(
    ROOT,
    'recovery/safe-policy.json',
);

const DEFAULT_TEST_POLICY_PATH = resolve(
    ROOT,
    'recovery/test-policy.json',
);

const EXPECTED_SAFE_POLICY_VERSION =
    'stage9-100-fc33950';

const EXPECTED_SAFE_POLICY_COMMIT =
    'fc3395086df56cdbdd7be0c2f8541273c4be9225';

const EXPECTED_SAFE_POLICY_SHA256 =
    'b1e48eb7a8cba3490351a7d578bb5229ac2d368d4da5049d0db64f5df039e142';

function isPlainObject(value) {
    return value !== null
        && typeof value === 'object'
        && !Array.isArray(value);
}

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [
                    key,
                    canonicalize(value[key]),
                ]),
        );
    }

    return value;
}

function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
}

function policySha256(policy) {
    return createHash('sha256')
        .update(canonicalJson(policy), 'utf8')
        .digest('hex');
}

async function readJsonFile(
    filePath,
    missingCode,
    invalidCode,
) {
    let contents;

    try {
        contents = await readFile(filePath, 'utf8');
    } catch (error) {
        if (error?.code === 'ENOENT') {
            throw new Error(missingCode);
        }

        throw error;
    }

    try {
        return JSON.parse(contents);
    } catch {
        throw new Error(invalidCode);
    }
}

export async function loadVerifiedSafePolicy({
    safePolicyPath = DEFAULT_SAFE_POLICY_PATH,
} = {}) {
    const backup = await readJsonFile(
        safePolicyPath,
        'SAFE_POLICY_MISSING',
        'SAFE_POLICY_INVALID_JSON',
    );

    if (
        backup?.schema !== 'aleph.safe-policy-backup.v1'
        || backup.version !== EXPECTED_SAFE_POLICY_VERSION
        || backup.sourceCommit !== EXPECTED_SAFE_POLICY_COMMIT
        || !isPlainObject(backup.policy)
    ) {
        throw new Error('SAFE_POLICY_VERIFICATION_FAILED');
    }

    const actualSha256 = policySha256(backup.policy);

    if (actualSha256 !== EXPECTED_SAFE_POLICY_SHA256) {
        throw new Error('SAFE_POLICY_VERIFICATION_FAILED');
    }

    return {
        version: backup.version,
        sourceCommit: backup.sourceCommit,
        sha256: actualSha256,
        policy: backup.policy,
    };
}

function sameValue(left, right) {
    return canonicalJson(left) === canonicalJson(right);
}

function collectPolicyChanges(
    safeValue,
    currentValue,
    path = '',
) {
    if (isPlainObject(safeValue)) {
        const currentObject = isPlainObject(currentValue)
            ? currentValue
            : {};

        return Object.keys(safeValue)
            .sort()
            .flatMap((key) => {
                const nextPath = path
                    ? `${path}.${key}`
                    : key;

                return collectPolicyChanges(
                    safeValue[key],
                    currentObject[key],
                    nextPath,
                );
            });
    }

    if (sameValue(safeValue, currentValue)) {
        return [];
    }

    return [
        {
            path,
            currentValue:
                currentValue === undefined
                    ? null
                    : currentValue,
            restoreValue: safeValue,
        },
    ];
}

export async function previewPolicyRestore({
    safePolicyPath = DEFAULT_SAFE_POLICY_PATH,
    currentPolicyPath = DEFAULT_TEST_POLICY_PATH,
} = {}) {
    const safe = await loadVerifiedSafePolicy({
        safePolicyPath,
    });

    const current = await readJsonFile(
        currentPolicyPath,
        'TEST_POLICY_MISSING',
        'TEST_POLICY_INVALID_JSON',
    );

    if (
        current?.schema !== 'aleph.test-policy.v1'
        || !isPlainObject(current.policy)
    ) {
        throw new Error('TEST_POLICY_INVALID');
    }

    return {
        schema: 'aleph.policy-restore-preview.v1',
        backupVersion: safe.version,
        sourceCommit: safe.sourceCommit,
        verified: true,
        changes: collectPolicyChanges(
            safe.policy,
            current.policy,
        ),
    };
}

function setPolicyPath(target, path, value) {
    const parts = path.split('.');

    let current = target;

    for (let index = 0; index < parts.length - 1; index += 1) {
        const part = parts[index];

        if (!isPlainObject(current[part])) {
            current[part] = {};
        }

        current = current[part];
    }

    current[parts.at(-1)] = structuredClone(value);
}

async function writeJsonAtomically(filePath, value) {
    const temporaryPath =
        `${filePath}.tmp-${process.pid}`;

    try {
        await writeFile(
            temporaryPath,
            `${JSON.stringify(value, null, 2)}\n`,
            'utf8',
        );

        await rename(
            temporaryPath,
            filePath,
        );
    } catch (error) {
        try {
            await unlink(temporaryPath);
        } catch {
            // 임시 파일이 없으면 별도 처리하지 않습니다.
        }

        throw error;
    }
}

export async function restoreTestPolicy({
    safePolicyPath = DEFAULT_SAFE_POLICY_PATH,
    currentPolicyPath = DEFAULT_TEST_POLICY_PATH,
    confirmedBackupVersion,
} = {}) {
    /*
     * 실제 쓰기 전에 항상 동일한 검증·diff 절차를 다시 수행합니다.
     * 호출자가 제작 1에서 본 백업 버전을 명시적으로 확인해야만
     * 시험 정책 파일을 수정합니다.
     */
    const preview = await previewPolicyRestore({
        safePolicyPath,
        currentPolicyPath,
    });

    if (
        typeof confirmedBackupVersion !== 'string'
        || confirmedBackupVersion !== preview.backupVersion
    ) {
        throw new Error(
            'RESTORE_CONFIRMATION_REQUIRED',
        );
    }

    const current = await readJsonFile(
        currentPolicyPath,
        'TEST_POLICY_MISSING',
        'TEST_POLICY_INVALID_JSON',
    );

    if (
        current?.schema !== 'aleph.test-policy.v1'
        || !isPlainObject(current.policy)
    ) {
        throw new Error('TEST_POLICY_INVALID');
    }

    /*
     * 현재 시험 정책 전체를 안전 사본으로 덮어쓰지 않습니다.
     *
     * preview에서 검증된 변경 경로만 복원하므로:
     * - 다른 서비스의 추가 규칙
     * - 현재 파일의 메타데이터
     * - 별도 감사 기록
     *
     * 을 건드리지 않습니다.
     */
    const restored = structuredClone(current);

    for (const change of preview.changes) {
        setPolicyPath(
            restored.policy,
            change.path,
            change.restoreValue,
        );
    }

    await writeJsonAtomically(
        currentPolicyPath,
        restored,
    );

    /*
     * 실제 쓰기 뒤 다시 사본과 비교합니다.
     * 복원이 제대로 됐다면 안전 정책 범위의 차이는 0개여야 합니다.
     */
    const verification =
        await previewPolicyRestore({
            safePolicyPath,
            currentPolicyPath,
        });

    if (verification.changes.length !== 0) {
        throw new Error(
            'POLICY_RESTORE_VERIFICATION_FAILED',
        );
    }

    return {
        schema: 'aleph.policy-restore-result.v1',
        restoredFrom: preview.backupVersion,
        sourceCommit: preview.sourceCommit,
        appliedChanges: preview.changes,
        verified: true,
    };
}
