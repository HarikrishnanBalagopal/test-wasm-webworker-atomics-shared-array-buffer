import { WASI, Fd, File, PreopenDirectory, Directory } from "@bjorn3/browser_wasi_shim";

// TYPES ---------------------------------------------------------------

// enumeration
const MSG_TYPE = {
    'INITIALIZE_WORKER': 'INITIALIZE_WORKER',
    'WORKER_INITIALIZED': 'WORKER_INITIALIZED',
    'RUN_WASM': 'RUN_WASM',
    'ASK_QUESTION': 'ASK_QUESTION',
    'PRINT': 'PRINT',
};

class XtermStdio extends Fd {
    constructor() {
        super();
    }
    fd_write(view8/*: Uint8Array*/, iovs/*: [wasi.Iovec]*/)/*: {ret: number, nwritten: number}*/ {
        let nwritten = 0;
        // const decoder = new TextDecoder();
        for (let iovec of iovs) {
            // console.log(iovec.buf, iovec.buf_len, view8.slice(iovec.buf, iovec.buf + iovec.buf_len));
            const buffer = view8.slice(iovec.buf, iovec.buf + iovec.buf_len);
            // const msg = decoder.decode(buffer);
            // console.log('worker: XtermStdio.fd_write msg:', msg);
            self.postMessage({ 'type': MSG_TYPE.PRINT, 'payload': buffer });
            nwritten += iovec.buf_len;
        }
        return { ret: 0, nwritten };
    }
}

// CONSTANTS ---------------------------------------------------------------

const WASM_URL = '/main.wasm';
const WASI_MODULE_NAME = 'wasi_snapshot_preview1';
const M2K_MODULE_NAME = 'mym2kmodule';

let SHARED_ARR = null;
let SHARED_ARR_U8 = null;
let SHARED_ARR_I32 = null;
let MY_DEBUG_FDS = null;
let WASM_INSTANCE = null;
let WASM_INSTANCE_WASI = null;

// FUNCTIONS ---------------------------------------------------------------

// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const toMsg = (uint8, int32, obj) => {
    const s = JSON.stringify(obj);
    const enc = new TextEncoder();
    const x = enc.encode(s);
    if (x.byteLength + 8 > uint8.byteLength) {
        throw new Error('object length is larger than buffer length');
    }
    int32[1] = x.byteLength;
    uint8.set(x, 8);
};

const fromMsg = (uint8, int32) => {
    const len = int32[1];
    if (len <= 0) throw new Error('object length is zero or negative');
    const x = uint8.slice(8, 8 + len);
    const dec = new TextDecoder();
    const s = dec.decode(x);
    return JSON.parse(s);
};

const newProblem = (
    id = '', type = '', description = '',
    hints = [], options = [], _default = undefined,
    categories = [], answer = undefined,
) => ({
    id, type, description, hints,
    options, categories, answer,
    'default': _default,
});

const getMyWasi = () => {
    const encoder = new TextEncoder();
    const preOpenDir = {
        "example.c": new File(encoder.encode(`#include "a"`)),
        // "hello.rs": new File(encoder.encode(`fn main() { println!("Hello World!"); }`)),
        // "dep.json": new File(encoder.encode(`{"a": 42, "b": 12}`)),
        // [srcFilename]: new File(srcContents),
    };

    const args = ['bin'];
    const env = [];
    const fds = [
        new XtermStdio(), // stdin
        new XtermStdio(), // stdout
        new XtermStdio(), // stderr
        new PreopenDirectory("/", preOpenDir),
    ];
    MY_DEBUG_FDS = fds;

    const wasi = new WASI(args, env, fds, { debug: false });
    return wasi;
};

const m2kHandleAskQuestion = () => {
    // console.log('sleeping');
    // await sleep(1000);
    // console.log('sleep over');
    // console.log('SHARED_ARR', SHARED_ARR);
    // console.log('SHARED_ARR[0]', SHARED_ARR[0]);
    // const resultBefore = Atomics.load(SHARED_ARR_I32, 0);
    // console.log('resultBefore:', resultBefore);
    console.log('host function m2kHandleAskQuestion called');
    const obj = newProblem(
        'move2kube.service.bar.port',
        'input',
        'enter a port to use for the service "bar"',
        [],
        [],
        '8080',
        [],
    );
    console.log('obj', obj);
    // toMsg(SHARED_ARR_U8, SHARED_ARR_I32, obj);
    self.postMessage({
        'type': MSG_TYPE.ASK_QUESTION,
        'payload': obj,
    });
    console.log('waiting to be notified');
    const waitValue = Atomics.wait(SHARED_ARR_I32, 0, 0);
    console.log('waitValue', waitValue);

    // const result = Atomics.load(SHARED_ARR_I32, 0);
    // console.log('result', result);

    const answerObj = fromMsg(SHARED_ARR_U8, SHARED_ARR_I32);
    console.log('answerObj', answerObj);
    // handle port answer
    const port = parseInt(answerObj.answer, 10);
    console.log('port', port);
    return port;
};

const wasmSetup = async () => {
    const res = await fetch(WASM_URL);
    if (!res.ok) throw new Error('failed to fetch the wasm binary');
    const buf = await res.arrayBuffer();
    const mod = await WebAssembly.compile(buf);
    const wasi = getMyWasi();
    const importObject = {
        [WASI_MODULE_NAME]: wasi.wasiImport,
        [M2K_MODULE_NAME]: {
            'ask_question': m2kHandleAskQuestion,
        },
    };
    const instance = await WebAssembly.instantiate(mod, importObject);
    console.log('instance', instance);
    WASM_INSTANCE = instance;
    WASM_INSTANCE_WASI = wasi;
    return instance;
};

// const processMessage = async (e) => {
const processMessage = async (e) => {
    // console.log('processMessage', e);
    const msg = e.data;
    console.log('processMessage', msg);
    switch (msg.type) {
        case MSG_TYPE.INITIALIZE_WORKER: {
            console.log('got MSG_TYPE.INITIALIZE_WORKER');
            console.log('msg.payload', msg.payload);
            const { sharedBuffer } = msg.payload;
            SHARED_ARR = sharedBuffer;
            SHARED_ARR_U8 = new Uint8Array(sharedBuffer);
            SHARED_ARR_I32 = new Int32Array(sharedBuffer);
            await wasmSetup();
            self.postMessage({
                'type': MSG_TYPE.WORKER_INITIALIZED,
            });
            break;
        }
        case MSG_TYPE.RUN_WASM: {
            console.log('got MSG_TYPE.RUN_WASM');
            setTimeout(() => {
                console.log('this should run last');
            }, 1);
            WASM_INSTANCE_WASI.start(WASM_INSTANCE);
            break;
        }
        default: {
            throw new Error(`unknown message type ${msg.type}`);
        }
    }
};

const main = async () => {
    const prev = console.log;
    console.log = (...args) => prev('[worker]', ...args);
    console.log('main start');
    // console.log('self', self);
    self.addEventListener('message', processMessage);
    console.log('main end');
};

main().catch(console.error);
