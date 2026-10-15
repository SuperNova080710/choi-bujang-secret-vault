import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const fixturePath = path.resolve(
    currentDirectory,
    '../fixtures/persistence.json',
);

/**
 * 원본 Wazuh 모양 경보에서 과제에서 요구한 필드만 추출합니다.
 * path, count 등 과제에서 요구하지 않은 원본 데이터는 출력하지 않습니다.
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
        fixture.moduleKey !== 'persistence' ||
        !Array.isArray(fixture.alerts)
    ) {
        throw new Error('지속성 경보 파일 형식이 올바르지 않습니다.');
    }

    const extracted = fixture.alerts.map((alert) => ({
        timestamp: alert.timestamp ?? null,
        sourceIp: alert.data?.srcip ?? null,
        account: alert.data?.srcuser ?? null,
        ruleLevel: alert.rule?.level ?? null,
        description: alert.rule?.description ?? null,
    }));

    if (extracted.length !== fixture.alerts.length) {
        throw new Error('원본 경보와 추출 결과의 건수가 일치하지 않습니다.');
    }

    return extracted;
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    try {
        const extracted = readAlerts();

        for (const alert of extracted) {
            console.log(JSON.stringify(alert));
        }

        console.error(`추출 완료: ${extracted.length}건`);
    } catch {
        console.error('경보 읽기에 실패했습니다. 파일 형식과 경로를 확인하세요.');
        process.exitCode = 1;
    }
}
