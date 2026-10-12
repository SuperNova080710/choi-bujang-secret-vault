import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const fixturePath = path.resolve(
    currentDirectory,
    '../fixtures/brute-force.json',
);

/**
 * 원본 경보에서 필요한 필드만 추출합니다.
 * 원본 데이터는 수정하지 않습니다.
 *
 * @returns {{
 *   timestamp: string | null,
 *   sourceIp: string | null,
 *   account: string | null,
 *   ruleLevel: number | null,
 *   description: string | null
 * }[]}
 */
export function readAlerts() {
    const fixture = JSON.parse(
        readFileSync(fixturePath, 'utf8'),
    );

    if (
        fixture.schema !== 'aleph.xdr.fixture.v1' ||
        fixture.moduleKey !== 'brute-force' ||
        !Array.isArray(fixture.alerts)
    ) {
        throw new Error('무차별 로그인 경보 파일 형식이 올바르지 않습니다.');
    }

    const extracted = fixture.alerts.map((alert) => ({
        timestamp: alert.timestamp ?? null,
        sourceIp: alert.data?.srcip ?? null,
        account: alert.data?.accounts ?? alert.data?.srcuser ?? null,
        ruleLevel: alert.rule?.level ?? null,
        description: alert.rule?.description ?? null,
    }));

    if (extracted.length !== fixture.alerts.length) {
        throw new Error('원본 경보와 추출 결과의 건수가 일치하지 않습니다.');
    }

    return extracted;
}

// 직접 실행할 때만 추출 결과를 출력합니다.
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    try {
        const extracted = readAlerts();

        for (const alert of extracted) {
            console.log(JSON.stringify(alert));
        }

        console.error(`추출 완료: ${extracted.length}건`);
    } catch {
        // 파일 내용이나 민감할 수 있는 값을 오류 메시지에 노출하지 않습니다.
        console.error('경보 읽기에 실패했습니다. 파일 형식과 경로를 확인하세요.');
        process.exitCode = 1;
    }
}
