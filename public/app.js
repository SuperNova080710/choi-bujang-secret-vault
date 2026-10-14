const workspace = document.querySelector('#workspace');
const protectedPanel = document.querySelector('#protected-panel');

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

    resetNoteForm();
    resetDeviceAccess();
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
        await checkDeviceStatus();
    }
} catch (error) {
    updateAuthUI(null);

    showError(
        error.message,
    );
}

await loadNotes();