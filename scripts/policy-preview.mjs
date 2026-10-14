import {
    previewPolicyRestore,
} from '../src/policy-recovery.mjs';

try {
    const preview = await previewPolicyRestore();

    process.stdout.write(
        `${JSON.stringify(preview, null, 2)}\n`,
    );
} catch (error) {
    process.stderr.write(
        `정책 복원 미리보기 중단: ${error.message}\n`,
    );

    process.exitCode = 1;
}