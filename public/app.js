const workspace = document.querySelector('#workspace');
const protectedPanel = document.querySelector('#protected-panel');

const operationsPanel =
    document.querySelector('#operations-panel');

const operationsCheckedAt =
    document.querySelector('#operations-checked-at');

const operationsRuleCount =
    document.querySelector('#operations-rule-count');

const operationsRuleList =
    document.querySelector('#operations-rule-list');

const operationsDetectionStatus =
    document.querySelector('#operations-detection-status');

const operationsDetectionDetail =
    document.querySelector('#operations-detection-detail');

const operationsDeviceTotal =
    document.querySelector('#operations-device-total');

const operationsDeviceDetail =
    document.querySelector('#operations-device-detail');

const operationsBackupCount =
    document.querySelector('#operations-backup-count');

const operationsBackupDetail =
    document.querySelector('#operations-backup-detail');

const operationsError =
    document.querySelector('#operations-error');

const verificationRunButton =
    document.querySelector(
        '#verification-run-button',
    );

const verificationResults =
    document.querySelector(
        '#verification-results',
    );

const verificationError =
    document.querySelector(
        '#verification-error',
    );

const loginForm = document.querySelector('#login-form');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const loginButton = document.querySelector('#login-button');
const logoutButton = document.querySelector('#logout-button');
const authStatus = document.querySelector('#auth-status');
const authError = document.querySelector('#auth-error');
const authSuccess = document.querySelector('#auth-success');

const installStatus = document.querySelector('#install-status');
const networkStatus = document.querySelector('#network-status');
const deviceStatus = document.querySelector('#device-status');
const deviceKeyStatus = document.querySelector('#device-key-status');
const protectedAccessStatus =
    document.querySelector('#protected-access-status');
const deviceApproveButton =
    document.querySelector('#device-approve-button');
const deviceError = document.querySelector('#device-error');

const noteFormCard = document.querySelector('#note-form-card');
const noteFormTitle = document.querySelector('#note-form-title');
const noteForm = document.querySelector('#note-form');
const noteTitleInput = document.querySelector('#note-title');
const noteBodyInput = document.querySelector('#note-body');
const noteSubmitButton = document.querySelector('#note-submit-button');
const noteCancelButton = document.querySelector('#note-cancel-button');
const noteError = document.querySelector('#note-error');
const noteSuccess = document.querySelector('#note-success');
const list = document.querySelector('#notes');

const verificationChecks = [
    {
        id: 'stage1-public-root',
        stage: '1',
        kind: '정상',
        request:
            'GET / · 공개 배포 화면',
        expected:
            '200 허용',
        runnable:
            'public_root',
    },
    {
        id: 'stage3-anonymous-notes',
        stage: '3~5',
        kind: '금지',
        request:
            'GET /api/notes · 무인증',
        expected:
            '401 또는 403으로 거부',
        runnable:
            'anonymous_notes',
    },
    {
        id: 'stage4-invalid-token',
        stage: '4~5',
        kind: '금지',
        request:
            'GET /api/notes · 잘못된 Bearer',
        expected:
            '401 또는 403으로 거부',
        runnable:
            'invalid_token',
    },
    {
        id: 'stage5-static-data',
        stage: '2 / 5',
        kind: '금지',
        request:
            'GET /data.json',
        expected:
            '공개 notes 배열이 비어 있음',
        runnable:
            'static_data',
    },
    {
        id: 'stage6-approved-device',
        stage: '6 / 11',
        kind: '정상',
        request:
            'GET /api/notes · 승인 기기 서명',
        expected:
            '200 허용',
        runnable:
            'approved_notes',
    },
    {
        id: 'stage6-unsigned-device',
        stage: '6 / 11',
        kind: '금지',
        request:
            'GET /api/notes · 서명 없음',
        expected:
            '403 거부',
        runnable:
            'unsigned_notes',
    },
    {
        id: 'stage7-risk-step-up',
        stage: '7',
        kind: '금지',
        request:
            '복합 이상 접속 요청',
        expected:
            'step_up',
        runnable:
            null,
    },
    {
        id: 'stage8-own-resource',
        stage: '8',
        kind: '정상',
        request:
            '본인 메모 단건 GET',
        expected:
            '허용',
        runnable:
            null,
    },
    {
        id: 'stage8-other-resource',
        stage: '8',
        kind: '금지',
        request:
            '타인 메모 단건 GET',
        expected:
            '거부',
        runnable:
            null,
    },
    {
        id: 'stage9-burst-detection',
        stage: '9',
        kind: '금지',
        request:
            '10분 안 121회 GET',
        expected:
            'propose_revocation',
        runnable:
            null,
    },
    {
        id: 'stage10-restore',
        stage: '10',
        kind: '정상',
        request:
            'POST /api/restore/:id',
        expected:
            '검증된 지정 사본만 복원',
        runnable:
            null,
    },
    {
        id: 'stage11-signed-request',
        stage: '11',
        kind: '정상',
        request:
            '서명된 보호 자료 GET',
        expected:
            '200 허용',
        runnable:
            'approved_notes',
    },
    {
        id: 'stage11-unsigned-request',
        stage: '11',
        kind: '금지',
        request:
            '서명 없는 보호 자료 GET',
        expected:
            '403 거부',
        runnable:
            'unsigned_notes',
    },
];

const verificationRecords =
    new Map();

function verificationRequestId() {
    return crypto.randomUUID();
}

function verificationCheckedAt() {
    return new Date().toISOString();
}

let editingNoteId = null;
let currentUser = null;

/*
 * 기기 개인키는 이 페이지 실행 중 메모리에만 둡니다.
 * localStorage, sessionStorage, IndexedDB에 저장하지 않습니다.
 */
let currentDeviceKeyPair = null;
let currentDeviceApproved = false;

function updateInstallStatus() {
    const standalone =
        window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    installStatus.textContent = standalone
        ? '설치형 웹앱 화면으로 실행 중입니다.'
        : '브라우저에서 실행 중입니다. 설치 가능 여부는 브라우저가 결정합니다.';
}

function updateNetworkStatus() {
    networkStatus.textContent = navigator.onLine
        ? '온라인 상태입니다.'
        : '오프라인 상태입니다. 보호 자료와 기기 승인 상태는 네트워크 연결 후 확인할 수 있습니다.';
}

function showProtectedPlaceholder(message) {
    list.replaceChildren(
        Object.assign(
            document.createElement('li'),
            {
                textContent: message,
            },
        ),
    );
}

function updateProtectedUI() {
    const available =
        Boolean(currentUser)
        && currentDeviceApproved
        && currentDeviceKeyPair !== null;

    deviceKeyStatus.textContent =
        currentDeviceKeyPair
            ? '현재 기기 키: 있음 (메모리 전용)'
            : '현재 기기 키: 없음';

    protectedAccessStatus.textContent =
        available
            ? '보호 자료: 열림'
            : '보호 자료: 잠김';

    protectedPanel.hidden = !currentUser;
    noteFormCard.hidden = !available;

    if (!available) {
        resetNoteForm();

        if (!currentUser) {
            showProtectedPlaceholder(
                '로그인하면 가상 자료를 확인할 수 있습니다.',
            );
        } else {
            showProtectedPlaceholder(
                '승인된 기기를 서버가 확인하기 전에는 보호 자료를 표시하지 않습니다.',
            );
        }
    }

    return available;
}

function setDeviceStatus({
    message,
    approved = false,
}) {
    currentDeviceApproved =
        approved === true
        && currentDeviceKeyPair !== null;

    deviceStatus.textContent = message;

    deviceApproveButton.hidden =
        !currentUser
        || currentDeviceApproved;

    updateProtectedUI();
}

function clearDeviceError() {
    deviceError.hidden = true;
    deviceError.textContent = '';
}

function showDeviceError(message) {
    deviceError.textContent = message;
    deviceError.hidden = false;
}

function resetDeviceAccess() {
    currentDeviceKeyPair = null;
    currentDeviceApproved = false;

    setDeviceStatus({
        message: currentUser
            ? '기기 승인 상태: 서버 확인 필요'
            : '기기 승인 상태: 로그인 후 서버 확인 필요',
    });
}

updateInstallStatus();
updateNetworkStatus();

window.addEventListener(
    'online',
    updateNetworkStatus,
);

window.addEventListener(
    'offline',
    updateNetworkStatus,
);

function showError(message) {
    authError.textContent = message;
    authError.hidden = false;
    authSuccess.hidden = true;
}

function showSuccess(message) {
    authSuccess.textContent = message;
    authSuccess.hidden = false;
    authError.hidden = true;
}

function clearMessages() {
    authError.hidden = true;
    authSuccess.hidden = true;
    authError.textContent = '';
    authSuccess.textContent = '';
}

function showNoteError(message) {
    noteError.textContent = message;
    noteError.hidden = false;
    noteSuccess.hidden = true;
}

function showNoteSuccess(message) {
    noteSuccess.textContent = message;
    noteSuccess.hidden = false;
    noteError.hidden = true;
}

function clearNoteMessages() {
    noteError.hidden = true;
    noteSuccess.hidden = true;
    noteError.textContent = '';
    noteSuccess.textContent = '';
}

function resetNoteForm() {
    editingNoteId = null;

    noteFormTitle.textContent = '메모 추가';
    noteSubmitButton.textContent = '메모 추가';
    noteCancelButton.hidden = true;

    noteTitleInput.value = '';
    noteBodyInput.value = '';

    clearNoteMessages();
}

function startEditing(note) {
    editingNoteId = note.id;

    noteFormTitle.textContent = '메모 수정';
    noteSubmitButton.textContent = '메모 수정';
    noteCancelButton.hidden = false;

    noteTitleInput.value = note.title;
    noteBodyInput.value = note.body;

    clearNoteMessages();
    noteTitleInput.focus();
}

function updateAuthUI(user) {
    const previousUserId =
        currentUser?.id ?? null;

    currentUser = user;

    workspace.classList.toggle(
        'is-authenticated',
        Boolean(user),
    );

    operationsPanel.hidden = !user;
    protectedPanel.hidden = !user;

    if (user) {
        authStatus.textContent =
            `로그인됨: ${user.email}`;

        loginForm.hidden = true;
        logoutButton.hidden = false;

        /*
         * 다른 사용자로 바뀐 경우 이전 사용자의
         * 메모리 전용 기기 키를 폐기합니다.
         */
        if (
            previousUserId
            && previousUserId !== user.id
        ) {
            currentDeviceKeyPair = null;
            currentDeviceApproved = false;
        }

        deviceApproveButton.hidden = false;

        updateProtectedUI();

        return;
    }

    authStatus.textContent =
        '로그인되지 않았습니다.';

    loginForm.hidden = false;
    logoutButton.hidden = true;

    currentDeviceKeyPair = null;
    currentDeviceApproved = false;

    resetOperationsUI();

    resetNoteForm();
    resetDeviceAccess();
}

function resetOperationsUI() {
    operationsCheckedAt.textContent =
        '서버 결과 확인 전';

    operationsRuleCount.textContent =
        '확인 전';

    operationsRuleList.textContent =
        '서버 응답을 기다리고 있습니다.';

    operationsDetectionStatus.textContent =
        '확인 전';

    operationsDetectionDetail.textContent =
        '실행 여부를 확인하고 있습니다.';

    operationsDeviceTotal.textContent =
        '확인 전';

    operationsDeviceDetail.textContent =
        '서버 기록을 확인하고 있습니다.';

    operationsBackupCount.textContent =
        '확인 전';

    operationsBackupDetail.textContent =
        '서버 기록을 확인하고 있습니다.';

    operationsError.hidden = true;
    operationsError.textContent = '';
}

function showOperationsError(message) {
    operationsError.textContent =
        message;

    operationsError.hidden =
        false;
}

function formatCheckedAt(value) {
    const date =
        new Date(value);

    if (
        typeof value !== 'string'
        || !Number.isFinite(
            date.getTime(),
        )
    ) {
        return '확인 시각 없음';
    }

    return date.toLocaleString(
        'ko-KR',
        {
            dateStyle: 'short',
            timeStyle: 'medium',
        },
    );
}

function renderOperationsSummary(data) {
    operationsCheckedAt.textContent =
        `확인 시각: ${formatCheckedAt(
            data.checkedAt,
        )}`;

    const ruleIds =
        Array.isArray(
            data.decider?.ruleIds,
        )
            ? data.decider.ruleIds
            : [];

    const ruleCount =
        Number.isInteger(
            data.decider?.ruleCount,
        )
            ? data.decider.ruleCount
            : ruleIds.length;

    operationsRuleCount.textContent =
        `${ruleCount}개 규칙`;

    operationsRuleList.textContent =
        ruleIds.length > 0
            ? ruleIds.join(' · ')
            : '확인된 규칙 없음';

    /*
     * 현재 실제 운영 탐지 사건 저장소가 없으므로
     * 절대 "0건"이나 "통과"로 바꾸지 않습니다.
     */
    if (
        data.detection?.status
        === 'not_recorded'
    ) {
        operationsDetectionStatus.textContent =
            '미기록';

        operationsDetectionDetail.textContent =
            data.detection
                ?.revocationIntegration
                === 'proposal_only'
                ? '실제 사건 저장소 없음 · 회수 연동은 제안만 수행'
                : '실제 탐지 사건 저장소가 없습니다.';
    } else {
        operationsDetectionStatus.textContent =
            '서버 응답 확인';

        const incidentCount =
            Number.isInteger(
                data.detection
                    ?.observedIncidentCount,
            )
                ? data.detection
                    .observedIncidentCount
                : null;

        operationsDetectionDetail.textContent =
            incidentCount === null
                ? '실제 사건 수를 확인할 수 없습니다.'
                : `실제 기록 ${incidentCount}건`;
    }

    const devices =
        data.revocation?.devices;

    if (
        data.revocation?.status
        === 'measured'
        && devices
    ) {
        const total =
            Number.isInteger(
                devices.total,
            )
                ? devices.total
                : 0;

        const approved =
            Number.isInteger(
                devices.approved,
            )
                ? devices.approved
                : 0;

        const pending =
            Number.isInteger(
                devices.pending,
            )
                ? devices.pending
                : 0;

        const revoked =
            Number.isInteger(
                devices.revoked,
            )
                ? devices.revoked
                : 0;

        operationsDeviceTotal.textContent =
            `${total}개 기기 기록`;

        operationsDeviceDetail.textContent =
            [
                `승인 ${approved}`,
                `대기 ${pending}`,
                `회수 ${revoked}`,
            ].join(' · ');
    } else {
        operationsDeviceTotal.textContent =
            '미확인';

        operationsDeviceDetail.textContent =
            '실제 기기 상태를 확인하지 못했습니다.';
    }

    const backupCount =
        Number.isInteger(
            data.recovery?.backupCount,
        )
            ? data.recovery.backupCount
            : null;

    const versions =
        Array.isArray(
            data.recovery?.versions,
        )
            ? data.recovery.versions
            : [];

    operationsBackupCount.textContent =
        backupCount === null
            ? '미확인'
            : `${backupCount}개 사본`;

    operationsBackupDetail.textContent =
        versions.length > 0
            ? versions
                .map(item => {
                    const version =
                        typeof item?.version
                            === 'string'
                            ? item.version
                            : 'unknown';

                    const count =
                        Number.isInteger(
                            item?.count,
                        )
                            ? item.count
                            : 0;

                    return `${version} × ${count}`;
                })
                .join(' · ')
            : '확인된 백업 버전 없음';
}

async function loadOperationsSummary() {
    if (!currentUser) {
        operationsPanel.hidden = true;

        resetOperationsUI();

        return false;
    }

    operationsPanel.hidden = false;

    resetOperationsUI();

    try {
        const response =
            await apiFetch(
                '/api/device/status?view=operations',
            );

        const data =
            await parseResponse(
                response,
            );

        if (response.status === 401) {
            updateAuthUI(null);

            throw new Error(
                '로그인이 필요합니다.',
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error
                ?? '작전실 서버 결과를 확인할 수 없습니다.',
            );
        }

        if (
            data.schema
            !== 'aleph.operations.summary.v1'
        ) {
            throw new Error(
                '작전실 응답 형식이 올바르지 않습니다.',
            );
        }

        renderOperationsSummary(
            data,
        );

        return true;
    } catch (error) {
        operationsRuleCount.textContent =
            '확인 실패';

        operationsDetectionStatus.textContent =
            '확인 실패';

        operationsDeviceTotal.textContent =
            '확인 실패';

        operationsBackupCount.textContent =
            '확인 실패';

        showOperationsError(
            error.message,
        );

        return false;
    }
}

async function parseResponse(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

async function checkSession() {
    const response = await fetch(
        '/api/auth/session',
        {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
        },
    );

    const data =
        await parseResponse(response);

    if (
        response.ok
        && data.user
    ) {
        updateAuthUI(data.user);

        return true;
    }

    if (response.status === 401) {
        updateAuthUI(null);

        return false;
    }

    throw new Error(
        data.error
        ?? '로그인 상태를 확인할 수 없습니다.',
    );
}

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (
        value !== null
        && typeof value === 'object'
    ) {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map(key => [
                    key,
                    canonicalize(value[key]),
                ]),
        );
    }

    return value;
}

function canonicalJson(value) {
    return JSON.stringify(
        canonicalize(value),
    );
}

function canonicalRequestBody(body) {
    if (
        body === undefined
        || body === null
    ) {
        return '';
    }

    if (typeof body === 'string') {
        if (body.length === 0) {
            return '';
        }

        try {
            return canonicalJson(
                JSON.parse(body),
            );
        } catch {
            return body;
        }
    }

    return canonicalJson(body);
}

async function sha256Hex(text) {
    const digest =
        await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(
                text,
            ),
        );

    return Array.from(
        new Uint8Array(digest),
        byte =>
            byte
                .toString(16)
                .padStart(2, '0'),
    ).join('');
}

function toBase64Url(buffer) {
    let binary = '';

    for (
        const byte
        of new Uint8Array(buffer)
    ) {
        binary +=
            String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/gu, '-')
        .replace(/\//gu, '_')
        .replace(/=+$/gu, '');
}

function deviceApprovalPayload(
    challenge,
) {
    return [
        'ALEPH_DEVICE_APPROVAL_V1',
        challenge,
    ].join('\n');
}

function deviceRequestPayload({
    method,
    target,
    bodySha256,
    timestamp,
    nonce,
}) {
    return [
        'ALEPH_DEVICE_REQUEST_V1',
        method.toUpperCase(),
        target,
        bodySha256,
        timestamp,
        nonce,
    ].join('\n');
}

async function signWithDeviceKey(
    payload,
) {
    if (!currentDeviceKeyPair) {
        throw new Error(
            '현재 실행 세션에 기기 키가 없습니다.',
        );
    }

    const signature =
        await crypto.subtle.sign(
            {
                name: 'ECDSA',
                hash: 'SHA-256',
            },
            currentDeviceKeyPair.privateKey,
            new TextEncoder().encode(
                payload,
            ),
        );

    return toBase64Url(
        signature,
    );
}

async function checkDeviceStatus() {
    if (!currentUser) {
        resetDeviceAccess();

        return false;
    }

    const response =
        await fetch(
            '/api/device/status',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
            },
        );

    const data =
        await parseResponse(
            response,
        );

    if (response.status === 401) {
        updateAuthUI(null);

        return false;
    }

    if (!response.ok) {
        throw new Error(
            data.error
            ?? '기기 승인 상태를 확인할 수 없습니다.',
        );
    }

    /*
     * DB에 approved 기록이 있어도 현재 페이지 메모리에
     * 해당 개인키가 없다면 보호 요청을 서명할 수 없습니다.
     */
    if (
        data.approved === true
        && currentDeviceKeyPair
    ) {
        setDeviceStatus({
            message:
                '기기 승인 상태: 서버 승인 확인됨',
            approved: true,
        });

        return true;
    }

    if (data.approved === true) {
        setDeviceStatus({
            message:
                '기기 승인 기록은 있지만 현재 실행 세션의 기기 키가 없습니다. 다시 승인 요청해 주세요.',
        });

        return false;
    }

    if (data.status === 'pending') {
        setDeviceStatus({
            message:
                '기기 승인 상태: 승인 절차가 완료되지 않았습니다.',
        });

        return false;
    }

    if (data.status === 'revoked') {
        setDeviceStatus({
            message:
                '기기 승인 상태: 회수된 기기입니다.',
        });

        return false;
    }

    setDeviceStatus({
        message:
            '기기 승인 상태: 미등록',
    });

    return false;
}

async function requestDeviceApproval() {
    clearDeviceError();

    deviceApproveButton.disabled =
        true;

    try {
        if (!currentUser) {
            throw new Error(
                '먼저 로그인해 주세요.',
            );
        }

        /*
         * 새 P-256 키를 생성합니다.
         * 개인키는 currentDeviceKeyPair 메모리에만 존재합니다.
         */
        const keyPair =
            await crypto.subtle.generateKey(
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256',
                },
                true,
                [
                    'sign',
                    'verify',
                ],
            );

        currentDeviceKeyPair =
            keyPair;

        currentDeviceApproved =
            false;

        const publicKey =
            await crypto.subtle.exportKey(
                'jwk',
                keyPair.publicKey,
            );

        const requestResponse =
            await fetch(
                '/api/device/request',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        publicKey,
                    }),
                },
            );

        const requestData =
            await parseResponse(
                requestResponse,
            );

        if (
            !requestResponse.ok
            || requestData.status
            !== 'pending'
            || typeof requestData.challenge
            !== 'string'
        ) {
            throw new Error(
                requestData.error
                ?? '기기 승인 요청에 실패했습니다.',
            );
        }

        /*
         * 승인 버튼만으로 승인하지 않습니다.
         * 서버 challenge에 대한 개인키 소유 증명을 생성합니다.
         */
        const challengeSignature =
            await signWithDeviceKey(
                deviceApprovalPayload(
                    requestData.challenge,
                ),
            );

        const approveResponse =
            await fetch(
                '/api/device/approve',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        signature:
                            challengeSignature,
                    }),
                },
            );

        const approveData =
            await parseResponse(
                approveResponse,
            );

        if (
            !approveResponse.ok
            || approveData.approved
            !== true
        ) {
            throw new Error(
                approveData.error
                ?? '기기 승인에 실패했습니다.',
            );
        }

        /*
         * approve 응답만 믿지 않고 별도 상태 API로
         * 서버 등록 결과를 다시 확인합니다.
         */
        const approved =
            await checkDeviceStatus();

        if (!approved) {
            throw new Error(
                '서버에서 승인된 기기로 확인되지 않았습니다.',
            );
        }

        await loadNotes();
    } catch (error) {
        currentDeviceApproved =
            false;

        updateProtectedUI();

        showDeviceError(
            error.message,
        );
    } finally {
        deviceApproveButton.disabled =
            false;
    }
}

async function signedApiFetch(
    url,
    options = {},
) {
    if (
        !currentDeviceApproved
        || !currentDeviceKeyPair
    ) {
        throw new Error(
            '승인된 기기에서만 보호 자료를 요청할 수 있습니다.',
        );
    }

    const targetUrl =
        new URL(
            url,
            window.location.origin,
        );

    if (
        targetUrl.origin
        !== window.location.origin
    ) {
        throw new Error(
            '보호 요청은 같은 출처에만 보낼 수 있습니다.',
        );
    }

    const method =
        String(
            options.method
            ?? 'GET',
        ).toUpperCase();

    const target =
        `${targetUrl.pathname}${targetUrl.search}`;

    const bodyText =
        canonicalRequestBody(
            options.body,
        );

    const bodySha256 =
        await sha256Hex(
            bodyText,
        );

    const timestamp =
        new Date().toISOString();

    const nonce =
        crypto.randomUUID();

    const payload =
        deviceRequestPayload({
            method,
            target,
            bodySha256,
            timestamp,
            nonce,
        });

    const signature =
        await signWithDeviceKey(
            payload,
        );

    const headers =
        new Headers(
            options.headers
            ?? {},
        );

    headers.set(
        'X-Aleph-Device-Timestamp',
        timestamp,
    );

    headers.set(
        'X-Aleph-Device-Nonce',
        nonce,
    );

    headers.set(
        'X-Aleph-Device-Signature',
        signature,
    );

    const requestOptions = {
        ...options,
        method,
        headers,
    };

    if (
        options.body !== undefined
    ) {
        /*
         * 서명한 canonical body 그대로 전송하여
         * 서버가 동일한 SHA-256을 계산할 수 있게 합니다.
         */
        requestOptions.body =
            bodyText;
    }

    const response =
        await apiFetch(
            target,
            requestOptions,
        );

    if (
        response.status === 403
        || response.status === 409
    ) {
        const data =
            await response
                .clone()
                .json()
                .catch(
                    () => null,
                );

        if (
            data?.error
            === 'DEVICE_NOT_APPROVED'
        ) {
            currentDeviceApproved =
                false;

            setDeviceStatus({
                message:
                    '기기 승인 상태: 서버에서 승인되지 않음',
            });
        }
    }

    return response;
}

async function apiFetch(
    url,
    options = {},
    retry = true,
) {
    const response =
        await fetch(
            url,
            {
                ...options,
                credentials: 'same-origin',
                cache: 'no-store',
            },
        );

    if (
        response.status !== 401
        || !retry
    ) {
        return response;
    }

    const refreshed =
        await fetch(
            '/api/auth/session',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
            },
        );

    if (!refreshed.ok) {
        const data =
            await parseResponse(
                refreshed,
            );

        if (
            refreshed.status === 401
        ) {
            updateAuthUI(null);

            throw new Error(
                '로그인이 만료되었습니다. 다시 로그인해 주세요.',
            );
        }

        throw new Error(
            data.error
            ?? '로그인 상태를 갱신할 수 없습니다.',
        );
    }

    const session =
        await parseResponse(
            refreshed,
        );

    if (!session.user) {
        updateAuthUI(null);

        throw new Error(
            '로그인이 만료되었습니다. 다시 로그인해 주세요.',
        );
    }

    updateAuthUI(
        session.user,
    );

    return apiFetch(
        url,
        options,
        false,
    );
}

async function loadNotes() {
    if (
        !currentUser
        || !currentDeviceApproved
        || !currentDeviceKeyPair
    ) {
        showProtectedPlaceholder(
            currentUser
                ? '승인된 기기에서만 보호 자료를 확인할 수 있습니다.'
                : '로그인하면 가상 자료를 확인할 수 있습니다.',
        );

        return;
    }

    try {
        const response =
            await signedApiFetch(
                '/api/notes',
            );

        const data =
            await parseResponse(
                response,
            );

        if (
            response.status === 401
        ) {
            updateAuthUI(null);

            throw new Error(
                '로그인이 필요합니다.',
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error
                ?? '로그인 자료를 읽을 수 없습니다.',
            );
        }

        if (
            !Array.isArray(
                data.notes,
            )
        ) {
            throw new Error(
                '자료 형식이 맞지 않습니다.',
            );
        }

        list.replaceChildren(
            ...data.notes.map(
                note => {
                    const item =
                        document.createElement(
                            'li',
                        );

                    const title =
                        document.createElement(
                            'strong',
                        );

                    title.textContent =
                        note.title;

                    const content =
                        document.createElement(
                            'span',
                        );

                    content.textContent =
                        note.body
                        ?? note.content;

                    const actions =
                        document.createElement(
                            'div',
                        );

                    actions.className =
                        'note-actions';

                    const editButton =
                        document.createElement(
                            'button',
                        );

                    editButton.type =
                        'button';

                    editButton.textContent =
                        '수정';

                    editButton.addEventListener(
                        'click',
                        () => {
                            startEditing(
                                note,
                            );
                        },
                    );

                    const deleteButton =
                        document.createElement(
                            'button',
                        );

                    deleteButton.type =
                        'button';

                    deleteButton.className =
                        'delete-button';

                    deleteButton.textContent =
                        '삭제';

                    deleteButton.addEventListener(
                        'click',
                        async () => {
                            if (
                                window.confirm(
                                    '이 메모를 삭제하시겠습니까?',
                                )
                            ) {
                                await deleteNote(
                                    note.id,
                                );
                            }
                        },
                    );

                    actions.append(
                        editButton,
                        deleteButton,
                    );

                    item.append(
                        title,
                        content,
                        actions,
                    );

                    return item;
                },
            ),
        );
    } catch (error) {
        showProtectedPlaceholder(
            error.message,
        );
    }
}

async function createNote(
    title,
    body,
) {
    const response =
        await signedApiFetch(
            '/api/notes',
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json',
                },
                body: JSON.stringify({
                    title,
                    body,
                }),
            },
        );

    const data =
        await parseResponse(
            response,
        );

    if (!response.ok) {
        throw new Error(
            data.error
            ?? '메모 생성에 실패했습니다.',
        );
    }

    return data;
}

async function updateNote(
    id,
    title,
    body,
) {
    const response =
        await signedApiFetch(
            `/api/notes/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type':
                        'application/json',
                },
                body: JSON.stringify({
                    title,
                    body,
                }),
            },
        );

    const data =
        await parseResponse(
            response,
        );

    if (!response.ok) {
        throw new Error(
            data.error
            ?? '메모 수정에 실패했습니다.',
        );
    }

    return data;
}

async function deleteNote(id) {
    try {
        const response =
            await signedApiFetch(
                `/api/notes/${encodeURIComponent(id)}`,
                {
                    method: 'DELETE',
                },
            );

        if (!response.ok) {
            const data =
                await parseResponse(
                    response,
                );

            throw new Error(
                data.error
                ?? '메모 삭제에 실패했습니다.',
            );
        }

        resetNoteForm();

        showNoteSuccess(
            '메모가 삭제되었습니다.',
        );

        await loadNotes();
    } catch (error) {
        showNoteError(
            error.message,
        );
    }
}

deviceApproveButton.addEventListener(
    'click',
    async () => {
        await requestDeviceApproval();
    },
);

loginForm.addEventListener(
    'submit',
    async event => {
        event.preventDefault();

        clearMessages();

        loginButton.disabled =
            true;

        try {
            const response =
                await fetch(
                    '/api/auth/login',
                    {
                        method: 'POST',
                        credentials:
                            'same-origin',
                        cache: 'no-store',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            email:
                                emailInput.value.trim(),
                            password:
                                passwordInput.value,
                        }),
                    },
                );

            const data =
                await parseResponse(
                    response,
                );

            if (
                !response.ok
                || !data.user
            ) {
                throw new Error(
                    response.status === 401
                        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
                        : (
                            data.error
                            ?? '로그인에 실패했습니다.'
                        ),
                );
            }

            updateAuthUI(
                data.user,
            );

            passwordInput.value =
                '';

            showSuccess(
                '로그인되었습니다.',
            );

            await loadOperationsSummary();
            await checkDeviceStatus();
        } catch (error) {
            showError(
                error.message,
            );
        } finally {
            loginButton.disabled =
                false;
        }
    },
);

logoutButton.addEventListener(
    'click',
    async () => {
        clearMessages();

        logoutButton.disabled =
            true;

        try {
            const response =
                await fetch(
                    '/api/auth/logout',
                    {
                        method: 'POST',
                        credentials:
                            'same-origin',
                        cache: 'no-store',
                    },
                );

            const data =
                await parseResponse(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    data.error
                    ?? '로그아웃에 실패했습니다.',
                );
            }

            updateAuthUI(
                null,
            );

            showSuccess(
                '로그아웃되었습니다.',
            );

            await loadNotes();
        } catch (error) {
            showError(
                error.message,
            );
        } finally {
            logoutButton.disabled =
                false;
        }
    },
);

noteForm.addEventListener(
    'submit',
    async event => {
        event.preventDefault();

        clearNoteMessages();

        noteSubmitButton.disabled =
            true;

        noteCancelButton.disabled =
            true;

        const title =
            noteTitleInput.value.trim();

        const body =
            noteBodyInput.value.trim();

        try {
            let successMessage;

            if (editingNoteId) {
                await updateNote(
                    editingNoteId,
                    title,
                    body,
                );

                successMessage =
                    '메모가 수정되었습니다.';
            } else {
                await createNote(
                    title,
                    body,
                );

                successMessage =
                    '메모가 추가되었습니다.';
            }

            resetNoteForm();

            showNoteSuccess(
                successMessage,
            );

            await loadNotes();
        } catch (error) {
            showNoteError(
                error.message,
            );
        } finally {
            noteSubmitButton.disabled =
                false;

            noteCancelButton.disabled =
                false;
        }
    },
);

noteCancelButton.addEventListener(
    'click',
    () => {
        resetNoteForm();
    },
);

try {
    const loggedIn =
        await checkSession();

    if (loggedIn) {
        await loadOperationsSummary();
        await checkDeviceStatus();
    }
} catch (error) {
    updateAuthUI(null);

    showError(
        error.message,
    );
}

await loadNotes();

function formatVerificationTime(value) {
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

function renderVerificationTable() {
    const rows =
        verificationChecks.map(
            check => {
                const record =
                    verificationRecords.get(
                        check.id,
                    );

                const row =
                    document.createElement(
                        'tr',
                    );

                const stage =
                    document.createElement(
                        'td',
                    );

                stage.textContent =
                    check.stage;

                const kind =
                    document.createElement(
                        'td',
                    );

                kind.textContent =
                    check.kind;

                const request =
                    document.createElement(
                        'td',
                    );

                request.textContent =
                    check.request;

                const expected =
                    document.createElement(
                        'td',
                    );

                expected.textContent =
                    check.expected;

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

                if (!record) {
                    status.classList.add(
                        'is-not-run',
                    );

                    status.textContent =
                        '미실행';
                } else {
                    status.classList.add(
                        record.ok
                            ? 'is-ok'
                            : 'is-denied',
                    );

                    status.textContent =
                        record.actual;
                }

                actual.append(status);

                const requestId =
                    document.createElement(
                        'td',
                    );

                requestId.textContent =
                    record?.requestId
                    ?? '미실행';

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

async function runPublicRootCheck() {
    const requestId =
        verificationRequestId();

    const checkedAt =
        verificationCheckedAt();

    const response =
        await fetch(
            '/',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
            },
        );

    const allowed =
        response.status === 200;

    await response.body?.cancel();

    return {
        requestId,
        checkedAt,
        ok: allowed,
        actual: allowed
            ? 'HTTP 200 · 공개 배포 화면 응답 확인'
            : `HTTP ${response.status} · 기대한 배포 응답이 아님`,
    };
}

async function runAnonymousNotesCheck() {
    const requestId =
        verificationRequestId();

    const checkedAt =
        verificationCheckedAt();

    const response =
        await fetch(
            '/api/notes',
            {
                method: 'GET',
                credentials: 'omit',
                cache: 'no-store',
                redirect: 'manual',
            },
        );

    if (
        response.type === 'opaqueredirect'
        || response.status === 0
    ) {
        return null;
    }


    const rejected =
        response.status === 401
        || response.status === 403;

    return {
        requestId,
        checkedAt,
        ok: rejected,
        actual: rejected
            ? `HTTP ${response.status} · 무인증 요청 거부 확인`
            : `HTTP ${response.status} · 기대한 인증 거부가 아님`,
    };
}

async function runInvalidTokenCheck() {
    const requestId =
        verificationRequestId();

    const checkedAt =
        verificationCheckedAt();

    const response =
        await fetch(
            '/api/notes',
            {
                method: 'GET',
                credentials: 'omit',
                cache: 'no-store',
                redirect: 'manual',
                headers: {
                    Authorization:
                        'Bearer invalid-stage12-check',
                },
            },
        );

    if (
        response.type === 'opaqueredirect'
        || response.status === 0
    ) {
        return null;
    }

    const rejected =
        response.status === 401
        || response.status === 403;

    return {
        requestId,
        checkedAt,
        ok: rejected,
        actual: rejected
            ? `HTTP ${response.status} · 잘못된 토큰 거부 확인`
            : `HTTP ${response.status} · 기대한 인증 거부가 아님`,
    };
}

async function runStaticDataCheck() {
    const requestId =
        verificationRequestId();

    const checkedAt =
        verificationCheckedAt();

    const response =
        await fetch(
            '/data.json',
            {
                method: 'GET',
                cache: 'no-store',
            },
        );

    let empty = false;

    if (response.ok) {
        try {
            const data =
                await response.json();

            empty =
                Array.isArray(data.notes)
                && data.notes.length === 0;
        } catch {
            empty = false;
        }
    }

    const matched =
        response.ok
        && empty;

    return {
        requestId,
        checkedAt,
        ok: matched,
        actual: matched
            ? 'HTTP 200 · 공개 notes 배열 비어 있음'
            : `HTTP ${response.status} · 공개 자료 상태가 기대와 다름`,
    };
}

async function runApprovedNotesCheck() {
    /*
     * 현재 실행 세션에 서버 승인 기기와
     * 대응하는 메모리 전용 개인키가 있을 때만 실행합니다.
     *
     * 조건이 없으면 실패로 기록하지 않고
     * 그대로 "미실행" 상태를 유지합니다.
     */
    if (
        !currentUser
        || !currentDeviceApproved
        || !currentDeviceKeyPair
    ) {
        return null;
    }

    const requestId =
        verificationRequestId();

    const checkedAt =
        verificationCheckedAt();

    const response =
        await signedApiFetch(
            '/api/notes',
        );

    const allowed =
        response.status === 200;

    return {
        requestId,
        checkedAt,
        ok: allowed,
        actual: allowed
            ? 'HTTP 200 · 승인 기기 서명 요청 허용 확인'
            : `HTTP ${response.status} · 기대한 정상 허용이 아님`,
    };
}

async function runUnsignedNotesCheck() {
    /*
     * 로그인 cookie와 기기 cookie는 그대로 사용하지만
     * X-Aleph-Device-* 서명 헤더를 붙이지 않습니다.
     */
    if (!currentUser) {
        return null;
    }

    const requestId =
        verificationRequestId();

    const checkedAt =
        verificationCheckedAt();

    const response =
        await fetch(
            '/api/notes',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
            },
        );

    const rejected =
        response.status === 403;

    return {
        requestId,
        checkedAt,
        ok: rejected,
        actual: rejected
            ? 'HTTP 403 · 서명 없는 보호 요청 거부 확인'
            : `HTTP ${response.status} · 기대한 기기 서명 거부가 아님`,
    };
}

async function runVerificationChecks() {
    verificationError.hidden =
        true;

    verificationError.textContent =
        '';

    verificationRunButton.disabled =
        true;

    try {
        for (
            const check
            of verificationChecks
        ) {
            let record = null;

            if (
                check.runnable
                === 'public_root'
            ) {
                record =
                    await runPublicRootCheck();
            } else if (
                check.runnable
                === 'anonymous_notes'
            ) {
                record =
                    await runAnonymousNotesCheck();
            } else if (
                check.runnable
                === 'invalid_token'
            ) {
                record =
                    await runInvalidTokenCheck();
            } else if (
                check.runnable
                === 'static_data'
            ) {
                record =
                    await runStaticDataCheck();
            } else if (
                check.runnable
                === 'approved_notes'
            ) {
                record =
                    await runApprovedNotesCheck();
            } else if (
                check.runnable
                === 'unsigned_notes'
            ) {
                record =
                    await runUnsignedNotesCheck();
            }

            /*
             * runnable이 null이거나 현재 실행 조건이
             * 충족되지 않은 시험은 결과를 생성하지 않습니다.
             *
             * 따라서 기존 "미실행" 상태가 유지됩니다.
             */
            if (record) {
                verificationRecords.set(
                    check.id,
                    record,
                );
            }
        }

        renderVerificationTable();
    } catch (error) {
        verificationError.textContent =
            error instanceof Error
                ? error.message
                : '실측 요청 실행 중 오류가 발생했습니다.';

        verificationError.hidden =
            false;
    } finally {
        verificationRunButton.disabled =
            false;
    }
}

verificationRunButton.addEventListener(
    'click',
    async () => {
        await runVerificationChecks();
    },
);

renderVerificationTable();
