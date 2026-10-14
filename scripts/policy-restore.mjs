import {
    previewPolicyRestore,
    restoreTestPolicy,
} from '../src/policy-recovery.mjs';

const args = process.argv.slice(2);

const applyIndex =
    args.indexOf('--apply');

try {
    /*
     * 복구 실행 여부와 관계없이
     * 항상 먼저 변경 예정 범위를 보여 줍니다.
     */
    const preview =
        await previewPolicyRestore();

    process.stdout.write(
        '정책 복원 전 확인:\n',
    );

    process.stdout.write(
        `${JSON.stringify(preview, null, 2)}\n`,
    );

    if (applyIndex === -1) {
        process.stdout.write(
            '\n미리보기만 수행했습니다. 시험 정책은 변경하지 않았습니다.\n',
        );

        process.stdout.write(
            `복원하려면 확인한 버전을 명시하세요: --apply ${preview.backupVersion}\n`,
        );
    } else {
        const confirmedBackupVersion =
            args[applyIndex + 1];

        const result =
            await restoreTestPolicy({
                confirmedBackupVersion,
            });

        process.stdout.write(
            '\n시험 정책 복원 결과:\n',
        );

        process.stdout.write(
            `${JSON.stringify(result, null, 2)}\n`,
        );
    }
} catch (error) {
    process.stderr.write(
        `시험 정책 복원 중단: ${error.message}\n`,
    );

    process.exitCode = 1;
}